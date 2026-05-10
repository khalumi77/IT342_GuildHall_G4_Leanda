// GuildRepository.java
package edu.cit.leanda.guildhall.features.guild;
import edu.cit.leanda.guildhall.features.guild.Guild;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GuildRepository extends JpaRepository<Guild, Long> {
    Optional<Guild> findByName(String name);
}
