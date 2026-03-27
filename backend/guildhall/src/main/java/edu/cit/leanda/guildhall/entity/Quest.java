package edu.cit.leanda.guildhall.entity;

import edu.cit.leanda.guildhall.enums.QuestStatus;
import edu.cit.leanda.guildhall.enums.QuestType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "quests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Quest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guild_id", nullable = false)
    private Guild guild;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poster_id", nullable = false)
    private User poster;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "helper_id")
    private User helper;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "quest_type", nullable = false)
    private QuestType questType;

    @Column(precision = 10, scale = 2)
    private BigDecimal reward;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestStatus status = QuestStatus.OPEN;

    // File name (e.g. "assignment.png") — stored separately for display
    @Column(name = "attachment_name")
    private String attachmentName;

    // Base64 data URI or file URL — must be TEXT to hold large base64 strings
    @Column(name = "attachment_path", columnDefinition = "TEXT")
    private String attachmentPath;

    @Column(name = "xp_reward", nullable = false)
    private Integer xpReward = 20;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}