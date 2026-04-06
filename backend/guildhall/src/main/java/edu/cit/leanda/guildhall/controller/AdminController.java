package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.entity.Guild;
import edu.cit.leanda.guildhall.entity.Membership;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.enums.MembershipStatus;
import edu.cit.leanda.guildhall.enums.Role;
import edu.cit.leanda.guildhall.factory.UserDtoFactory;
import edu.cit.leanda.guildhall.repository.GuildRepository;
import edu.cit.leanda.guildhall.repository.MembershipRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AdminController — refactored with Decorator + Factory Method patterns.
 *
 * Changes from original:
 *  - private wrap()          → injected ApiResponseWrapper (Decorator Pattern)
 *  - private calculateRank() → delegated to UserDtoFactory  (Factory Method Pattern)
 *    Both helpers were duplicated from other files; they now have a single home.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final GuildRepository guildRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final ApiResponseWrapper responseWrapper;  // Decorator Pattern
    private final UserDtoFactory userDtoFactory;       // Factory Method Pattern

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

        return ResponseEntity.ok(responseWrapper.ok(guilds));  // Decorator Pattern
    }

    @PostMapping("/guilds")
    public ResponseEntity<?> createGuild(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        String name = body.get("name");
        String description = body.getOrDefault("description", "");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("Guild name is required")); // Decorator Pattern
        }

        if (guildRepository.findByName(name.trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(responseWrapper.error("A guild with this name already exists")); // Decorator Pattern
        }

        User creator = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Guild guild = Guild.builder()
                .name(name.trim())
                .description(description.trim())
                .createdBy(creator)
                .build();
        guild = guildRepository.save(guild);

        membershipRepository.save(Membership.builder()
                .user(creator)
                .guild(guild)
                .status(MembershipStatus.ACTIVE)
                .build());

        final Long guildId = guild.getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(responseWrapper.ok(Map.of( // Decorator Pattern
                "id", guildId,
                "name", guild.getName(),
                "description", guild.getDescription() != null ? guild.getDescription() : "",
                "memberCount", 1,
                "questCount", 0
        )));
    }

    @PutMapping("/guilds/{id}")
    public ResponseEntity<?> renameGuild(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String newName = body.get("name");
        if (newName == null || newName.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("Name cannot be blank")); // Decorator Pattern
        }

        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        guild.setName(newName.trim());
        guildRepository.save(guild);

        return ResponseEntity.ok(responseWrapper.ok(Map.of("id", guild.getId(), "name", guild.getName()))); // Decorator Pattern
    }

    @DeleteMapping("/guilds/{id}")
    public ResponseEntity<?> deleteGuild(@PathVariable Long id) {
        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        List<Membership> memberships = membershipRepository.findAll().stream()
                .filter(m -> m.getGuild().getId().equals(id))
                .collect(Collectors.toList());
        membershipRepository.deleteAll(memberships);
        guildRepository.delete(guild);

        return ResponseEntity.ok(responseWrapper.ok(Map.of("message", "Guild disbanded"))); // Decorator Pattern
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(u -> {
                    int level = u.getLevel() != null ? u.getLevel() : 1;
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("email", u.getEmail());
                    m.put("role", u.getRole().name());
                    m.put("level", level);
                    m.put("xp", u.getXp() != null ? u.getXp() : 0);
                    m.put("rank", userDtoFactory.calculateRank(level)); // Factory Method Pattern
                    m.put("profilePictureUrl", u.getProfilePictureUrl() != null ? u.getProfilePictureUrl() : "");
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(users)); // Decorator Pattern
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        int level = user.getLevel() != null ? user.getLevel() : 1;

        Map<String, Object> data = new java.util.HashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("email", user.getEmail());
        data.put("role", user.getRole().name());
        data.put("level", level);
        data.put("xp", user.getXp() != null ? user.getXp() : 0);
        data.put("rank", userDtoFactory.calculateRank(level)); // Factory Method Pattern
        data.put("skills", user.getSkills() != null ? user.getSkills() : java.util.List.of());
        data.put("bio", user.getBio() != null ? user.getBio() : "");
        data.put("profilePictureUrl", user.getProfilePictureUrl() != null ? user.getProfilePictureUrl() : "");
        data.put("googleSub", user.getGoogleSub());

        return ResponseEntity.ok(responseWrapper.ok(data)); // Decorator Pattern
    }

    @PostMapping("/users/{id}/ban")
    public ResponseEntity<?> banUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getRole() == Role.ROLE_GUILDMASTER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(responseWrapper.error("Cannot ban a Guildmaster")); // Decorator Pattern
        }

        List<Membership> memberships = membershipRepository.findAll().stream()
                .filter(m -> m.getUser().getId().equals(id))
                .collect(Collectors.toList());
        membershipRepository.deleteAll(memberships);
        userRepository.delete(user);

        return ResponseEntity.ok(responseWrapper.ok(Map.of("message", "User restricted"))); // Decorator Pattern
    }
}