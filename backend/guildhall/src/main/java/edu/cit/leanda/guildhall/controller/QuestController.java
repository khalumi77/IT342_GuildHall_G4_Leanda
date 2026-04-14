package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.entity.Guild;
import edu.cit.leanda.guildhall.entity.Quest;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.enums.QuestStatus;
import edu.cit.leanda.guildhall.enums.QuestType;
import edu.cit.leanda.guildhall.repository.GuildRepository;
import edu.cit.leanda.guildhall.repository.MembershipRepository;
import edu.cit.leanda.guildhall.repository.QuestRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * QuestController — handles all quest CRUD + accept/complete lifecycle.
 *
 * Quest lifecycle:
 *   OPEN → (someone accepts) → PENDING → (commissioner marks done) → COMPLETED
 *
 * Accept rules:
 *   - Must be a guild member
 *   - Cannot accept your own quest
 *   - Quest must be OPEN
 *   - Max 3 accepted (PENDING) quests per guild per user
 */
@RestController
@RequiredArgsConstructor
public class QuestController {

    private final QuestRepository questRepository;
    private final GuildRepository guildRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final ApiResponseWrapper responseWrapper; // Decorator Pattern
    private final ChatController chatController;

    // ── GET quests for a guild ─────────────────────────────────────────────────

    @GetMapping("/api/v1/guilds/{guildId}/quests")
    public ResponseEntity<?> getQuests(
            @PathVariable Long guildId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);
        if (!isMember(me.getId(), guildId)) return forbidden();

        // Return ALL non-cancelled quests so the UI can show OPEN, PENDING, COMPLETED
        List<Map<String, Object>> quests = questRepository
                .findByGuildId(guildId)
                .stream()
                .filter(q -> q.getStatus() != QuestStatus.CANCELLED)
                .map(q -> toMap(q, me))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(quests)); // Decorator Pattern
    }

    // ── POST create quest ──────────────────────────────────────────────────────

    @PostMapping("/api/v1/guilds/{guildId}/quests")
    public ResponseEntity<?> createQuest(
            @PathVariable Long guildId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);
        if (!isMember(me.getId(), guildId)) return forbidden();

        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        String title = (String) body.get("title");
        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("Quest title is required"));
        }

        String category     = (String) body.getOrDefault("category", "General");
        String description  = (String) body.getOrDefault("description", "");
        String questTypeStr = (String) body.getOrDefault("questType", "VOLUNTEER");
        String attachName   = (String) body.getOrDefault("attachmentName", null);
        String attachData   = (String) body.getOrDefault("attachmentPath", null);

        QuestType questType;
        try { questType = QuestType.valueOf(questTypeStr.toUpperCase()); }
        catch (Exception e) { questType = QuestType.VOLUNTEER; }

        BigDecimal reward = null;
        if (questType == QuestType.PAID) {
            Object r = body.get("reward");
            if (r != null) {
                try { reward = new BigDecimal(r.toString()); }
                catch (NumberFormatException ignored) {}
            }
        }

        Quest quest = Quest.builder()
                .guild(guild)
                .poster(me)
                .category(category)
                .title(title.trim())
                .description(description.trim())
                .questType(questType)
                .reward(reward)
                .status(QuestStatus.OPEN)
                .xpReward(20)
                .attachmentName(attachName)
                .attachmentPath(attachData)
                .build();

        quest = questRepository.save(quest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(responseWrapper.ok(toMap(quest, me)));
    }

    // ── GET single quest ───────────────────────────────────────────────────────

    @GetMapping("/api/v1/guilds/{guildId}/quests/{questId}")
    public ResponseEntity<?> getQuest(
            @PathVariable Long guildId,
            @PathVariable Long questId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);
        if (!isMember(me.getId(), guildId)) return forbidden();

        Quest quest = questRepository.findById(questId)
                .orElseThrow(() -> new IllegalArgumentException("Quest not found"));

        if (!quest.getGuild().getId().equals(guildId)) return forbidden();
        return ResponseEntity.ok(responseWrapper.ok(toMap(quest, me)));
    }

    // ── DELETE quest ───────────────────────────────────────────────────────────

    @DeleteMapping("/api/v1/guilds/{guildId}/quests/{questId}")
    public ResponseEntity<?> deleteQuest(
            @PathVariable Long guildId,
            @PathVariable Long questId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);

        Quest quest = questRepository.findById(questId)
                .orElseThrow(() -> new IllegalArgumentException("Quest not found"));

        if (!quest.getGuild().getId().equals(guildId)) return forbidden();

        if (!quest.getPoster().getId().equals(me.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(responseWrapper.error("You can only delete your own quests"));
        }

        questRepository.delete(quest);
        return ResponseEntity.ok(responseWrapper.ok(Map.of("message", "Quest deleted")));
    }

    // ── POST accept quest ──────────────────────────────────────────────────────

    /**
     * Accept a quest. Rules:
     *  1. Must be a guild member
     *  2. Cannot accept your own quest
     *  3. Quest must be OPEN
     *  4. Max 3 PENDING quests per user per guild
     */
    @PostMapping("/api/v1/guilds/{guildId}/quests/{questId}/accept")
    public ResponseEntity<?> acceptQuest(
            @PathVariable Long guildId,
            @PathVariable Long questId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);
        if (!isMember(me.getId(), guildId)) return forbidden();

        Quest quest = questRepository.findById(questId)
                .orElseThrow(() -> new IllegalArgumentException("Quest not found"));

        if (!quest.getGuild().getId().equals(guildId)) return forbidden();

        // Cannot accept own quest
        if (quest.getPoster().getId().equals(me.getId())) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("You cannot accept your own quest"));
        }

        // Quest must be open
        if (quest.getStatus() != QuestStatus.OPEN) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("This quest is no longer available"));
        }

        // Max 3 accepted quests per guild
        long pendingInGuild = questRepository.findByGuildId(guildId)
                .stream()
                .filter(q -> q.getStatus() == QuestStatus.PENDING
                        && q.getHelper() != null
                        && q.getHelper().getId().equals(me.getId()))
                .count();

        if (pendingInGuild >= 3) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error(
                            "You can only accept up to 3 quests per guild at a time"));
        }

        quest.setHelper(me);
        quest.setStatus(QuestStatus.PENDING);
        quest = questRepository.save(quest);

        chatController.sendQuestAcceptedNotification(
                me,
                quest.getPoster(),
                quest.getId(),
                quest.getGuild().getId(),
                quest.getTitle(),
                quest.getGuild().getName());

        return ResponseEntity.ok(responseWrapper.ok(toMap(quest, me)));
    }

    // ── POST complete quest (commissioner only) ────────────────────────────────

    /**
     * Mark a quest as completed. Only the original poster can do this.
     */
    @PostMapping("/api/v1/guilds/{guildId}/quests/{questId}/complete")
    public ResponseEntity<?> completeQuest(
            @PathVariable Long guildId,
            @PathVariable Long questId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);

        Quest quest = questRepository.findById(questId)
                .orElseThrow(() -> new IllegalArgumentException("Quest not found"));

        if (!quest.getGuild().getId().equals(guildId)) return forbidden();

        // Only the commissioner can mark as complete
        if (!quest.getPoster().getId().equals(me.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(responseWrapper.error("Only the quest commissioner can mark it complete"));
        }

        if (quest.getStatus() != QuestStatus.PENDING) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("Only pending quests can be marked complete"));
        }

        quest.setStatus(QuestStatus.COMPLETED);
        quest = questRepository.save(quest);

        return ResponseEntity.ok(responseWrapper.ok(toMap(quest, me)));
    }

    // ── GET quests posted by current user ──────────────────────────────────────

    @GetMapping("/api/v1/quests/mine")
    public ResponseEntity<?> getMyQuests(
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);

        List<Map<String, Object>> quests = questRepository.findByPosterId(me.getId())
                .stream()
                .filter(q -> q.getStatus() != QuestStatus.CANCELLED)
                .map(q -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>(toMap(q, me));
                    m.put("guildId", q.getGuild().getId());
                    m.put("guildName", q.getGuild().getName());
                    // Include helper info for commissioned quests view
                    if (q.getHelper() != null) {
                        m.put("helperUsername", q.getHelper().getUsername());
                        m.put("helperId", q.getHelper().getId());
                    }
                    return m;
                })
                .sorted(Comparator.comparing(
                        m -> m.get("createdAt") != null ? m.get("createdAt").toString() : "",
                        Comparator.reverseOrder()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(quests)); // Decorator Pattern
    }

    // ── GET quests accepted by current user ────────────────────────────────────

    @GetMapping("/api/v1/quests/accepted")
    public ResponseEntity<?> getAcceptedQuests(
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);

        List<Map<String, Object>> quests = questRepository.findByHelperId(me.getId())
                .stream()
                .filter(q -> q.getStatus() == QuestStatus.PENDING
                        || q.getStatus() == QuestStatus.COMPLETED)
                .map(q -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>(toMap(q, me));
                    m.put("guildId", q.getGuild().getId());
                    m.put("guildName", q.getGuild().getName());
                    m.put("posterUsername", q.getPoster().getUsername());
                    return m;
                })
                .sorted(Comparator.comparing(
                        m -> m.get("createdAt") != null ? m.get("createdAt").toString() : "",
                        Comparator.reverseOrder()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(quests));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Map<String, Object> toMap(Quest q, User viewer) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", q.getId());
        m.put("title", q.getTitle());
        m.put("category", q.getCategory());
        m.put("description", q.getDescription());
        m.put("questType", q.getQuestType().name());
        m.put("reward", q.getReward());
        m.put("xpReward", q.getXpReward());
        m.put("status", q.getStatus().name());
        m.put("postedBy", q.getPoster().getUsername());
        m.put("posterId", q.getPoster().getId());
        m.put("createdAt", q.getCreatedAt() != null ? q.getCreatedAt().toString() : null);
        m.put("attachmentName", q.getAttachmentName());
        m.put("attachmentData", q.getAttachmentPath());

        // Helper info (who accepted the quest)
        if (q.getHelper() != null) {
            m.put("helperUsername", q.getHelper().getUsername());
            m.put("helperId", q.getHelper().getId());
        } else {
            m.put("helperUsername", null);
            m.put("helperId", null);
        }

        // Tell the frontend if this viewer accepted this quest
        boolean viewerIsHelper = q.getHelper() != null
                && q.getHelper().getId().equals(viewer.getId());
        m.put("acceptedByMe", viewerIsHelper);

        return m;
    }

    private User getUser(UserDetails ud) {
        return userRepository.findByEmail(ud.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private boolean isMember(Long userId, Long guildId) {
        return membershipRepository.existsByUserIdAndGuildId(userId, guildId);
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(responseWrapper.error("You are not a member of this guild"));
    }
}