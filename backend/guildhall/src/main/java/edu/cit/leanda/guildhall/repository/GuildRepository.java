// GuildRepository.java
package edu.cit.leanda.guildhall.repository;
import edu.cit.leanda.guildhall.entity.Guild;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GuildRepository extends JpaRepository<Guild, Long> {
    Optional<Guild> findByName(String name);
}