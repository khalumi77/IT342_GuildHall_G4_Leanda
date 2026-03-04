package com.guildhall.backend.repository;

import com.guildhall.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByStripeSessionId(String sessionId);
}