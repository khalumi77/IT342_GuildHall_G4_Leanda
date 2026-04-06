package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.decorator.ApiResponseWrapper;
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

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * GuildController — refactored with Decorator Pattern.
 *
 * Change: the private wrap(Object data) helper has been removed.
 * All response enveloping is now delegated to ApiResponseWrapper (Decorator Pattern),
 * which is injected and shared across all controllers.
 */
@RestController
@RequestMapping("/api/v1/guilds")
@RequiredArgsConstructor
public class GuildController {

    private final GuildRepository guildRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final QuestRepository questRepository;
    private final ApiResponseWrapper responseWrapper;          // Decorator Pattern

    @GetMapping
    public ResponseEntity<?> getAllGuilds(@AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getUser(userDetails);

        List<Map<String, Object>> guilds = guildRepository.findAll().stream()
                .map(g -> buildGuildMap(g, currentUser))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(guilds));  // Decorator Pattern
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyGuilds(@AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getUser(userDetails);

        List<Map<String, Object>> guilds = membershipRepository.findAll().stream()
                .filter(m -> m.getUser().getId().equals(currentUser.getId())
                        && m.getStatus() == MembershipStatus.ACTIVE)
                .map(m -> buildGuildMap(m.getGuild(), currentUser))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(guilds));  // Decorator Pattern
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getGuild(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = getUser(userDetails);
        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        if (!membershipRepository.existsByUserIdAndGuildId(currentUser.getId(), id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(responseWrapper.error("You are not a member of this guild")); // Decorator Pattern
        }

        return ResponseEntity.ok(responseWrapper.ok(buildGuildMap(guild, currentUser))); // Decorator Pattern
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinGuild(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = getUser(userDetails);
        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));

        if (membershipRepository.existsByUserIdAndGuildId(currentUser.getId(), id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(responseWrapper.error("Already a member")); // Decorator Pattern
        }

        membershipRepository.save(Membership.builder()
                .user(currentUser)
                .guild(guild)
                .status(MembershipStatus.ACTIVE)
                .build());

        return ResponseEntity.ok(responseWrapper.ok(Map.of(  // Decorator Pattern
                "message", "Successfully joined " + guild.getName(),
                "guild", buildGuildMap(guild, currentUser)
        )));
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<?> leaveGuild(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = getUser(userDetails);
        Membership membership = membershipRepository
                .findByUserIdAndGuildId(currentUser.getId(), id)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this guild"));

        membershipRepository.delete(membership);

        return ResponseEntity.ok(responseWrapper.ok(Map.of("message", "Left the guild"))); // Decorator Pattern
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> buildGuildMap(Guild g, User currentUser) {
        long memberCount = membershipRepository
                .findByGuildIdAndStatus(g.getId(), MembershipStatus.ACTIVE).size();
        long questCount = questRepository
                .findByGuildIdAndStatus(g.getId(), QuestStatus.OPEN).size();
        boolean isMember = membershipRepository
                .existsByUserIdAndGuildId(currentUser.getId(), g.getId());

        java.util.HashMap<String, Object> map = new java.util.HashMap<>();
        map.put("id", g.getId());
        map.put("name", g.getName());
        map.put("description", g.getDescription() != null ? g.getDescription() : "");
        map.put("memberCount", memberCount);
        map.put("questCount", questCount);
        map.put("isMember", isMember);
        return map;
    }

    private User getUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}