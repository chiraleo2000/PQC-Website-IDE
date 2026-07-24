package com.pqc.messaging.controller;

import com.pqc.messaging.entity.Message;
import com.pqc.messaging.service.EncryptedMessagingService;
import com.pqc.model.CryptoAlgorithm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Messaging API Controller.
 */
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MessagingController {

    private final EncryptedMessagingService messagingService;

    /**
     * Register user keys.
     * POST /api/messages/keys
     */
    @PostMapping("/keys")
    public ResponseEntity<?> registerKeys(@RequestBody KeyRegistrationRequest request) {
        messagingService.registerUserKeys(
                request.userId(),
                Base64.getDecoder().decode(request.mlKemPublicKey()),
                Base64.getDecoder().decode(request.mlKemPrivateKey()),
                request.preferredAlgorithm() != null ? request.preferredAlgorithm() : CryptoAlgorithm.ML_KEM);

        return ResponseEntity.ok(Map.of(
                "status", "Keys registered",
                "userId", request.userId()));
    }

    /**
     * Send encrypted message.
     * POST /api/messages/send
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody SendMessageRequest request) {
        try {
            Message message = messagingService.sendMessage(
                    request.senderId(),
                    request.recipientId(),
                    request.subject(),
                    request.content(),
                    request.algorithm() != null ? request.algorithm() : CryptoAlgorithm.ML_KEM);

            return ResponseEntity.ok(Map.of(
                    "status", "Message sent",
                    "messageId", message.getMessageId(),
                    "algorithm", message.getEncryptionAlgorithm().name(),
                    "isQuantumResistant", message.getEncryptionAlgorithm().isQuantumResistant(),
                    "encryptedContentSize", message.getEncryptedContent().length));
        } catch (Exception e) {
            log.error("Failed to send message", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Decrypt message.
     * POST /api/messages/{messageId}/decrypt
     */
    @PostMapping("/{messageId}/decrypt")
    public ResponseEntity<?> decryptMessage(
            @PathVariable String messageId,
            @RequestBody DecryptRequest request) {
        try {
            var result = messagingService.decryptMessage(messageId, request.recipientId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to decrypt message", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get message by ID.
     * GET /api/messages/{messageId}
     */
    @GetMapping("/{messageId}")
    public ResponseEntity<?> getMessage(@PathVariable String messageId) {
        return messagingService.getMessage(messageId)
                .map(msg -> ResponseEntity.ok(toMessageResponse(msg)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get inbox.
     * GET /api/messages/inbox/{recipientId}
     */
    @GetMapping("/inbox/{recipientId}")
    public ResponseEntity<List<Map<String, Object>>> getInbox(@PathVariable String recipientId) {
        List<Map<String, Object>> messages = messagingService.getInbox(recipientId).stream()
                .map(this::toMessageResponse)
                .toList();
        return ResponseEntity.ok(messages);
    }

    /**
     * Get sent messages.
     * GET /api/messages/sent/{senderId}
     */
    @GetMapping("/sent/{senderId}")
    public ResponseEntity<List<Map<String, Object>>> getSent(@PathVariable String senderId) {
        List<Map<String, Object>> messages = messagingService.getSent(senderId).stream()
                .map(this::toMessageResponse)
                .toList();
        return ResponseEntity.ok(messages);
    }

    /**
     * Get all messages (admin endpoint - also accessible for HNDL demo).
     * GET /api/messages
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllMessages() {
        List<Map<String, Object>> messages = messagingService.getAllMessages().stream()
                .map(this::toMessageResponse)
                .toList();
        return ResponseEntity.ok(messages);
    }

    /**
     * Get harvested messages (for HNDL demo).
     * GET /api/messages/harvested
     */
    @GetMapping("/harvested")
    public ResponseEntity<List<Map<String, Object>>> getHarvestedMessages() {
        List<Map<String, Object>> messages = messagingService.getHarvestedMessages().stream()
                .map(this::toMessageResponse)
                .toList();
        return ResponseEntity.ok(messages);
    }

    /**
     * Mark message as harvested (for HNDL demo).
     * POST /api/messages/{messageId}/harvest
     */
    @PostMapping("/{messageId}/harvest")
    public ResponseEntity<?> harvestMessage(
            @PathVariable String messageId,
            @RequestBody HarvestRequest request) {
        try {
            Message message = messagingService.markAsHarvested(messageId, request.harvesterId());
            return ResponseEntity.ok(Map.of(
                    "status", "Message harvested for HNDL attack",
                    "messageId", messageId,
                    "algorithm", message.getEncryptionAlgorithm().name(),
                    "isQuantumResistant", message.getEncryptionAlgorithm().isQuantumResistant(),
                    "warning",
                    message.getEncryptionAlgorithm().isQuantumResistant()
                            ? "This message is PROTECTED by quantum-resistant encryption"
                            : "⚠️ This message is VULNERABLE to future quantum attacks!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> toMessageResponse(Message msg) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("messageId", msg.getMessageId());
        response.put("senderId", msg.getSenderId() != null ? msg.getSenderId() : "");
        response.put("recipientId", msg.getRecipientId() != null ? msg.getRecipientId() : "");
        response.put("subject", msg.getSubject() != null ? msg.getSubject() : "");
        response.put("encryptionAlgorithm", msg.getEncryptionAlgorithm().name());
        response.put("isQuantumResistant", msg.getEncryptionAlgorithm().isQuantumResistant());
        response.put("encryptedContent", Base64.getEncoder().encodeToString(msg.getEncryptedContent()));
        response.put("encapsulatedKey",
                msg.getEncapsulatedKey() != null ? Base64.getEncoder().encodeToString(msg.getEncapsulatedKey()) : "");
        response.put("iv", msg.getIv() != null ? Base64.getEncoder().encodeToString(msg.getIv()) : "");
        response.put("isRead", msg.isRead());
        response.put("isHarvested", msg.isHarvested());
        response.put("createdAt", msg.getCreatedAt() != null ? msg.getCreatedAt().toString() : "");
        return response;
    }

    // Request DTOs
    public record KeyRegistrationRequest(
            String userId,
            String mlKemPublicKey,
            String mlKemPrivateKey,
            CryptoAlgorithm preferredAlgorithm) {
    }

    public record SendMessageRequest(
            String senderId,
            String recipientId,
            String subject,
            String content,
            CryptoAlgorithm algorithm) {
    }

    public record DecryptRequest(String recipientId) {
    }

    public record HarvestRequest(String harvesterId) {
    }
}
