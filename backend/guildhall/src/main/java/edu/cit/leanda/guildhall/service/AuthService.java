package edu.cit.leanda.guildhall.service;

import edu.cit.leanda.guildhall.dto.request.LoginRequest;
import edu.cit.leanda.guildhall.dto.request.RegisterRequest;
import edu.cit.leanda.guildhall.dto.request.SkillsRequest;
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
import edu.cit.leanda.guildhall.strategy.AuthStrategyResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * AuthService — refactored with Factory Method + Strategy patterns.
 *
 * Changes from original:
 *  - login() now delegates to AuthStrategyResolver (Strategy Pattern) instead
 *    of containing its own authentication logic inline.
 *  - toUserDto() and calculateRank() have been removed; UserDtoFactory
 *    (Factory Method Pattern) is injected and used instead.
 *  - All behaviour is identical from the outside; this is a pure refactor.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final GuildRepository guildRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ── Injected via pattern refactors ────────────────────────────────────────
    private final UserDtoFactory userDtoFactory;          // Factory Method Pattern
    private final AuthStrategyResolver authStrategyResolver; // Strategy Pattern

    private static final List<String> VALID_SKILLS = List.of(
            "Design", "Academic", "Writing", "Media", "Manual Labor", "Tutoring", "IT/Tech"
    );

    /**
     * Registers a new adventurer.
     * Auto-enrolls in "Global Square" guild, returns JWT.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("An adventurer with this email already exists");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("This adventurer name is already taken");
        }

        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.ROLE_ADVENTURER)
                .level(1)
                .xp(0)
                .skills(new ArrayList<>())
                .build();

        user = userRepository.save(user);
        autoEnrollInGlobalSquare(user);

        String token = jwtUtil.generateToken(user.getEmail());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .user(userDtoFactory.create(user, true))  // Factory Method Pattern
                .build();
    }

    /**
     * Logs in via email/password.
     * Delegates to AuthStrategyResolver → EmailAuthStrategy (Strategy Pattern).
     */
    public AuthResponse login(LoginRequest request) {
        return authStrategyResolver.resolve(request);     // Strategy Pattern
    }

    /**
     * Saves skills selected on the first-time onboarding screen.
     */
    @Transactional
    public AuthResponse saveSkills(String email, SkillsRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Adventurer not found"));

        List<String> validatedSkills = request.getSkills() == null
                ? new ArrayList<>()
                : request.getSkills().stream()
                        .filter(VALID_SKILLS::contains)
                        .toList();

        user.setSkills(new ArrayList<>(validatedSkills));
        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .user(userDtoFactory.create(user, false)) // Factory Method Pattern
                .build();
    }

    /**
     * Returns the currently authenticated user's profile.
     */
    public AuthResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Adventurer not found"));

        return AuthResponse.builder()
                .success(true)
                .user(userDtoFactory.create(user, false)) // Factory Method Pattern
                .build();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

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
}