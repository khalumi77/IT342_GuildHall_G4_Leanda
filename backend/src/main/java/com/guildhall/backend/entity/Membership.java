package com.guildhall.backend.entity;

import com.guildhall.backend.enums.MembershipStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "memberships",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "guild_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Membership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guild_id", nullable = false)
    private Guild guild;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MembershipStatus status = MembershipStatus.ACTIVE;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() { joinedAt = LocalDateTime.now(); }
}