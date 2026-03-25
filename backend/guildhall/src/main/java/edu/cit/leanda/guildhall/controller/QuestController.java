package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.entity.Guild;
import edu.cit.leanda.guildhall.entity.Quest;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.enums.MembershipStatus;
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
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class QuestController {

    private final QuestRepository questRepository;
    private final GuildRepository guildRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;

    // GET /api/v1/guilds/{guildId}/quests
    @GetMapping("/api/v1/guilds/{guildId}/quests")
    public ResponseEntity<?> getQuests(
            @PathVariable Long guildId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);
        if (!isMember(me.getId(), guildId)) return forbidden();

        List<Map<String, Object>> quests = questRepository
                .findByGuildIdAndStatus(guildId, QuestStatus.OPEN)
                .stream()
                .map(this::toMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(wrap(quests));
    }

    // POST /api/v1/guilds/{guildId}/quests
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
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", Map.of("message", "Quest title is required")));
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
        return ResponseEntity.status(HttpStatus.CREATED).body(wrap(toMap(quest)));
    }

    // GET /api/v1/guilds/{guildId}/quests/{questId}
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
        return ResponseEntity.ok(wrap(toMap(quest)));
    }

    // DELETE /api/v1/guilds/{guildId}/quests/{questId}
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
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "error", Map.of("message", "You can only delete your own quests")));
        }

        questRepository.delete(quest);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of("message", "Quest deleted"),
                "timestamp", Instant.now().toString()));
    }

    // GET /api/v1/quests/mine — all quests posted by current user across all guilds
    @GetMapping("/api/v1/quests/mine")
    public ResponseEntity<?> getMyQuests(
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = getUser(userDetails);

        List<Map<String, Object>> quests = questRepository.findByPosterId(me.getId())
                .stream()
                .filter(q -> q.getStatus() == QuestStatus.OPEN)
                .map(q -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>(toMap(q));
                    m.put("guildId", q.getGuild().getId());
                    m.put("guildName", q.getGuild().getName());
                    return m;
                })
                .sorted(Comparator.comparing(
                        m -> m.get("createdAt") != null ? m.get("createdAt").toString() : "",
                        Comparator.reverseOrder()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(wrap(quests));
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private Map<String, Object> toMap(Quest q) {
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
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "error", Map.of("message", "You are not a member of this guild")));
    }

    private Map<String, Object> wrap(Object data) {
        return Map.of("success", true, "data", data, "timestamp", Instant.now().toString());
    }
}