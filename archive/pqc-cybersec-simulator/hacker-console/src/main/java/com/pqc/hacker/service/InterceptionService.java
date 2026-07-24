package com.pqc.hacker.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pqc.hacker.entity.HarvestedData;
import com.pqc.hacker.entity.HarvestedData.DataType;
import com.pqc.hacker.entity.HarvestedData.HarvestStatus;
import com.pqc.hacker.repository.HarvestedDataRepository;
import com.pqc.model.CryptoAlgorithm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;

/**
 * Network Interception Service
 * 
 * Simulates a malicious actor passively monitoring network traffic
 * between Document Service and Messaging Service to harvest encrypted data.
 * 
 * This demonstrates the "Harvest Now, Decrypt Later" (HNDL) threat:
 * - Attacker captures encrypted traffic today
 * - Stores it indefinitely
 * - Waits for quantum computers to break classical encryption
 * - Decrypts all historical data when quantum capability is available
 * 
 * ⚠️ EDUCATIONAL PURPOSES ONLY - Demonstrates cybersecurity concepts
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class InterceptionService {

    private final HarvestedDataRepository harvestedDataRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${target.user-service.url:http://localhost:8181}")
    private String userServiceUrl;

    @Value("${target.messaging-service.url:http://localhost:8182}")
    private String messagingServiceUrl;

    @Value("${interception.enabled:true}")
    private boolean interceptionEnabled;

    @Value("${interception.auto-harvest:false}")
    private boolean autoHarvest;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();

    /**
     * Intercept a specific document by ID.
     * Captures the signed document and its signature for later analysis.
     */
    public InterceptionResult interceptDocument(String documentId) {
        log.warn("🕵️ INTERCEPTION: Attempting to harvest document {}", documentId);

        try {
            // Simulate "sniffing" the document from the network
            Request request = new Request.Builder()
                    .url(userServiceUrl + "/api/documents/" + documentId)
                    .get()
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    JsonNode doc = objectMapper.readTree(response.body().string());

                    // Harvest the document data
                    HarvestedData harvested = HarvestedData.builder()
                            .harvestId(generateHarvestId())
                            .sourceService("USER_DOCUMENT_SERVICE")
                            .targetId(documentId)
                            .dataType(DataType.DOCUMENT)
                            .encryptedContent(getSignatureBytes(doc))
                            .algorithm(determineAlgorithm(doc))
                            .algorithmDetails(doc.path("signatureAlgorithmName").asText())
                            .isQuantumResistant(doc.path("signatureAlgorithm").asText().startsWith("ML_"))
                            .originalSender(doc.path("applicantUserId").asText())
                            .intendedRecipient(doc.path("signerUserId").asText())
                            .metadata(doc.toString())
                            .status(HarvestStatus.HARVESTED)
                            .harvestedAt(LocalDateTime.now())
                            .build();

                    harvestedDataRepository.save(harvested);

                    log.info("📦 HARVESTED: Document {} with {} signature",
                            documentId, harvested.getAlgorithm());

                    return InterceptionResult.builder()
                            .success(true)
                            .harvestId(harvested.getHarvestId())
                            .dataType(DataType.DOCUMENT)
                            .algorithm(harvested.getAlgorithm())
                            .isQuantumResistant(harvested.isQuantumResistant())
                            .message(buildInterceptionMessage(harvested))
                            .educationalNote(buildEducationalNote(harvested))
                            .build();
                } else {
                    return InterceptionResult.failure("Document not accessible: " + response.code());
                }
            }
        } catch (Exception e) {
            log.error("Interception failed", e);
            return InterceptionResult.failure("Interception failed: " + e.getMessage());
        }
    }

    /**
     * Intercept a specific message by ID.
     * Captures encrypted content and encapsulated keys for later quantum attack.
     */
    public InterceptionResult interceptMessage(String messageId) {
        log.warn("🕵️ INTERCEPTION: Attempting to harvest message {}", messageId);

        try {
            Request request = new Request.Builder()
                    .url(messagingServiceUrl + "/api/messages/" + messageId)
                    .get()
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    JsonNode msg = objectMapper.readTree(response.body().string());

                    HarvestedData harvested = HarvestedData.builder()
                            .harvestId(generateHarvestId())
                            .sourceService("MESSAGING_SERVICE")
                            .targetId(messageId)
                            .dataType(DataType.MESSAGE)
                            .encryptedContent(getEncryptedBytes(msg, "encryptedContent"))
                            .encapsulatedKey(getEncryptedBytes(msg, "encapsulatedKey"))
                            .iv(getEncryptedBytes(msg, "iv"))
                            .algorithm(determineAlgorithm(msg))
                            .algorithmDetails(msg.path("encryptionAlgorithm").asText())
                            .isQuantumResistant(msg.path("encryptionAlgorithm").asText().contains("ML_KEM"))
                            .originalSender(msg.path("senderId").asText())
                            .intendedRecipient(msg.path("recipientId").asText())
                            .metadata(msg.toString())
                            .status(HarvestStatus.HARVESTED)
                            .harvestedAt(LocalDateTime.now())
                            .build();

                    harvestedDataRepository.save(harvested);

                    log.info("📦 HARVESTED: Message {} with {} encryption",
                            messageId, harvested.getAlgorithm());

                    return InterceptionResult.builder()
                            .success(true)
                            .harvestId(harvested.getHarvestId())
                            .dataType(DataType.MESSAGE)
                            .algorithm(harvested.getAlgorithm())
                            .isQuantumResistant(harvested.isQuantumResistant())
                            .encryptedDataSize(
                                    harvested.getEncryptedContent() != null ? harvested.getEncryptedContent().length
                                            : 0)
                            .message(buildInterceptionMessage(harvested))
                            .educationalNote(buildEducationalNote(harvested))
                            .build();
                } else {
                    return InterceptionResult.failure("Message not accessible: " + response.code());
                }
            }
        } catch (Exception e) {
            log.error("Interception failed", e);
            return InterceptionResult.failure("Interception failed: " + e.getMessage());
        }
    }

    /**
     * Bulk harvest - scan for all available messages and documents.
     * Simulates mass surveillance and data collection.
     */
    public BulkHarvestResult bulkHarvestMessages() {
        log.warn("🕵️ BULK HARVEST: Scanning messaging service for targets...");

        int harvested = 0;
        int quantumVulnerable = 0;
        int quantumResistant = 0;

        try {
            // Get all messages from messaging service
            Request request = new Request.Builder()
                    .url(messagingServiceUrl + "/api/messages/harvested")
                    .get()
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    JsonNode messages = objectMapper.readTree(response.body().string());

                    if (messages.isArray()) {
                        for (JsonNode msg : messages) {
                            String msgId = msg.path("messageId").asText();
                            InterceptionResult result = interceptMessage(msgId);
                            if (result.isSuccess()) {
                                harvested++;
                                if (result.isQuantumResistant()) {
                                    quantumResistant++;
                                } else {
                                    quantumVulnerable++;
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Bulk harvest failed", e);
        }

        return BulkHarvestResult.builder()
                .totalHarvested(harvested)
                .quantumVulnerable(quantumVulnerable)
                .quantumResistant(quantumResistant)
                .timestamp(LocalDateTime.now())
                .message("Harvested %d messages: %d VULNERABLE to quantum attack, %d PROTECTED".formatted(
                        harvested, quantumVulnerable, quantumResistant))
                .build();
    }

    /**
     * Get all harvested data waiting for quantum decryption.
     */
    public List<HarvestedData> getHarvestedData() {
        return harvestedDataRepository.findAll();
    }

    /**
     * Get harvested data by status.
     */
    public List<HarvestedData> getHarvestedByStatus(HarvestStatus status) {
        return harvestedDataRepository.findByStatus(status);
    }

    /**
     * Get only quantum-vulnerable harvested data.
     */
    public List<HarvestedData> getQuantumVulnerableData() {
        return harvestedDataRepository.findByIsQuantumResistantFalse();
    }

    /**
     * Get harvest statistics.
     */
    public HarvestStatistics getStatistics() {
        long total = harvestedDataRepository.count();
        long vulnerable = harvestedDataRepository.countByIsQuantumResistantFalse();
        long decrypted = harvestedDataRepository.countByStatus(HarvestStatus.DECRYPTED);

        return HarvestStatistics.builder()
                .totalHarvested(total)
                .quantumVulnerable(vulnerable)
                .quantumResistant(total - vulnerable)
                .successfullyDecrypted(decrypted)
                .pendingDecryption(vulnerable - decrypted)
                .oldestHarvest(harvestedDataRepository.findOldestHarvestDate())
                .build();
    }

    /**
     * Scheduled task to automatically harvest (if enabled).
     */
    @Scheduled(fixedDelayString = "${interception.auto-harvest-interval:300000}")
    public void autoHarvestTask() {
        if (autoHarvest && interceptionEnabled) {
            log.info("🤖 AUTO-HARVEST: Scanning for new targets...");
            bulkHarvestMessages();
        }
    }

    // ==================== Helper Methods ====================

    private String generateHarvestId() {
        return "HRV-" + System.currentTimeMillis() + "-" +
                Long.toHexString(Double.doubleToLongBits(ThreadLocalRandom.current().nextDouble())).substring(0, 8);
    }

    private CryptoAlgorithm determineAlgorithm(JsonNode node) {
        String algoStr = node.path("signatureAlgorithm").asText(
                node.path("encryptionAlgorithm").asText("UNKNOWN"));
        try {
            return CryptoAlgorithm.valueOf(algoStr);
        } catch (IllegalArgumentException e) {
            return CryptoAlgorithm.AES_256; // Default fallback
        }
    }

    private byte[] getSignatureBytes(JsonNode doc) {
        String signature = doc.path("signature").asText();
        if (signature != null && !signature.isEmpty()) {
            try {
                return Base64.getDecoder().decode(signature);
            } catch (Exception e) {
                return signature.getBytes();
            }
        }
        return doc.path("content").asText().getBytes();
    }

    private byte[] getEncryptedBytes(JsonNode node, String field) {
        String value = node.path(field).asText();
        if (value != null && !value.isEmpty()) {
            try {
                return Base64.getDecoder().decode(value);
            } catch (Exception e) {
                return value.getBytes();
            }
        }
        return null;
    }

    private String buildInterceptionMessage(HarvestedData data) {
        if (data.isQuantumResistant()) {
            return String.format(
                    "⚠️ Data harvested but PROTECTED by %s (quantum-resistant). " +
                            "Quantum attack will FAIL. Data stored anyway for demonstration.",
                    data.getAlgorithm());
        } else {
            return String.format(
                    "🎯 CRITICAL: Data harvested using %s (QUANTUM VULNERABLE). " +
                            "Stored for future quantum decryption when quantum computers become available.",
                    data.getAlgorithm());
        }
    }

    private String buildEducationalNote(HarvestedData data) {
        if (data.isQuantumResistant()) {
            return """
                    📚 GOOD NEWS: This data uses Post-Quantum Cryptography!

                    The ML-DSA/ML-KEM algorithms are based on lattice problems that remain
                    computationally hard even for quantum computers. Shor's algorithm
                    cannot break them.

                    ✅ This data will remain secure indefinitely.
                    """;
        } else {
            return String.format("""
                    📚 WARNING: "Harvest Now, Decrypt Later" (HNDL) Attack Demonstrated!

                    This data was encrypted with %s, which is VULNERABLE to quantum attacks.

                    Timeline of threat:
                    • TODAY: Data intercepted and stored by attacker
                    • 2027-2035: Quantum computers reach cryptographic capability
                    • FUTURE: All stored data decrypted retroactively

                    ⚠️ Sensitive data encrypted today with RSA/classical AES may be
                    readable by adversaries within 5-15 years!

                    🛡️ SOLUTION: Migrate to ML-KEM and ML-DSA immediately.
                    """, data.getAlgorithm());
        }
    }

    // ==================== Result Classes ====================

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class InterceptionResult {
        private boolean success;
        private String harvestId;
        private DataType dataType;
        private CryptoAlgorithm algorithm;
        private boolean isQuantumResistant;
        private int encryptedDataSize;
        private String message;
        private String educationalNote;

        public static InterceptionResult failure(String message) {
            return InterceptionResult.builder()
                    .success(false)
                    .message(message)
                    .build();
        }
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class BulkHarvestResult {
        private int totalHarvested;
        private int quantumVulnerable;
        private int quantumResistant;
        private LocalDateTime timestamp;
        private String message;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class HarvestStatistics {
        private long totalHarvested;
        private long quantumVulnerable;
        private long quantumResistant;
        private long successfullyDecrypted;
        private long pendingDecryption;
        private LocalDateTime oldestHarvest;
    }
}
