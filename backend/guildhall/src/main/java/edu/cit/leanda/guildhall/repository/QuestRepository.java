// QuestRepository.java
package edu.cit.leanda.guildhall.repository;
import edu.cit.leanda.guildhall.entity.Quest;
import edu.cit.leanda.guildhall.enums.QuestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;

public interface QuestRepository extends JpaRepository<Quest, Long>, JpaSpecificationExecutor<Quest> {
    List<Quest> findByGuildIdAndStatus(Long guildId, QuestStatus status);
    List<Quest> findByPosterId(Long posterId);
    List<Quest> findByHelperId(Long helperId);
}