package com.pqc.hacker.service;

import com.pqc.hacker.quantum.QuantumSimulatorService;
import com.pqc.hacker.quantum.QuantumSimulatorService.*;
import com.pqc.model.CryptoAlgorithm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Hacker Simulation Service
 * 
 * ⚠️ EDUCATIONAL PURPOSES ONLY
 * 
 * Simulates various quantum and classical attacks to demonstrate
 * the importance of Post-Quantum Cryptography.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AttackSimulationService {

    private final QuantumSimulatorService quantumSimulator;

    // Attack history storage
    private final Map<String, AttackRecord> attackHistory = new ConcurrentHashMap<>();
    private final Map<String, HarvestedData> harvestedData = new ConcurrentHashMap<>();

    /**
     * Intercept/harvest encrypted data for later decryption.
     */
    public InterceptionResult interceptData(String dataId, byte[] encryptedData,
            CryptoAlgorithm algorithm) {
        log.warn("🚨 HACKER: Intercepting data ID: {}", dataId);

        harvestedData.put(dataId, HarvestedData.builder()
                .dataId(dataId)
                .encryptedData(encryptedData)
                .algorithm(algorithm)
                .harvestedAt(LocalDateTime.now())
                .build());

        String assessment = algorithm.isQuantumResistant()
                ? "⚠️ WARNING: Data is quantum-resistant. Future attacks will FAIL."
                : "✅ VULNERABLE: Data can be decrypted when quantum computers mature!";

        return InterceptionResult.builder()
                .success(true)
                .dataId(dataId)
                .dataSize(encryptedData.length)
                .algorithm(algorithm)
                .threatAssessment(assessment)
                .harvestedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Execute Shor's algorithm attack.
     */
    public AttackRecord executeShorsAttack(String targetId, CryptoAlgorithm algorithm) {
        log.warn("🚨 HACKER: Executing Shor's algorithm on target: {}", targetId);

        QuantumAttackResult result = quantumSimulator.simulateShorsAlgorithm(algorithm);

        AttackRecord record = AttackRecord.builder()
                .attackId(UUID.randomUUID().toString())
                .targetId(targetId)
                .attackType("SHOR_RSA")
                .targetAlgorithm(algorithm)
                .status(result.getStatus().name())
                .executionTimeMs(result.getExecutionTimeMs())
                .estimatedQubitsRequired(result.getEstimatedQubitsRequired())
                .estimatedQuantumGates(result.getEstimatedQuantumGates())
                .estimatedClassicalTimeYears(result.getEstimatedClassicalTimeYears())
                .estimatedQuantumTimeHours(result.getEstimatedQuantumTimeHours())
                .resultDescription(result.getResultDescription())
                .educationalLesson(result.getEducationalLesson())
                .attemptedAt(LocalDateTime.now())
                .build();

        attackHistory.put(record.getAttackId(), record);
        return record;
    }

    /**
     * Execute Grover's algorithm attack.
     */
    public AttackRecord executeGroversAttack(String targetId, CryptoAlgorithm algorithm) {
        log.warn("🚨 HACKER: Executing Grover's algorithm on target: {}", targetId);

        QuantumAttackResult result = quantumSimulator.simulateGroversAlgorithm(algorithm);

        AttackRecord record = AttackRecord.builder()
                .attackId(UUID.randomUUID().toString())
                .targetId(targetId)
                .attackType("GROVER_AES")
                .targetAlgorithm(algorithm)
                .status(result.getStatus().name())
                .executionTimeMs(result.getExecutionTimeMs())
                .estimatedQubitsRequired(result.getEstimatedQubitsRequired())
                .resultDescription(result.getResultDescription())
                .educationalLesson(result.getEducationalLesson())
                .attemptedAt(LocalDateTime.now())
                .build();

        attackHistory.put(record.getAttackId(), record);
        return record;
    }

    /**
     * Execute Harvest Now, Decrypt Later attack.
     */
    public AttackRecord executeHNDLAttack(String targetId, CryptoAlgorithm algorithm, int yearsInFuture) {
        log.warn("🚨 HACKER: Executing HNDL attack - {} years in future", yearsInFuture);

        QuantumAttackResult result = quantumSimulator.simulateHarvestNowDecryptLater(algorithm, yearsInFuture);

        AttackRecord record = AttackRecord.builder()
                .attackId(UUID.randomUUID().toString())
                .targetId(targetId)
                .attackType("HARVEST_DECRYPT_LATER")
                .targetAlgorithm(algorithm)
                .status(result.getStatus().name())
                .executionTimeMs(result.getExecutionTimeMs())
                .estimatedQuantumTimeHours(result.getEstimatedQuantumTimeHours())
                .resultDescription(result.getResultDescription())
                .educationalLesson(result.getEducationalLesson())
                .attemptedAt(LocalDateTime.now())
                .build();

        attackHistory.put(record.getAttackId(), record);
        return record;
    }

    /**
     * Get attack history.
     */
    public List<AttackRecord> getAttackHistory() {
        return new ArrayList<>(attackHistory.values());
    }

    /**
     * Get harvested data.
     */
    public List<HarvestedData> getHarvestedData() {
        return new ArrayList<>(harvestedData.values());
    }

    /**
     * Get attack statistics.
     */
    public AttackStatistics getStatistics() {
        long total = attackHistory.size();
        long successful = attackHistory.values().stream()
                .filter(a -> a.getStatus().equals("SUCCESS"))
                .count();
        long failed = attackHistory.values().stream()
                .filter(a -> a.getStatus().equals("FAILED") || a.getStatus().equals("QUANTUM_RESISTANT"))
                .count();
        long quantumResistant = attackHistory.values().stream()
                .filter(a -> a.getStatus().equals("QUANTUM_RESISTANT"))
                .count();

        return AttackStatistics.builder()
                .totalAttempts(total)
                .successfulAttacks(successful)
                .failedAttacks(failed)
                .quantumResistantTargets(quantumResistant)
                .harvestedDataCount(harvestedData.size())
                .build();
    }

    // ==================== Data Classes ====================

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class InterceptionResult {
        private boolean success;
        private String dataId;
        private int dataSize;
        private CryptoAlgorithm algorithm;
        private String threatAssessment;
        private LocalDateTime harvestedAt;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class HarvestedData {
        private String dataId;
        private byte[] encryptedData;
        private CryptoAlgorithm algorithm;
        private LocalDateTime harvestedAt;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class AttackRecord {
        private String attackId;
        private String targetId;
        private String attackType;
        private CryptoAlgorithm targetAlgorithm;
        private String status;
        private long executionTimeMs;
        private int estimatedQubitsRequired;
        private long estimatedQuantumGates;
        private long estimatedClassicalTimeYears;
        private long estimatedQuantumTimeHours;
        private String resultDescription;
        private String educationalLesson;
        private LocalDateTime attemptedAt;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class AttackStatistics {
        private long totalAttempts;
        private long successfulAttacks;
        private long failedAttacks;
        private long quantumResistantTargets;
        private long harvestedDataCount;
    }
}
