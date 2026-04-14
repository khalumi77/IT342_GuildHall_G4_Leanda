// ConversationRepository.java
package edu.cit.leanda.guildhall.repository;

import edu.cit.leanda.guildhall.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /** Find the unique conversation between two users (order-independent). */
    @Query("SELECT c FROM Conversation c WHERE " +
           "(c.user1.id = :a AND c.user2.id = :b) OR " +
           "(c.user1.id = :b AND c.user2.id = :a)")
    Optional<Conversation> findBetween(@Param("a") Long userAId, @Param("b") Long userBId);

    /** All conversations a user participates in. */
    @Query("SELECT c FROM Conversation c WHERE c.user1.id = :uid OR c.user2.id = :uid")
    List<Conversation> findAllForUser(@Param("uid") Long userId);
}