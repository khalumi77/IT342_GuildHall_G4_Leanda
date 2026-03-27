package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.entity.Guild;
import edu.cit.leanda.guildhall.entity.Membership;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.enums.MembershipStatus;
import edu.cit.leanda.guildhall.enums.QuestStatus;
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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/guilds")
@RequiredArgsConstructor
public class GuildController {

    private final GuildRepository guildRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final QuestRepository questRepository;

    /**
     * GET /api/v1/guilds
     * All guilds — used by BrowseGuilds. Includes isMember flag for the current user.
     */
    @GetMapping
    public ResponseEntity<?> getAllGuilds(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Map<String, Object>> guilds = guildRepository.findAll().stream()
                .map(g -> buildGuildMap(g, currentUser))
                .collect(Collectors.toList());

        return ResponseEntity.ok(wrap(guilds));
    }

    /**
     * GET /api/v1/guilds/my
     * Only guilds the current user has joined.
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyGuilds(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Membership> memberships = membershipRepository.findAll().stream()
                .filter(m -> m.getUser().getId().equals(currentUser.getId())
                        && m.getStatus() == MembershipStatus.ACTIVE)
                .collect(Collectors.toList());

        List<Map<String, Object>> guilds = memberships.stream()
                .map(m -> buildGuildMap(m.getGuild(), currentUser))
                .collect(Collectors.toList());

        return ResponseEntity.ok(wrap(guilds));
    }

    /**
     * GET /api/v1/guilds/{id}
     * Single guild detail — used by the quest dashboard.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getGuild(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        // Only members (or guildmasters) can view
        boolean isMember = membershipRepository.existsByUserIdAndGuildId(currentUser.getId(), id);
        if (!isMember) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", Map.of("message", "You are not a member of this guild")));
        }

        return ResponseEntity.ok(wrap(buildGuildMap(guild, currentUser)));
    }

    /**
     * POST /api/v1/guilds/{id}/join
     * Join a guild.
     */
    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinGuild(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        if (membershipRepository.existsByUserIdAndGuildId(currentUser.getId(), id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("success", false, "error", Map.of("message", "Already a member")));
        }

        membershipRepository.save(Membership.builder()
                .user(currentUser)
                .guild(guild)
                .status(MembershipStatus.ACTIVE)
                .build());

        return ResponseEntity.ok(wrap(Map.of(
                "message", "Successfully joined " + guild.getName(),
                "guild", buildGuildMap(guild, currentUser)
        )));
    }

    /**
     * DELETE /api/v1/guilds/{id}/leave
     * Leave a guild.
     */
    @DeleteMapping("/{id}/leave")
    public ResponseEntity<?> leaveGuild(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Membership membership = membershipRepository
                .findByUserIdAndGuildId(currentUser.getId(), id)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this guild"));

        membershipRepository.delete(membership);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of("message", "Left the guild"),
                "timestamp", Instant.now().toString()
        ));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Map<String, Object> buildGuildMap(Guild g, User currentUser) {
        long memberCount = membershipRepository.findByGuildIdAndStatus(g.getId(), MembershipStatus.ACTIVE).size();
        long questCount = questRepository.findByGuildIdAndStatus(g.getId(), QuestStatus.OPEN).size();
        boolean isMember = membershipRepository.existsByUserIdAndGuildId(currentUser.getId(), g.getId());

        java.util.HashMap<String, Object> map = new java.util.HashMap<>();
        map.put("id", g.getId());
        map.put("name", g.getName());
        map.put("description", g.getDescription() != null ? g.getDescription() : "");
        map.put("memberCount", memberCount);
        map.put("questCount", questCount);
        map.put("isMember", isMember);
        return map;
    }

    private Map<String, Object> wrap(Object data) {
        return Map.of("success", true, "data", data, "timestamp", Instant.now().toString());
    }
}