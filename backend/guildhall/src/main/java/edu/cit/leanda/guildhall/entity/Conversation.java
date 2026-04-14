package edu.cit.leanda.guildhall.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Conversation — represents a 1-to-1 chat channel between two users.
 *
 * A conversation is created lazily:
 *  - When a quest is accepted (automated system message sent)
 *  - When a user clicks another user's name in the search bar
 *
 * The two participants are stored as user1 / user2.
 * By convention user1.id < user2.id to prevent duplicate rows.
 */
@Entity
@Table(
    name = "conversations",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user1_id", "user2_id"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1;   // lower id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2;   // higher id

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}