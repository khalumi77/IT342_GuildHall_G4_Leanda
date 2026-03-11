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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    @Transactional
    public AuthResponse googleLogin(String idTokenString) {

        // ── Verify token via Google's tokeninfo endpoint ──────────────────────
        // This is simpler and more reliable than the Java verifier library.
        RestTemplate restTemplate = new RestTemplate();
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idTokenString;

        Map<?, ?> payload;
        try {
            payload = restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to verify Google token with Google servers");
        }

        if (payload == null) {
            throw new IllegalArgumentException("Invalid Google token: empty response");
        }

        // Verify the token was issued for YOUR app
        String aud = (String) payload.get("aud");
        if (aud == null || !aud.equals(googleClientId)) {
            throw new IllegalArgumentException("Google token was not issued for this application");
        }

        // Extract user info from the verified payload
        String googleSub = (String) payload.get("sub");
        String email     = (String) payload.get("email");
        String name      = (String) payload.get("given_name");
        if (name == null || name.isBlank()) {
            name = email != null ? email.split("@")[0] : "adventurer";
        }

        if (googleSub == null || email == null) {
            throw new IllegalArgumentException("Google token missing required fields");
        }

        // ── Find or create user ───────────────────────────────────────────────
        Optional<User> existingBySub   = userRepository.findByGoogleSub(googleSub);
        Optional<User> existingByEmail = userRepository.findByEmail(email);

        boolean isNewUser = false;
        User user;

        if (existingBySub.isPresent()) {
            // Returning Google user
            user = existingBySub.get();

        } else if (existingByEmail.isPresent()) {
            // Had an email/password account — link Google to it
            user = existingByEmail.get();
            user.setGoogleSub(googleSub);
            user = userRepository.save(user);

        } else {
            // Brand new user
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

    // ── Helpers ──────────────────────────────────────────────────────────────

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
            membershipRepository.save(
                    Membership.builder()
                            .user(user)
                            .guild(globalSquare)
                            .status(MembershipStatus.ACTIVE)
                            .build()
            );
        }
    }

    private AuthResponse.UserDto toUserDto(User user, boolean isNewUser) {
        int xp = user.getXp() == null ? 0 : user.getXp();
        return AuthResponse.UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole().name())
                .level(user.getLevel())
                .xp(xp)
                .rank(calculateRank(xp))
                .skills(user.getSkills())
                .newUser(isNewUser)
                .build();
    }

    private String calculateRank(int xp) {
        if (xp >= 5000) return "Mithril";
        if (xp >= 2000) return "Gold";
        if (xp >= 500)  return "Silver";
        return "Bronze";
    }
}