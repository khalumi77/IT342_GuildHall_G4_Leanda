// PaymentRepository.java
package edu.cit.leanda.guildhall.repository;
import edu.cit.leanda.guildhall.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByPaymongoSessionId(String paymongoSessionId);
    List<Payment> findByPayerId(Long payerId);
    Optional<Payment> findByQuestId(Long questId);
}