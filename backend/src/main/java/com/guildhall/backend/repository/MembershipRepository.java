package com.guildhall.backend.repository;

import com.guildhall.backend.entity.Membership;
import com.guildhall.backend.entity.Guild;
import com.guildhall.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MembershipRepository extends JpaRepository<Membership, Long> {
    Optional<Membership> findByUserAndGuild(User user, Guild guild);
    boolean existsByUserAndGuild(User user, Guild guild);
}