package com.guildhall.backend.repository;

import com.guildhall.backend.entity.Guild;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuildRepository extends JpaRepository<Guild, Long> {
    Page<Guild> findByNameContainingIgnoreCase(String name, Pageable pageable);
}