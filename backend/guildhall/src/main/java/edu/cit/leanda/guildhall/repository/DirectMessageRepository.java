// DirectMessageRepository.java
package edu.cit.leanda.guildhall.repository;

import edu.cit.leanda.guildhall.entity.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    List<DirectMessage> findByConversationIdOrderBySentAtAsc(Long conversationId);

    long countByConversationIdAndSenderIdNotAndIsReadFalse(Long conversationId, Long senderId);
}