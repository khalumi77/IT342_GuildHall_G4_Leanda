package com.guildhall.backend.entity;

import com.guildhall.backend.enums.QuestStatus;
import com.guildhall.backend.enums.QuestType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "quests")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
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

    private String category;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "quest_type", nullable = false)
    private QuestType questType;

    private BigDecimal reward;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private QuestStatus status = QuestStatus.OPEN;

    @Column(name = "attachment_path")
    private String attachmentPath;

    @Column(name = "xp_reward")
    @Builder.Default
    private Integer xpReward = 50;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}