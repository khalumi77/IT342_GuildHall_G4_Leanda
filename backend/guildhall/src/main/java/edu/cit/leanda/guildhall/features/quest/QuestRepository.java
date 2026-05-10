// QuestRepository.java
package edu.cit.leanda.guildhall.features.quest;
import edu.cit.leanda.guildhall.features.quest.Quest;
import edu.cit.leanda.guildhall.features.quest.QuestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;

public interface QuestRepository extends JpaRepository<Quest, Long>, JpaSpecificationExecutor<Quest> {
    List<Quest> findByGuildId(Long guildId);
    // Keep the old one for places that still need it
    List<Quest> findByGuildIdAndStatus(Long guildId, QuestStatus status);
    List<Quest> findByPosterId(Long posterId);
    List<Quest> findByHelperId(Long helperId);
}
