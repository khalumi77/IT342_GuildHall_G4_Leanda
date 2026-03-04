package com.guildhall.backend.entity;

import com.guildhall.backend.enums.Role;
import jakarta.persistence.*;
import lombok.*;


import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false)
    private String username;

    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    // Array type — Supabase/PostgreSQL supports this natively
    @Column(columnDefinition = "text[]")
    private String[] skills;

    @Column(name = "google_sub")
    private String googleSub;

    @Builder.Default
    private Integer level = 1;

    @Builder.Default
    private Integer xp = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}