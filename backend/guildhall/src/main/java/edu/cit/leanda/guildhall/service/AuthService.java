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
import edu.cit.leanda.guildhall.repository.GuildRepository;
import edu.cit.leanda.guildhall.repository.MembershipRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import edu.cit.leanda.guildhall.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final GuildRepository guildRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // Valid skill options matching the frontend selection screen
    private static final List<String> VALID_SKILLS = List.of(
            "Design", "Academic", "Writing", "Media", "Manual Labor", "Tutoring", "IT/Tech"
    );

    /**
     * Registers a new adventurer.
     * Per AC-1: automatically enrolls the new user in "Global Square" guild.
     * Per AC-2: hashes password with BCrypt, returns JWT.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {

        // Prevent duplicate email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("An adventurer with this email already exists");
        }

        // Prevent duplicate username
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("This adventurer name is already taken");
        }

        // Build and save the new user
        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))  // BCrypt(12)
                .role(Role.ROLE_ADVENTURER)
                .level(1)
                .xp(0)
                .skills(new ArrayList<>())
                .build();

        user = userRepository.save(user);

        // AC-1: Auto-enroll in "Global Square" guild
        autoEnrollInGlobalSquare(user);

        String token = jwtUtil.generateToken(user.getEmail());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .user(toUserDto(user, true))   // isNewUser = true → shows skills screen
                .build();
    }

    /**
     * Logs in an existing adventurer.
     * Accepts either username or email (email is case-insensitive).
     * Returns a JWT on success; throws on invalid credentials.
     */
    public AuthResponse login(LoginRequest request) {
        // Try to find by username first, then by email (case-insensitive)
        User user = userRepository.findByUsername(request.getUsername())
                .orElseGet(() -> userRepository.findByEmail(request.getUsername().toLowerCase())
                        .orElseThrow(() -> new BadCredentialsException("Invalid credentials")));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .user(toUserDto(user, false))  // isNewUser = false → skip skills screen
                .build();
    }

    /**
     * Saves the skills selected on the first-time skills screen.
     * Called right after registration when the user clicks "Continue."
     */
    @Transactional
    public AuthResponse saveSkills(String email, SkillsRequest request) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Adventurer not found"));

        // Only keep valid skill names from the allowed list
        List<String> validatedSkills = request.getSkills() == null
                ? new ArrayList<>()
                : request.getSkills().stream()
                        .filter(VALID_SKILLS::contains)
                        .toList();

        user.setSkills(validatedSkills);
        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .user(toUserDto(user, false))
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
                .user(toUserDto(user, false))
                .build();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * Finds (or creates) the "Global Square" guild and enrolls the user in it.
     */
    private void autoEnrollInGlobalSquare(User user) {
        Guild globalSquare = guildRepository.findByName("Global Square")
                .orElseGet(() -> guildRepository.save(
                        Guild.builder()
                                .name("Global Square")
                                .description("The default community for all adventurers.")
                                .createdBy(user)
                                .build()
                ));

        boolean alreadyMember = membershipRepository
                .existsByUserIdAndGuildId(user.getId(), globalSquare.getId());

        if (!alreadyMember) {
            membershipRepository.save(
                    Membership.builder()
                            .user(user)
                            .guild(globalSquare)
                            .status(MembershipStatus.ACTIVE)
                            .build()
            );
        }
    }

    /**
     * Maps a User entity to the DTO that gets sent back to the client.
     * Calculates rank title from XP thresholds.
     */
    private AuthResponse.UserDto toUserDto(User user, boolean isNewUser) {
        return AuthResponse.UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole().name())
                .level(user.getLevel())
                .xp(user.getXp())
                .rank(calculateRank(user.getXp()))
                .skills(user.getSkills())
                .isNewUser(isNewUser)
                .build();
    }

    /**
     * Rank titles based on XP thresholds.
     * Bronze → Silver → Gold → Mithril
     */
    private String calculateRank(int xp) {
        if (xp >= 5000) return "Mithril";
        if (xp >= 2000) return "Gold";
        if (xp >= 500)  return "Silver";
        return "Bronze";
    }
}