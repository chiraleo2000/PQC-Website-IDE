package com.pqc.messaging.service;

import com.pqc.crypto.PqcCryptoService;
import com.pqc.messaging.entity.Message;
import com.pqc.messaging.repository.MessageRepository;
import com.pqc.model.CryptoAlgorithm;
import com.pqc.model.EncapsulationResult;
import com.pqc.model.EncryptionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Encrypted Messaging Service with ML-KEM and AES encryption.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EncryptedMessagingService {

    private final MessageRepository messageRepository;
    private final PqcCryptoService cryptoService = new PqcCryptoService();

    // Temporary key storage (in production, use proper key management)
    private final Map<String, KeyInfo> userKeys = new HashMap<>();

    /**
     * Register user keys for encryption.
     */
    public void registerUserKeys(String userId, byte[] mlKemPublicKey, byte[] mlKemPrivateKey,
            CryptoAlgorithm preferredAlgorithm) {
        userKeys.put(userId, new KeyInfo(mlKemPublicKey, mlKemPrivateKey, preferredAlgorithm));
        log.info("Registered encryption keys for user: {}", userId);
    }

    /**
     * Send an encrypted message.
     */
    @Transactional
    public Message sendMessage(String senderId, String recipientId, String subject, String content,
            CryptoAlgorithm algorithm) throws GeneralSecurityException {
        log.info("Sending encrypted message from {} to {} using {}", senderId, recipientId, algorithm);

        String messageId = cryptoService.hashSHA384AsString(
                senderId + recipientId + System.currentTimeMillis());

        byte[] encryptedContent;
        byte[] encapsulatedKey = null;
        byte[] iv = null;

        KeyInfo recipientKeys = userKeys.get(recipientId);

        if (algorithm == CryptoAlgorithm.ML_KEM && recipientKeys != null) {
            // Use ML-KEM hybrid encryption
            KeyPair keyPair = cryptoService.loadMLKEMKeyPair(
                    recipientKeys.publicKey(), recipientKeys.privateKey());

            EncapsulationResult encap = cryptoService.encapsulateMLKEM(keyPair.getPublic());
            EncryptionResult encrypt = cryptoService.encryptWithSharedSecret(
                    content.getBytes(), encap.getSharedSecret(), 256);

            encryptedContent = encrypt.getCiphertext();
            encapsulatedKey = encap.getEncapsulation();
            iv = encrypt.getIv();

            log.info("Message encrypted with ML-KEM + AES-256-GCM (QUANTUM-RESISTANT)");
        } else {
            // Fallback to AES-256 only
            byte[] key = cryptoService.hashSHA384((senderId + recipientId).getBytes());
            EncryptionResult encrypt = cryptoService.encryptWithSharedSecret(
                    content.getBytes(), Arrays.copyOf(key, 32), 256);

            encryptedContent = encrypt.getCiphertext();
            iv = encrypt.getIv();
            algorithm = CryptoAlgorithm.AES_256;

            log.warn("Message encrypted with AES-256 only (QUANTUM-VULNERABLE key exchange)");
        }

        Message message = Message.builder()
                .messageId(messageId)
                .senderId(senderId)
                .recipientId(recipientId)
                .subject(subject)
                .encryptedContent(encryptedContent)
                .encapsulatedKey(encapsulatedKey)
                .iv(iv)
                .encryptionAlgorithm(algorithm)
                .build();

        return messageRepository.save(message);
    }

    /**
     * Decrypt a message.
     */
    @Transactional
    public DecryptionResult decryptMessage(String messageId, String recipientId)
            throws GeneralSecurityException {
        Message message = messageRepository.findByMessageId(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));

        if (!message.getRecipientId().equals(recipientId)) {
            throw new SecurityException("Access denied - not the intended recipient");
        }

        KeyInfo recipientKeys = userKeys.get(recipientId);
        if (recipientKeys == null) {
            throw new IllegalStateException("Recipient keys not registered");
        }

        byte[] plaintext;

        if (message.getEncryptionAlgorithm() == CryptoAlgorithm.ML_KEM &&
                message.getEncapsulatedKey() != null) {
            // ML-KEM decryption
            KeyPair keyPair = cryptoService.loadMLKEMKeyPair(
                    recipientKeys.publicKey(), recipientKeys.privateKey());

            byte[] sharedSecret = cryptoService.decapsulateMLKEM(
                    message.getEncapsulatedKey(), keyPair.getPrivate());

            plaintext = cryptoService.decryptWithSharedSecret(
                    message.getEncryptedContent(), message.getIv(), sharedSecret, 256);

            log.info("Message decrypted with ML-KEM (QUANTUM-RESISTANT)");
        } else {
            // AES fallback decryption
            byte[] key = cryptoService.hashSHA384(
                    (message.getSenderId() + recipientId).getBytes());

            plaintext = cryptoService.decryptWithSharedSecret(
                    message.getEncryptedContent(),
                    message.getIv(),
                    Arrays.copyOf(key, 32),
                    256);

            log.info("Message decrypted with AES-256");
        }

        message.setRead(true);
        message.setDecrypted(true);
        message.setReadAt(LocalDateTime.now());
        messageRepository.save(message);

        return DecryptionResult.builder()
                .messageId(messageId)
                .plaintext(new String(plaintext))
                .algorithm(message.getEncryptionAlgorithm())
                .decryptedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Get messages for a recipient.
     */
    public List<Message> getInbox(String recipientId) {
        return messageRepository.findByRecipientId(recipientId);
    }

    /**
     * Get sent messages.
     */
    public List<Message> getSent(String senderId) {
        return messageRepository.findBySenderId(senderId);
    }

    /**
     * Get message by ID.
     */
    public Optional<Message> getMessage(String messageId) {
        return messageRepository.findByMessageId(messageId);
    }

    /**
     * Get all messages (for admin/hacker demo).
     */
    public List<Message> getAllMessages() {
        return messageRepository.findAll();
    }

    /**
     * Mark message as harvested (for HNDL demo).
     */
    @Transactional
    public Message markAsHarvested(String messageId, String harvesterId) {
        Message message = messageRepository.findByMessageId(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        message.setHarvested(true);
        message.setHarvestedAt(LocalDateTime.now());
        message.setHarvestedBy(harvesterId);

        log.warn("⚠️ MESSAGE HARVESTED: {} by {}", messageId, harvesterId);

        return messageRepository.save(message);
    }

    /**
     * Get harvested messages.
     */
    public List<Message> getHarvestedMessages() {
        return messageRepository.findByHarvestedTrue();
    }

    // Helper records
    private record KeyInfo(byte[] publicKey, byte[] privateKey, CryptoAlgorithm preferredAlgorithm) {
    }

    @lombok.Builder
    @lombok.Data
    public static class DecryptionResult {
        private String messageId;
        private String plaintext;
        private CryptoAlgorithm algorithm;
        private LocalDateTime decryptedAt;
    }
}
