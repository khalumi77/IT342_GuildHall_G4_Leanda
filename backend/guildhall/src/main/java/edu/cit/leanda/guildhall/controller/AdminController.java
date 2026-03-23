package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.entity.Guild;
import edu.cit.leanda.guildhall.entity.Membership;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.enums.MembershipStatus;
import edu.cit.leanda.guildhall.enums.Role;
import edu.cit.leanda.guildhall.repository.GuildRepository;
import edu.cit.leanda.guildhall.repository.MembershipRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// NOTE: Role enforcement is done at the SecurityConfig level via
//   .requestMatchers("/api/v1/admin/**").hasAuthority("ROLE_GUILDMASTER")
// We deliberately do NOT use class-level @PreAuthorize here because it can
// interfere with the JWT filter chain on some Spring Boot 3.x configurations.

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final GuildRepository guildRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;

    /**
     * GET /api/v1/admin/guilds
     * Returns all guilds with member counts.
     */
    @GetMapping("/guilds")
    public ResponseEntity<?> getAllGuilds() {
        List<Map<String, Object>> guilds = guildRepository.findAll().stream()
                .map(g -> {
                    long memberCount = membershipRepository.findAll().stream()
                            .filter(m -> m.getGuild().getId().equals(g.getId())
                                    && m.getStatus() == MembershipStatus.ACTIVE)
                            .count();
                    return Map.<String, Object>of(
                            "id", g.getId(),
                            "name", g.getName(),
                            "description", g.getDescription() != null ? g.getDescription() : "",
                            "memberCount", memberCount,
                            "questCount", 0
                    );
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(wrap(guilds));
    }

    /**
     * POST /api/v1/admin/guilds
     * Creates a new guild.
     */
    @PostMapping("/guilds")
    public ResponseEntity<?> createGuild(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        String name = body.get("name");
        String description = body.getOrDefault("description", "");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", Map.of("message", "Guild name is required")
            ));
        }

        if (guildRepository.findByName(name.trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "error", Map.of("message", "A guild with this name already exists")
            ));
        }

        User creator = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Guild guild = Guild.builder()
                .name(name.trim())
                .description(description.trim())
                .createdBy(creator)
                .build();
        guild = guildRepository.save(guild);

        // Auto-enroll the Guildmaster
        membershipRepository.save(Membership.builder()
                .user(creator)
                .guild(guild)
                .status(MembershipStatus.ACTIVE)
                .build());

        final Long guildId = guild.getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(wrap(Map.of(
                "id", guildId,
                "name", guild.getName(),
                "description", guild.getDescription() != null ? guild.getDescription() : "",
                "memberCount", 1,
                "questCount", 0
        )));
    }

    /**
     * PUT /api/v1/admin/guilds/{id}
     * Renames a guild.
     */
    @PutMapping("/guilds/{id}")
    public ResponseEntity<?> renameGuild(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String newName = body.get("name");
        if (newName == null || newName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", Map.of("message", "Name cannot be blank")
            ));
        }

        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        guild.setName(newName.trim());
        guildRepository.save(guild);

        return ResponseEntity.ok(wrap(Map.of("id", guild.getId(), "name", guild.getName())));
    }

    /**
     * DELETE /api/v1/admin/guilds/{id}
     * Deletes a guild and its memberships.
     */
    @DeleteMapping("/guilds/{id}")
    public ResponseEntity<?> deleteGuild(@PathVariable Long id) {
        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        // Remove memberships to avoid FK violations
        List<Membership> memberships = membershipRepository.findAll().stream()
                .filter(m -> m.getGuild().getId().equals(id))
                .collect(Collectors.toList());
        membershipRepository.deleteAll(memberships);

        guildRepository.delete(guild);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of("message", "Guild disbanded"),
                "timestamp", Instant.now().toString()
        ));
    }

    /**
     * GET /api/v1/admin/users
     * Returns all users.
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(u -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("email", u.getEmail());
                    m.put("role", u.getRole().name());
                    m.put("level", u.getLevel() != null ? u.getLevel() : 1);
                    m.put("xp", u.getXp() != null ? u.getXp() : 0);
                    m.put("rank", calculateRank(u.getLevel() != null ? u.getLevel() : 1));
                    m.put("profilePictureUrl", u.getProfilePictureUrl() != null ? u.getProfilePictureUrl() : "");
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(wrap(users));
    }

    /**
     * GET /api/v1/admin/users/{id}
     * Returns a single user's full profile for admin viewing.
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Map<String, Object> data = new java.util.HashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("email", user.getEmail());
        data.put("role", user.getRole().name());
        data.put("level", user.getLevel() != null ? user.getLevel() : 1);
        data.put("xp", user.getXp() != null ? user.getXp() : 0);
        data.put("rank", calculateRank(user.getLevel() != null ? user.getLevel() : 1));
        data.put("skills", user.getSkills() != null ? user.getSkills() : java.util.List.of());
        data.put("bio", user.getBio() != null ? user.getBio() : "");
        data.put("profilePictureUrl", user.getProfilePictureUrl() != null ? user.getProfilePictureUrl() : "");
        data.put("googleSub", user.getGoogleSub());

        return ResponseEntity.ok(wrap(data));
    }

    /**
     * POST /api/v1/admin/users/{id}/ban
     * Removes a user from the system.
     */
    @PostMapping("/users/{id}/ban")
    public ResponseEntity<?> banUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getRole() == Role.ROLE_GUILDMASTER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "error", Map.of("message", "Cannot ban a Guildmaster")
            ));
        }

        // Remove memberships first
        List<Membership> memberships = membershipRepository.findAll().stream()
                .filter(m -> m.getUser().getId().equals(id))
                .collect(Collectors.toList());
        membershipRepository.deleteAll(memberships);

        userRepository.delete(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of("message", "User restricted"),
                "timestamp", Instant.now().toString()
        ));
    }

    private Map<String, Object> wrap(Object data) {
        return Map.of("success", true, "data", data, "timestamp", Instant.now().toString());
    }

    private String calculateRank(int xp) {
        if (xp >= 5000) return "Mithril";
        if (xp >= 2000) return "Gold";
        if (xp >= 500)  return "Silver";
        return "Bronze";
    }
}