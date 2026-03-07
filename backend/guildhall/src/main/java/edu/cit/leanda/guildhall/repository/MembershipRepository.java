// MembershipRepository.java
package edu.cit.leanda.guildhall.repository;
import edu.cit.leanda.guildhall.entity.Membership;
import edu.cit.leanda.guildhall.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MembershipRepository extends JpaRepository<Membership, Long> {
    Optional<Membership> findByUserIdAndGuildId(Long userId, Long guildId);
    List<Membership> findByGuildIdAndStatus(Long guildId, MembershipStatus status);
    boolean existsByUserIdAndGuildId(Long userId, Long guildId);
}