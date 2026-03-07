// MessageRepository.java
package edu.cit.leanda.guildhall.repository;
import edu.cit.leanda.guildhall.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByQuestIdOrderBySentAtAsc(Long questId);
}