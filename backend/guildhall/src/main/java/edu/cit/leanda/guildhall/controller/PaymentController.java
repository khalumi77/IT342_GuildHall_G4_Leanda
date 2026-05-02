package edu.cit.leanda.guildhall.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.cit.leanda.guildhall.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.entity.Payment;
import edu.cit.leanda.guildhall.entity.Quest;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.enums.PaymentStatus;
import edu.cit.leanda.guildhall.enums.QuestStatus;
import edu.cit.leanda.guildhall.repository.PaymentRepository;
import edu.cit.leanda.guildhall.repository.QuestRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * PaymentController — PayMongo integration (Philippines payment gateway).
 *
 * Flow:
 *  1. POST /api/payments/create-session/{questId}
 *     → Creates a PayMongo Checkout Session
 *     → Returns { checkoutUrl } for frontend to redirect to
 *
 *  2. GET  /api/payments/verify/{paymongoSessionId}
 *     → Retrieves the session from PayMongo API
 *     → If payment_status == "paid", publishes the quest (OPEN)
 *     → Updates Payment record in DB
 *
 *  3. POST /api/payments/webhook
 *     → PayMongo sends events here
 *     → Handles checkout.session.completed as reliable fallback
 *
 *  Test cards (sandbox):
 *    Visa success:  4343 4343 4343 4345  exp: any future  cvn: any 3 digits
 *    Visa fail:     4111 1111 1111 1111  (will be declined)
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private static final String PAYMONGO_API = "https://api.paymongo.com/v1";

    private final QuestRepository questRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ApiResponseWrapper responseWrapper;

    @Value("${paymongo.secret.key}")
    private String secretKey;

    @Value("${paymongo.webhook.secret}")
    private String webhookSecret;

    @Value("${frontend.url}")
    private String frontendUrl;

    // ── POST /api/payments/create-session/{questId} ───────────────────────────

    @PostMapping("/create-session/{questId}")
    public ResponseEntity<?> createCheckoutSession(
            @PathVariable Long questId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User payer = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Quest quest = questRepository.findById(questId)
                .orElseThrow(() -> new IllegalArgumentException("Quest not found"));

        if (!quest.getPoster().getId().equals(payer.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(responseWrapper.error("Only the quest poster can initiate payment"));
        }

        if (quest.getStatus() == QuestStatus.OPEN) {
            return ResponseEntity.ok(responseWrapper.ok(Map.of(
                    "message", "Quest is already published",
                    "questId", questId
            )));
        }

        if (quest.getStatus() != QuestStatus.PENDING_PAYMENT) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("Quest is not awaiting payment"));
        }

        if (quest.getReward() == null || quest.getReward().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("Quest has no valid reward amount"));
        }

        // PayMongo amounts are in centavos (smallest unit), minimum ₱100
        long amountInCentavos = quest.getReward()
                .multiply(BigDecimal.valueOf(100))
                .longValue();

        if (amountInCentavos < 10000) { // ₱100 minimum
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("Minimum quest reward is ₱100 for paid quests"));
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = buildHeaders();

            // Build PayMongo Checkout Session payload
            // https://developers.paymongo.com/reference/create-a-checkout
            Map<String, Object> attributes = new LinkedHashMap<>();
            attributes.put("billing", Map.of(
                    "name", payer.getUsername(),
                    "email", payer.getEmail()
            ));
            attributes.put("line_items", List.of(Map.of(
                    "amount",   amountInCentavos,
                    "currency", "PHP",
                    "name",     "Quest: " + quest.getTitle(),
                    "description", quest.getDescription().substring(0,
                            Math.min(quest.getDescription().length(), 255)),
                    "quantity", 1
            )));
            attributes.put("payment_method_types", List.of("card", "gcash", "paymaya"));
            attributes.put("success_url",
                    frontendUrl + "/payment/success?quest_id=" + questId);
            attributes.put("cancel_url",
                    frontendUrl + "/payment/cancel?quest_id=" + questId);
            attributes.put("description",
                    "GuildHall Quest Payment — " + quest.getTitle());
            // Store our quest ID in metadata so we can retrieve it in the webhook
            attributes.put("metadata", Map.of(
                    "quest_id",  String.valueOf(questId),
                    "payer_id",  String.valueOf(payer.getId()),
                    "guild_id",  String.valueOf(quest.getGuild().getId())
            ));

            Map<String, Object> body = Map.of(
                    "data", Map.of("attributes", attributes)
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    PAYMONGO_API + "/checkout_sessions",
                    request,
                    Map.class
            );

            // Extract checkout URL and session ID from PayMongo response
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.valueToTree(response.getBody());
            String paymongoSessionId = root.path("data").path("id").asText();
            String checkoutUrl = root.path("data")
                    .path("attributes")
                    .path("checkout_url")
                    .asText();

            if (paymongoSessionId.isBlank() || checkoutUrl.isBlank()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(responseWrapper.error("Invalid response from PayMongo"));
            }

            // Persist payment record in PENDING state
            Payment payment = paymentRepository.findByQuestId(questId)
                    .orElse(Payment.builder()
                            .quest(quest)
                            .payer(payer)
                            .amount(quest.getReward())
                            .status(PaymentStatus.PENDING)
                            .build());

            payment.setPaymongoSessionId(paymongoSessionId);
            payment.setStatus(PaymentStatus.PENDING);
            paymentRepository.save(payment);

            return ResponseEntity.ok(responseWrapper.ok(Map.of(
                    "sessionId",   paymongoSessionId,
                    "checkoutUrl", checkoutUrl
            )));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(responseWrapper.error("PayMongo error: " + e.getMessage()));
        }
    }

    // ── GET /api/payments/verify/{sessionId} ─────────────────────────────────
    // Called by frontend after PayMongo redirects to success_url.
    // PayMongo does NOT append session_id to the success URL automatically,
    // so we store the session ID in our DB and look it up by quest_id instead.

    @GetMapping("/verify/{questId}")
    public ResponseEntity<?> verifyPayment(
            @PathVariable Long questId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User caller = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Payment payment = paymentRepository.findByQuestId(questId)
                .orElseThrow(() -> new IllegalArgumentException("No payment found for quest"));

        if (!payment.getPayer().getId().equals(caller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(responseWrapper.error("Not authorized to verify this payment"));
        }

        // If already confirmed (webhook beat us to it), just return success
        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            return ResponseEntity.ok(responseWrapper.ok(buildPaymentMap(payment)));
        }

        String paymongoSessionId = payment.getPaymongoSessionId();
        if (paymongoSessionId == null || paymongoSessionId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("No PayMongo session found for this quest"));
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = buildHeaders();
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    PAYMONGO_API + "/checkout_sessions/" + paymongoSessionId,
                    HttpMethod.GET,
                    request,
                    Map.class
            );

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.valueToTree(response.getBody());
            String paymentStatus = root.path("data")
                    .path("attributes")
                    .path("payment_intent")
                    .path("attributes")
                    .path("status")
                    .asText();

            // PayMongo payment_intent status is "succeeded" when paid
            // Alternatively check checkout session status directly
            String sessionStatus = root.path("data")
                    .path("attributes")
                    .path("status")
                    .asText();

            boolean isPaid = "succeeded".equals(paymentStatus)
                    || "paid".equals(sessionStatus)
                    || "active".equals(sessionStatus); // active = at least one payment

            if (isPaid) {
                payment.setStatus(PaymentStatus.COMPLETED);
                payment.setPaidAt(LocalDateTime.now());
                paymentRepository.save(payment);

                Quest quest = payment.getQuest();
                if (quest.getStatus() == QuestStatus.PENDING_PAYMENT) {
                    quest.setStatus(QuestStatus.OPEN);
                    questRepository.save(quest);
                }

                return ResponseEntity.ok(responseWrapper.ok(buildPaymentMap(payment)));
            } else {
                return ResponseEntity.ok(responseWrapper.ok(Map.of(
                        "status",  "PENDING",
                        "message", "Payment not yet confirmed. Please complete payment in the PayMongo window."
                )));
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(responseWrapper.error("Verification error: " + e.getMessage()));
        }
    }

    // ── POST /api/payments/webhook ────────────────────────────────────────────
    // PayMongo sends signed events here. Reliable fallback for when the user
    // closes the browser before our /verify is called.
    // Docs: https://developers.paymongo.com/docs/webhooks

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Paymongo-Signature", required = false) String sigHeader) {

        // Verify the webhook signature
        if (sigHeader == null || sigHeader.isBlank()) {
            return ResponseEntity.badRequest().body("Missing signature");
        }

        if (!verifyWebhookSignature(payload, sigHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(payload);
            String eventType = root.path("data").path("attributes").path("type").asText();

            // checkout_session.payment.paid — payment completed
            if ("checkout_session.payment.paid".equals(eventType)) {
                JsonNode sessionData = root.path("data")
                        .path("attributes")
                        .path("data")
                        .path("attributes");

                // Get our quest_id from metadata
                String questIdStr = sessionData.path("metadata")
                        .path("quest_id").asText();

                if (!questIdStr.isBlank()) {
                    Long questId = Long.parseLong(questIdStr);
                    paymentRepository.findByQuestId(questId).ifPresent(payment -> {
                        if (payment.getStatus() != PaymentStatus.COMPLETED) {
                            payment.setStatus(PaymentStatus.COMPLETED);
                            payment.setPaidAt(LocalDateTime.now());
                            paymentRepository.save(payment);

                            Quest quest = payment.getQuest();
                            if (quest.getStatus() == QuestStatus.PENDING_PAYMENT) {
                                quest.setStatus(QuestStatus.OPEN);
                                questRepository.save(quest);
                            }
                        }
                    });
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            // Return 200 anyway — PayMongo will retry on non-2xx
        }

        return ResponseEntity.ok("received");
    }

    // ── GET /api/payments/history ─────────────────────────────────────────────

    @GetMapping("/history")
    public ResponseEntity<?> getPaymentHistory(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Map<String, Object>> payments = paymentRepository.findByPayerId(user.getId())
                .stream()
                .map(this::buildPaymentMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(payments));
    }

    // ── GET /api/payments/quest/{questId} ─────────────────────────────────────

    @GetMapping("/quest/{questId}")
    public ResponseEntity<?> getPaymentByQuest(
            @PathVariable Long questId,
            @AuthenticationPrincipal UserDetails userDetails) {

        Payment payment = paymentRepository.findByQuestId(questId)
                .orElseThrow(() -> new IllegalArgumentException("No payment for this quest"));

        return ResponseEntity.ok(responseWrapper.ok(buildPaymentMap(payment)));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Builds Basic Auth headers for PayMongo.
     * PayMongo uses HTTP Basic Auth: username = secret key, password = empty.
     */
    private HttpHeaders buildHeaders() {
        String credentials = secretKey + ":";
        String encoded = Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Basic " + encoded);
        return headers;
    }

    /**
     * Verifies PayMongo webhook signature.
     * Signature header format: "t=<timestamp>,te=<test_sig>,li=<live_sig>"
     * We HMAC-SHA256 the payload with our webhook secret and compare.
     */
    private boolean verifyWebhookSignature(String payload, String sigHeader) {
        try {
            // Parse timestamp and signature from header
            String timestamp = null;
            String signature = null;

            for (String part : sigHeader.split(",")) {
                if (part.startsWith("t="))  timestamp = part.substring(2);
                if (part.startsWith("te=")) signature = part.substring(3); // test mode
                if (part.startsWith("li=")) signature = part.substring(3); // live mode
            }

            if (timestamp == null || signature == null) return false;

            String signedPayload = timestamp + "." + payload;

            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"
            );
            mac.init(keySpec);
            byte[] hmac = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));

            StringBuilder computed = new StringBuilder();
            for (byte b : hmac) computed.append(String.format("%02x", b));

            return computed.toString().equals(signature);

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private Map<String, Object> buildPaymentMap(Payment p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",              p.getId());
        m.put("questId",         p.getQuest().getId());
        m.put("questTitle",      p.getQuest().getTitle());
        m.put("amount",          p.getAmount());
        m.put("status",          p.getStatus().name());
        m.put("paymongoSessionId", p.getPaymongoSessionId());
        m.put("paidAt",          p.getPaidAt() != null ? p.getPaidAt().toString() : null);
        m.put("createdAt",       p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        return m;
    }
}