package edu.cit.leanda.guildhall.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * DirectMessage — a single message within a Conversation.
 *
 * Messages can be of two types:
 *  - TEXT:   normal user-typed message
 *  - SYSTEM: auto-generated (e.g. quest acceptance notification)
 *
 * SYSTEM messages carry optional metadata (questId, guildId, questTitle, guildName)
 * so the frontend can render a clickable card and deep-link to the quest.
 */
@Entity
@Table(name = "direct_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DirectMessage {

    public enum MessageType { TEXT, SYSTEM }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false)
    @Builder.Default
    private MessageType messageType = MessageType.TEXT;

    // ── System message metadata (nullable for TEXT messages) ────────────────

    @Column(name = "quest_id")
    private Long questId;

    @Column(name = "guild_id")
    private Long guildId;

    @Column(name = "quest_title")
    private String questTitle;

    @Column(name = "guild_name")
    private String guildName;

    // ──────────────────────────────────────────────────────────────────────────

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "sent_at", updatable = false)
    private LocalDateTime sentAt;
}