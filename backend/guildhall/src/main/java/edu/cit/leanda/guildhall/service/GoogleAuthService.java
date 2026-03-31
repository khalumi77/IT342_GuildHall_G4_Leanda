package edu.cit.leanda.guildhall.service;

import edu.cit.leanda.guildhall.dto.response.AuthResponse;
import edu.cit.leanda.guildhall.entity.Guild;
import edu.cit.leanda.guildhall.entity.Membership;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.enums.MembershipStatus;
import edu.cit.leanda.guildhall.enums.Role;
import edu.cit.leanda.guildhall.repository.GuildRepository;
import edu.cit.leanda.guildhall.repository.MembershipRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import edu.cit.leanda.guildhall.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final GuildRepository guildRepository;
    private final MembershipRepository membershipRepository;
    private final JwtUtil jwtUtil;

    @Value("${google.client.id}")
    private String googleClientId;

    @Value("${google.client.secret}")
    private String googleClientSecret;

    @Value("${google.redirect.uri}")
    private String googleRedirectUri;

    // ── Backend-driven flow (authorization code → token exchange) ─────────────

    /**
     * Called by GoogleAuthController after Google redirects back with an
     * authorization code.  The entire exchange happens server-to-server —
     * the frontend never touches Google.
     *
     * 1. Exchange the code for an access token + id_token at Google's token endpoint.
     * 2. Verify the id_token by calling Google's tokeninfo endpoint.
     * 3. Find or create the user, issue a GuildHall JWT.
     */
    @Transactional
    public AuthResponse googleLoginWithCode(String authorizationCode) {

        // ── 1. Exchange code for tokens ──────────────────────────────────────
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> tokenRequest = new LinkedMultiValueMap<>();
        tokenRequest.add("code", authorizationCode);
        tokenRequest.add("client_id", googleClientId);
        tokenRequest.add("client_secret", googleClientSecret);
        tokenRequest.add("redirect_uri", googleRedirectUri);
        tokenRequest.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> requestEntity =
                new HttpEntity<>(tokenRequest, headers);

        ResponseEntity<Map> tokenResponse;
        try {
            tokenResponse = restTemplate.postForEntity(
                    "https://oauth2.googleapis.com/token",
                    requestEntity,
                    Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to exchange authorization code with Google: " + e.getMessage());
        }

        Map<?, ?> tokenBody = tokenResponse.getBody();
        if (tokenBody == null || tokenBody.containsKey("error")) {
            throw new IllegalArgumentException("Google token exchange failed: " + tokenBody);
        }

        String idToken = (String) tokenBody.get("id_token");
        if (idToken == null) {
            throw new IllegalArgumentException("No id_token in Google response");
        }

        // ── 2. Verify the id_token via tokeninfo ─────────────────────────────
        String verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
        Map<?, ?> payload;
        try {
            payload = restTemplate.getForObject(verifyUrl, Map.class);
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

        // ── 3. Find or create the user ────────────────────────────────────────
        return buildAuthResponse(googleSub, email, name);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
                .user(toUserDto(user, isNewUser))
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
                    .user(user).guild(globalSquare).status(MembershipStatus.ACTIVE).build());
        }
    }

    private AuthResponse.UserDto toUserDto(User user, boolean isNewUser) {
        int xp    = user.getXp()    == null ? 0 : user.getXp();
        int level = user.getLevel() == null ? 1 : user.getLevel();
        return AuthResponse.UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole().name())
                .level(level)
                .xp(xp)
                .rank(calculateRank(level))
                .skills(user.getSkills())
                .newUser(isNewUser)
                .bio(user.getBio())
                .profilePictureUrl(user.getProfilePictureUrl())
                .googleSub(user.getGoogleSub())
                .build();
    }

    private String calculateRank(int level) {
        if (level >= 71) return "Adamantite";
        if (level >= 51) return "Mithril";
        if (level >= 31) return "Gold";
        if (level >= 21) return "Silver";
        return "Bronze";
    }
}