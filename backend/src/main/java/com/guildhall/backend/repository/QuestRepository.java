package com.guildhall.backend.repository;

import com.guildhall.backend.entity.Quest;
import com.guildhall.backend.enums.QuestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface QuestRepository extends JpaRepository<Quest, Long> {
    Page<Quest> findByGuildId(Long guildId, Pageable pageable);

    @Query("SELECT q FROM Quest q WHERE q.guild.id = :guildId " +
            "AND (:category IS NULL OR q.category = :category) " +
            "AND (:status IS NULL OR q.status = :status) " +
            "AND (:keyword IS NULL OR LOWER(q.title) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Quest> findByFilters(Long guildId, String category,
                              QuestStatus status, String keyword, Pageable pageable);
}