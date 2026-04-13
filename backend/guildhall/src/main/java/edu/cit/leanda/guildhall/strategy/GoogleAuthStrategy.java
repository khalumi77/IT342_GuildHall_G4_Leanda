package edu.cit.leanda.guildhall.strategy;

import edu.cit.leanda.guildhall.dto.response.AuthResponse;
import edu.cit.leanda.guildhall.entity.Guild;
import edu.cit.leanda.guildhall.entity.Membership;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.enums.MembershipStatus;
import edu.cit.leanda.guildhall.enums.Role;
import edu.cit.leanda.guildhall.factory.UserDtoFactory;
import edu.cit.leanda.guildhall.repository.GuildRepository;
import edu.cit.leanda.guildhall.repository.MembershipRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import edu.cit.leanda.guildhall.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;

/**
 * Strategy Pattern — GoogleAuthStrategy
 *
 * Handles the server-side Google OAuth2 authorization-code flow.
 * Extracted from GoogleAuthService — now a proper strategy that can be
 * selected at runtime alongside EmailAuthStrategy.
 *
 * The credential payload is a plain String (the authorization code from Google).
 */
@Component
@RequiredArgsConstructor
public class GoogleAuthStrategy implements AuthStrategy {

    private final UserRepository userRepository;
    private final GuildRepository guildRepository;
    private final MembershipRepository membershipRepository;
    private final JwtUtil jwtUtil;
    private final UserDtoFactory userDtoFactory;

    @Value("${google.client.id}")
    private String googleClientId;

    @Value("${google.client.secret}")
    private String googleClientSecret;

    @Value("${google.redirect.uri}")
    private String googleRedirectUri;

    @Override
    public boolean supports(Object credentials) {
        // This strategy handles plain String auth codes coming from Google
        return credentials instanceof String;
    }

    @Override
    @Transactional
    public AuthResponse authenticate(Object credentials) {
        String authorizationCode = (String) credentials;

        // ── 1. Exchange authorization code for tokens (server-to-server) ──────
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> tokenRequest = new LinkedMultiValueMap<>();
        tokenRequest.add("code", authorizationCode);
        tokenRequest.add("client_id", googleClientId);
        tokenRequest.add("client_secret", googleClientSecret);
        tokenRequest.add("redirect_uri", googleRedirectUri);
        tokenRequest.add("grant_type", "authorization_code");

        ResponseEntity<Map> tokenResponse;
        try {
            tokenResponse = restTemplate.postForEntity(
                    "https://oauth2.googleapis.com/token",
                    new HttpEntity<>(tokenRequest, headers),
                    Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Failed to exchange authorization code with Google: " + e.getMessage());
        }

        Map<?, ?> tokenBody = tokenResponse.getBody();
        if (tokenBody == null || tokenBody.containsKey("error")) {
            throw new IllegalArgumentException("Google token exchange failed: " + tokenBody);
        }

        String idToken = (String) tokenBody.get("id_token");
        if (idToken == null) {
            throw new IllegalArgumentException("No id_token in Google response");
        }

        // ── 2. Verify id_token via Google's tokeninfo endpoint ────────────────
        Map<?, ?> payload;
        try {
            payload = restTemplate.getForObject(
                    "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to verify id_token with Google");
        }

        if (payload == null) {
            throw new IllegalArgumentException("Empty tokeninfo response from Google");
        }

        String aud = (String) payload.get("aud");
        if (!googleClientId.equals(aud)) {
            throw new IllegalArgumentException("id_token was not issued for this application");
        }

        String googleSub = (String) payload.get("sub");
        String email     = (String) payload.get("email");
        String givenName = (String) payload.get("given_name");

        if (googleSub == null || email == null) {
            throw new IllegalArgumentException("Missing required fields in Google token");
        }

        String name = (givenName != null && !givenName.isBlank())
                ? givenName
                : email.split("@")[0];

        // ── 3. Find or create user, issue GuildHall JWT ───────────────────────
        return buildAuthResponse(googleSub, email, name);
    }

    @Transactional
    protected AuthResponse buildAuthResponse(String googleSub, String email, String name) {
        Optional<User> existingBySub   = userRepository.findByGoogleSub(googleSub);
        Optional<User> existingByEmail = userRepository.findByEmail(email);

        boolean isNewUser = false;
        User user;

        if (existingBySub.isPresent()) {
            user = existingBySub.get();

        } else if (existingByEmail.isPresent()) {
            // Link Google to an existing email/password account
            user = existingByEmail.get();
            user.setGoogleSub(googleSub);
            user = userRepository.save(user);

        } else {
            String username = generateUniqueUsername(name);
            user = User.builder()
                    .email(email)
                    .username(username)
                    .googleSub(googleSub)
                    .role(Role.ROLE_ADVENTURER)
                    .level(1)
                    .xp(0)
                    .skills(new ArrayList<>())
                    .build();
            user = userRepository.save(user);
            autoEnrollInGlobalSquare(user);
            isNewUser = true;
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .user(userDtoFactory.create(user, isNewUser))
                .build();
    }

    private String generateUniqueUsername(String base) {
        String clean = base.toLowerCase().replaceAll("[^a-z0-9]", "");
        if (clean.isBlank()) clean = "adventurer";
        String candidate = clean;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = clean + suffix++;
        }
        return candidate;
    }

    private void autoEnrollInGlobalSquare(User user) {
        Guild globalSquare = guildRepository.findByName("Global Square")
                .orElseGet(() -> guildRepository.save(
                        Guild.builder()
                                .name("Global Square")
                                .description("The default community for all adventurers.")
                                .createdBy(user)
                                .build()
                ));
        if (!membershipRepository.existsByUserIdAndGuildId(user.getId(), globalSquare.getId())) {
            membershipRepository.save(Membership.builder()
                    .user(user)
                    .guild(globalSquare)
                    .status(MembershipStatus.ACTIVE)
                    .build());
        }
    }
}