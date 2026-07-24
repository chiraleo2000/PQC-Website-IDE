package com.pqc.messaging.repository;

import com.pqc.messaging.entity.Message;
import com.pqc.model.CryptoAlgorithm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Optional<Message> findByMessageId(String messageId);

    List<Message> findBySenderId(String senderId);

    List<Message> findByRecipientId(String recipientId);

    List<Message> findByRecipientIdAndReadFalse(String recipientId);

    List<Message> findByHarvestedTrue();

    List<Message> findByHarvestedFalse();

    List<Message> findByEncryptionAlgorithm(CryptoAlgorithm algorithm);

    long countByHarvestedTrue();
}
