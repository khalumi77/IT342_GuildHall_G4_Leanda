// MembershipRepository.java
package edu.cit.leanda.guildhall.features.guild;
import edu.cit.leanda.guildhall.features.guild.Membership;
import edu.cit.leanda.guildhall.features.guild.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MembershipRepository extends JpaRepository<Membership, Long> {
    Optional<Membership> findByUserIdAndGuildId(Long userId, Long guildId);
    List<Membership> findByGuildIdAndStatus(Long guildId, MembershipStatus status);
    boolean existsByUserIdAndGuildId(Long userId, Long guildId);
}

