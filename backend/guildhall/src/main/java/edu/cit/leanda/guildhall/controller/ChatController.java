package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.entity.Conversation;
import edu.cit.leanda.guildhall.entity.DirectMessage;
import edu.cit.leanda.guildhall.entity.Quest;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.repository.ConversationRepository;
import edu.cit.leanda.guildhall.repository.DirectMessageRepository;
import edu.cit.leanda.guildhall.repository.UserRepository;
import edu.cit.leanda.guildhall.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ChatController — 1-to-1 user conversations via WebSocket + REST.
 *
 * One Conversation per user-pair. Messages go to /topic/conversation/{id}.
 * Sidebar updates go to /topic/user/{userId}/conversations.
 *
 * REST:
 *   GET  /api/v1/chat/conversations                    — sidebar list
 *   POST /api/v1/chat/conversations/{otherUserId}      — open/create conversation
 *   GET  /api/v1/chat/conversations/{id}/messages      — message history
 *   POST /api/v1/chat/conversations/{id}/messages      — send (REST / system fallback)
 *   GET  /api/v1/chat/users/search?q=                 — search users
 *   POST /api/v1/chat/system/quest-accepted            — automated quest notification
 */
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ConversationRepository conversationRepository;
    private final DirectMessageRepository directMessageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ApiResponseWrapper responseWrapper;
    private final JwtUtil jwtUtil;

    // ── WebSocket ─────────────────────────────────────────────────────────────

    @MessageMapping("/chat/{conversationId}")
    public void handleWebSocketMessage(
            @Payload Map<String, Object> payload,
            StompHeaderAccessor headerAccessor) {

        String token = extractToken(headerAccessor);
        if (token == null || !jwtUtil.isTokenValid(token)) return;

        User sender = userRepository.findByEmail(jwtUtil.extractEmail(token)).orElse(null);
        if (sender == null) return;

        String convIdStr = (String) payload.get("conversationId");
        String content   = (String) payload.get("content");
        if (convIdStr == null || content == null || content.isBlank()) return;

        Long convId;
        try { convId = Long.parseLong(convIdStr); } catch (NumberFormatException e) { return; }

        Conversation conv = conversationRepository.findById(convId).orElse(null);
        if (conv == null || !isParticipant(conv, sender.getId())) return;

        DirectMessage msg = DirectMessage.builder()
                .conversation(conv)
                .sender(sender)
                .content(content.trim())
                .messageType(DirectMessage.MessageType.TEXT)
                .isRead(false)
                .sentAt(LocalDateTime.now())
                .build();
        msg = directMessageRepository.save(msg);

        Map<String, Object> outgoing = buildMessageMap(msg);
        messagingTemplate.convertAndSend("/topic/conversation/" + convId, outgoing);

        // Notify both users' sidebar listeners
        User other = conv.getUser1().getId().equals(sender.getId()) ? conv.getUser2() : conv.getUser1();
        broadcastSidebarUpdate(conv, sender, other);
        broadcastSidebarUpdate(conv, other, sender);
    }

    // ── GET: sidebar list ─────────────────────────────────────────────────────

    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(@AuthenticationPrincipal UserDetails ud) {
        User me = getMe(ud);

        List<Map<String, Object>> result = conversationRepository.findAllForUser(me.getId())
                .stream()
                .map(conv -> buildConversationMap(conv, me.getId()))
                .sorted((a, b) -> {
                    String ta = (String) a.get("lastMessageAt");
                    String tb = (String) b.get("lastMessageAt");
                    if (ta == null && tb == null) return 0;
                    if (ta == null) return 1;
                    if (tb == null) return -1;
                    return tb.compareTo(ta);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(result));
    }

    // ── POST: open/create conversation with another user ─────────────────────

    @PostMapping("/conversations/{otherUserId}")
    public ResponseEntity<?> openConversation(
            @PathVariable Long otherUserId,
            @AuthenticationPrincipal UserDetails ud) {

        User me = getMe(ud);
        if (me.getId().equals(otherUserId)) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("Cannot start a conversation with yourself"));
        }
        User other = userRepository.findById(otherUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Conversation conv = getOrCreate(me, other);
        return ResponseEntity.ok(responseWrapper.ok(buildConversationMap(conv, me.getId())));
    }

    // ── GET: message history ──────────────────────────────────────────────────

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable Long conversationId,
            @AuthenticationPrincipal UserDetails ud) {

        User me = getMe(ud);
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!isParticipant(conv, me.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(responseWrapper.error("Not a participant"));
        }

        List<Map<String, Object>> messages = directMessageRepository
                .findByConversationIdOrderBySentAtAsc(conversationId)
                .stream().map(this::buildMessageMap).collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(messages));
    }

    // ── POST: send message (REST fallback / system messages) ─────────────────

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<?> postMessage(
            @PathVariable Long conversationId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {

        User me = getMe(ud);
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!isParticipant(conv, me.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(responseWrapper.error("Not a participant"));
        }

        String content = (String) body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(responseWrapper.error("Content is required"));
        }

        DirectMessage.MessageType type = DirectMessage.MessageType.TEXT;
        try { type = DirectMessage.MessageType.valueOf((String) body.getOrDefault("messageType", "TEXT")); }
        catch (Exception ignored) { }

        DirectMessage msg = DirectMessage.builder()
                .conversation(conv).sender(me).content(content.trim())
                .messageType(type)
                .questId(parseLong(body.get("questId")))
                .guildId(parseLong(body.get("guildId")))
                .questTitle((String) body.get("questTitle"))
                .guildName((String) body.get("guildName"))
                .isRead(false).sentAt(LocalDateTime.now())
                .build();
        msg = directMessageRepository.save(msg);

        Map<String, Object> outgoing = buildMessageMap(msg);
        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, outgoing);

        User other = conv.getUser1().getId().equals(me.getId()) ? conv.getUser2() : conv.getUser1();
        broadcastSidebarUpdate(conv, me, other);
        broadcastSidebarUpdate(conv, other, me);

        return ResponseEntity.ok(responseWrapper.ok(outgoing));
    }

    /**
     * Called from QuestController after a PENDING quest is edited.
     * Sends a SYSTEM message to the helper notifying them that the quest details changed.
     */
    public Map<String, Object> sendQuestUpdatedNotification(
            User poster,
            User helper,
            Long questId,
            Long guildId,
            String questTitle,
            String guildName) {
 
        Conversation conv = getOrCreate(poster, helper);
        String content = poster.getUsername() + " updated the quest details";
 
        DirectMessage msg = DirectMessage.builder()
                .conversation(conv).sender(poster).content(content)
                .messageType(DirectMessage.MessageType.SYSTEM)
                .questId(questId).guildId(guildId)
                .questTitle(questTitle).guildName(guildName)
                .isRead(false).sentAt(java.time.LocalDateTime.now())
                .build();
        msg = directMessageRepository.save(msg);
 
        Map<String, Object> outgoing = buildMessageMap(msg);
        messagingTemplate.convertAndSend("/topic/conversation/" + conv.getId(), outgoing);
        broadcastSidebarUpdate(conv, helper, poster);
        broadcastSidebarUpdate(conv, poster, helper);
        return outgoing;
    }

    // ── GET: user search ──────────────────────────────────────────────────────

    @GetMapping("/users/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetails ud) {

        User me = getMe(ud);
        if (q == null || q.isBlank()) return ResponseEntity.ok(responseWrapper.ok(List.of()));

        List<Map<String, Object>> results = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(me.getId()))
                .filter(u -> u.getUsername().toLowerCase().contains(q.toLowerCase().trim()))
                .limit(10)
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("profilePictureUrl", u.getProfilePictureUrl());
                    m.put("rank", calculateRank(u.getLevel() != null ? u.getLevel() : 1));
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseWrapper.ok(results));
    }

    // ── POST: system quest-accepted message ───────────────────────────────────

    /**
     * Called from QuestController after accept. Opens/finds the conversation
     * between helper and poster, persists a SYSTEM message with quest metadata,
     * and broadcasts to both users.
     */
    @PostMapping("/system/quest-accepted")
    public ResponseEntity<?> questAccepted(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {

        User helper = getMe(ud);

        Long posterId  = parseLong(body.get("posterId"));
        Long questId   = parseLong(body.get("questId"));
        Long guildId   = parseLong(body.get("guildId"));
        String questTitle = (String) body.get("questTitle");
        String guildName  = (String) body.get("guildName");

        if (posterId == null || questId == null || guildId == null) {
            return ResponseEntity.badRequest().body(responseWrapper.error("Missing required fields"));
        }

        User poster = userRepository.findById(posterId)
                .orElseThrow(() -> new IllegalArgumentException("Poster not found"));

        Conversation conv = getOrCreate(helper, poster);

        Map<String, Object> outgoing = sendQuestAcceptedNotification(helper, poster,
                questId, guildId, questTitle, guildName);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("conversationId", outgoing.get("conversationId"));
        result.put("message", outgoing);
        return ResponseEntity.ok(responseWrapper.ok(result));
    }

    public Map<String, Object> sendQuestAcceptedNotification(
            User helper,
            User poster,
            Long questId,
            Long guildId,
            String questTitle,
            String guildName) {

        Conversation conv = getOrCreate(helper, poster);
        String content = helper.getUsername() + " accepted your quest";

        DirectMessage msg = DirectMessage.builder()
                .conversation(conv).sender(helper).content(content)
                .messageType(DirectMessage.MessageType.SYSTEM)
                .questId(questId).guildId(guildId)
                .questTitle(questTitle).guildName(guildName)
                .isRead(false).sentAt(LocalDateTime.now())
                .build();
        msg = directMessageRepository.save(msg);

        Map<String, Object> outgoing = buildMessageMap(msg);
        messagingTemplate.convertAndSend("/topic/conversation/" + conv.getId(), outgoing);
        broadcastSidebarUpdate(conv, poster, helper);
        broadcastSidebarUpdate(conv, helper, poster);
        return outgoing;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Conversation getOrCreate(User a, User b) {
        User u1 = a.getId() < b.getId() ? a : b;
        User u2 = a.getId() < b.getId() ? b : a;
        return conversationRepository.findBetween(u1.getId(), u2.getId())
                .orElseGet(() -> conversationRepository.save(
                        Conversation.builder().user1(u1).user2(u2).build()));
    }

    private boolean isParticipant(Conversation c, Long uid) {
        return c.getUser1().getId().equals(uid) || c.getUser2().getId().equals(uid);
    }

    private User getMe(UserDetails ud) {
        return userRepository.findByEmail(ud.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private String extractToken(StompHeaderAccessor accessor) {
        List<String> h = accessor.getNativeHeader("Authorization");
        if (h == null || h.isEmpty()) return null;
        String v = h.get(0);
        return (v != null && v.startsWith("Bearer ")) ? v.substring(7) : null;
    }

    private Long parseLong(Object val) {
        if (val == null) return null;
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

    private String calculateRank(int level) {
        if (level >= 71) return "Adamantite";
        if (level >= 51) return "Mithril";
        if (level >= 31) return "Gold";
        if (level >= 21) return "Silver";
        return "Bronze";
    }

    private Map<String, Object> buildConversationMap(Conversation conv, Long myId) {
        User other = conv.getUser1().getId().equals(myId) ? conv.getUser2() : conv.getUser1();
        List<DirectMessage> msgs = directMessageRepository
                .findByConversationIdOrderBySentAtAsc(conv.getId());
        DirectMessage last = msgs.isEmpty() ? null : msgs.get(msgs.size() - 1);
        long unread = directMessageRepository
                .countByConversationIdAndSenderIdNotAndIsReadFalse(conv.getId(), myId);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("conversationId", conv.getId());
        m.put("otherUserId", other.getId());
        m.put("otherUsername", other.getUsername());
        m.put("otherProfilePicture", other.getProfilePictureUrl());
        m.put("lastMessage", last != null ? last.getContent() : null);
        m.put("lastMessageType", last != null ? last.getMessageType().name() : null);
        m.put("lastMessageAt", last != null && last.getSentAt() != null ? last.getSentAt().toString() : null);
        m.put("unreadCount", unread);
        return m;
    }

    private Map<String, Object> buildMessageMap(DirectMessage m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("conversationId", m.getConversation().getId());
        map.put("senderId", m.getSender().getId());
        map.put("senderUsername", m.getSender().getUsername());
        map.put("senderProfilePicture", m.getSender().getProfilePictureUrl());
        map.put("content", m.getContent());
        map.put("messageType", m.getMessageType().name());
        map.put("questId", m.getQuestId());
        map.put("guildId", m.getGuildId());
        map.put("questTitle", m.getQuestTitle());
        map.put("guildName", m.getGuildName());
        map.put("isRead", m.getIsRead());
        map.put("sentAt", m.getSentAt() != null ? m.getSentAt().toString() : null);
        return map;
    }

    private void broadcastSidebarUpdate(Conversation conv, User recipient, User other) {
        Map<String, Object> update = buildConversationMap(conv, recipient.getId());
        update.put("type", "CONVERSATION_UPDATE");
        messagingTemplate.convertAndSend("/topic/user/" + recipient.getId() + "/conversations", update);
    }
}