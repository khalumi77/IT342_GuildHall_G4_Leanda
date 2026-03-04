package com.guildhall.backend.repository;

import com.guildhall.backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByQuestIdOrderBySentAtAsc(Long questId);
}