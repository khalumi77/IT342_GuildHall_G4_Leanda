package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.entity.Message;
import edu.cit.leanda.guildhall.entity.Quest;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.repository.MessageRepository;
import edu.cit.leanda.guildhall.repository.QuestRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import edu.cit.leanda.guildhall.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ChatController — handles WebSocket STOMP messaging and REST history/thread endpoints.
 *
 * WebSocket flow:
 *   Client SUBSCRIBE  → /topic/quest/{questId}
 *   Client SEND       → /app/chat/{questId}
 *   Server BROADCAST  → /topic/quest/{questId}
 *
 * REST endpoints:
 *   GET /api/v1/guilds/{guildId}/quests/{questId}/messages — message history
 *   GET /api/v1/chat/threads — list of chat threads (quests) the current user is part of
 */
@RestController
@RequiredArgsConstructor
public class ChatController {

    private final MessageRepository messageRepository;
    private final QuestRepository questRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ApiResponseWrapper responseWrapper;
    private final JwtUtil jwtUtil;

    // ── WebSocket: send a message ──────────────────────────────────────────────

    @MessageMapping("/chat/{questId}")
    public void sendMessage(
            @Payload Map<String, Object> payload,
            org.springframework.messaging.simp.stomp.StompHeaderAccessor headerAccessor) {

        // Extract JWT from STOMP native headers (sent during CONNECT)
        String token = null;
        List<String> authHeaders = headerAccessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authHeader = authHeaders.get(0);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
        }

        if (token == null || !jwtUtil.isTokenValid(token)) return;

        String email = jwtUtil.extractEmail(token);
        User sender = userRepository.findByEmail(email).orElse(null);
        if (sender == null) return;

        String questIdStr = (String) payload.get("questId");
        String content = (String) payload.get("content");
        if (questIdStr == null || content == null || content.isBlank()) return;

        Long questId;
        try { questId = Long.parseLong(questIdStr); } catch (NumberFormatException e) { return; }

        Quest quest = questRepository.findById(questId).orElse(null);
        if (quest == null) return;

        // Verify sender is poster or helper
        boolean isParticipant = quest.getPoster().getId().equals(sender.getId()) ||
                (quest.getHelper() != null && quest.getHelper().getId().equals(sender.getId()));
        if (!isParticipant) return;

        Message message = Message.builder()
                .quest(quest)
                .sender(sender)
                .content(content.trim())
                .isRead(false)
                .sentAt(LocalDateTime.now())
                .build();
        message = messageRepository.save(message);

        Map<String, Object> outgoing = buildMessageMap(message);
        messagingTemplate.convertAndSend("/topic/quest/" + questId, outgoing);
    }

    // ── REST: message history ──────────────────────────────────────────────────

    @GetMapping("/api/v1/guilds/{guildId}/quests/{questId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable Long guildId,
            @PathVariable Long questId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Quest quest = questRepository.findById(questId)
                .orElseThrow(() -> new IllegalArgumentException("Quest not found"));

        if (!quest.getGuild().getId().equals(guildId)) {
            return ResponseEntity.status(403).body(responseWrapper.error("Quest not in this guild"));
        }

        boolean isParticipant = quest.getPoster().getId().equals(me.getId()) ||
                (quest.getHelper() != null && quest.getHelper().getId().equals(me.getId()));

        if (!isParticipant) {
            return ResponseEntity.status(403).body(responseWrapper.error("You are not a participant in this quest chat"));
        }

        List<Map<String, Object>> messages = messageRepository
                .findByQuestIdOrderBySentAtAsc(questId)
                .stream()
                .map(this::buildMessageMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(messages));
    }

    // ── REST: list chat threads for current user ───────────────────────────────

    /**
     * Returns all quests where the current user is poster OR helper,
     * enriched with the latest message and unread count.
     * Used to populate the chat sidebar.
     */
    @GetMapping("/api/v1/chat/threads")
    public ResponseEntity<?> getChatThreads(
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Quest> posted = questRepository.findByPosterId(me.getId());
        List<Quest> helped = questRepository.findByHelperId(me.getId());

        Set<Long> seen = new HashSet<>();
        List<Quest> threads = new ArrayList<>();
        for (Quest q : posted) { if (q.getHelper() != null && seen.add(q.getId())) threads.add(q); }
        for (Quest q : helped) { if (seen.add(q.getId())) threads.add(q); }

        List<Map<String, Object>> result = threads.stream()
                .map(q -> {
                    List<Message> msgs = messageRepository.findByQuestIdOrderBySentAtAsc(q.getId());
                    Message last = msgs.isEmpty() ? null : msgs.get(msgs.size() - 1);
                    long unread = msgs.stream()
                            .filter(m -> !m.getSender().getId().equals(me.getId()) && !m.getIsRead())
                            .count();

                    // Determine the "other" participant
                    User other = q.getPoster().getId().equals(me.getId()) ? q.getHelper() : q.getPoster();

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("questId", q.getId());
                    m.put("questTitle", q.getTitle());
                    m.put("guildId", q.getGuild().getId());
                    m.put("guildName", q.getGuild().getName());
                    m.put("otherUserId", other != null ? other.getId() : null);
                    m.put("otherUsername", other != null ? other.getUsername() : null);
                    m.put("otherProfilePicture", other != null ? other.getProfilePictureUrl() : null);
                    m.put("lastMessage", last != null ? last.getContent() : null);
                    m.put("lastMessageAt", last != null ? last.getSentAt().toString() : null);
                    m.put("unreadCount", unread);
                    return m;
                })
                .sorted((a, b) -> {
                    String aTime = (String) a.get("lastMessageAt");
                    String bTime = (String) b.get("lastMessageAt");
                    if (aTime == null && bTime == null) return 0;
                    if (aTime == null) return 1;
                    if (bTime == null) return -1;
                    return bTime.compareTo(aTime);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(result));
    }

    // ── REST: post a message (REST fallback / initial system message) ──────────

    @PostMapping("/api/v1/guilds/{guildId}/quests/{questId}/messages")
    public ResponseEntity<?> postMessage(
            @PathVariable Long guildId,
            @PathVariable Long questId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        User me = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Quest quest = questRepository.findById(questId)
                .orElseThrow(() -> new IllegalArgumentException("Quest not found"));

        if (!quest.getGuild().getId().equals(guildId)) {
            return ResponseEntity.status(403).body(responseWrapper.error("Quest not in this guild"));
        }

        boolean isParticipant = quest.getPoster().getId().equals(me.getId()) ||
                (quest.getHelper() != null && quest.getHelper().getId().equals(me.getId()));
        if (!isParticipant) {
            return ResponseEntity.status(403).body(responseWrapper.error("Not a participant"));
        }

        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(responseWrapper.error("Content is required"));
        }

        Message message = Message.builder()
                .quest(quest)
                .sender(me)
                .content(content.trim())
                .isRead(false)
                .sentAt(LocalDateTime.now())
                .build();
        message = messageRepository.save(message);

        Map<String, Object> outgoing = buildMessageMap(message);
        messagingTemplate.convertAndSend("/topic/quest/" + questId, outgoing);

        return ResponseEntity.ok(responseWrapper.ok(outgoing));
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    private Map<String, Object> buildMessageMap(Message m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("questId", m.getQuest().getId());
        map.put("senderId", m.getSender().getId());
        map.put("senderUsername", m.getSender().getUsername());
        map.put("senderProfilePicture", m.getSender().getProfilePictureUrl());
        map.put("content", m.getContent());
        map.put("isRead", m.getIsRead());
        map.put("sentAt", m.getSentAt() != null ? m.getSentAt().toString() : null);
        return map;
    }
}