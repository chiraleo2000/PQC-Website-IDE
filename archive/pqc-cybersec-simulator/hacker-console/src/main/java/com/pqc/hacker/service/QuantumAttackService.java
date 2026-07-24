package com.pqc.hacker.service;

import com.pqc.hacker.entity.AttackAttempt;
import com.pqc.hacker.entity.AttackAttempt.AttackStatus;
import com.pqc.hacker.entity.AttackAttempt.AttackType;
import com.pqc.hacker.entity.HarvestedData;
import com.pqc.hacker.entity.HarvestedData.HarvestStatus;
import com.pqc.hacker.quantum.QuantumProviderService;
import com.pqc.hacker.quantum.QuantumProviderService.JobStatus;
import com.pqc.hacker.quantum.QuantumProviderService.QuantumJobResult;
import com.pqc.hacker.repository.AttackAttemptRepository;
import com.pqc.hacker.repository.HarvestedDataRepository;
import com.pqc.model.CryptoAlgorithm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Quantum Attack Orchestration Service
 * 
 * Coordinates the full HNDL attack lifecycle:
 * 1. Harvest encrypted data from target services
 * 2. Analyze algorithms used
 * 3. Execute appropriate quantum attack
 * 4. Store and report results
 * 
 * ⚠️ EDUCATIONAL PURPOSES ONLY
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class QuantumAttackService {

    private final InterceptionService interceptionService;
    private final QuantumProviderService quantumProviderService;
    private final HarvestedDataRepository harvestedDataRepository;
    private final AttackAttemptRepository attackAttemptRepository;

    /**
     * Execute full "Harvest Now, Decrypt Later" scenario.
     * 
     * This demonstrates the complete HNDL attack:
     * 1. Intercept target data
     * 2. Determine vulnerability
     * 3. Execute quantum attack
     * 4. Report results with educational context
     */
    @Transactional
    public HNDLAttackResult executeHNDLScenario(String targetId, String targetType) {
        log.warn("🚨 EXECUTING HNDL SCENARIO on {} {}", targetType, targetId);

        // Step 1: Harvest the data
        InterceptionService.InterceptionResult interception;
        if ("MESSAGE".equalsIgnoreCase(targetType)) {
            interception = interceptionService.interceptMessage(targetId);
        } else {
            interception = interceptionService.interceptDocument(targetId);
        }

        if (!interception.isSuccess()) {
            return HNDLAttackResult.builder()
                    .success(false)
                    .phase("INTERCEPTION")
                    .message("Failed to intercept target: " + interception.getMessage())
                    .build();
        }

        // Step 2: Check if quantum-resistant
        if (interception.isQuantumResistant()) {
            return HNDLAttackResult.builder()
                    .success(false)
                    .phase("ANALYSIS")
                    .harvestId(interception.getHarvestId())
                    .algorithm(interception.getAlgorithm())
                    .isQuantumResistant(true)
                    .message("Target uses QUANTUM-RESISTANT algorithm (" +
                            interception.getAlgorithm() + "). Attack would FAIL.")
                    .educationalNote(getQuantumResistantEducation())
                    .build();
        }

        // Step 3: Execute quantum attack
        HarvestedData harvested = harvestedDataRepository
                .findByHarvestId(interception.getHarvestId())
                .orElseThrow();

        AttackAttempt attack = executeQuantumAttack(harvested);

        // Step 4: Return results
        return HNDLAttackResult.builder()
                .success(attack.getStatus() == AttackStatus.SUCCESS)
                .phase("QUANTUM_ATTACK")
                .harvestId(interception.getHarvestId())
                .attemptId(attack.getAttemptId())
                .algorithm(interception.getAlgorithm())
                .isQuantumResistant(false)
                .attackType(attack.getAttackType())
                .quantumProvider(attack.getQuantumProvider())
                .qubitsUsed(attack.getQubitsUsed())
                .executionTimeMs(attack.getExecutionTimeMs())
                .classicalTimeYears(attack.getClassicalEstimateYears())
                .quantumTimeHours(attack.getQuantumEstimateHours())
                .message(attack.getResultDescription())
                .educationalNote(attack.getEducationalNote())
                .build();
    }

    /**
     * Execute Shor's algorithm attack on RSA-encrypted data.
     */
    @Transactional
    public AttackAttempt executeShorAttack(String harvestId) {
        log.warn("🚨 SHOR'S ATTACK on harvest {}", harvestId);

        HarvestedData harvested = harvestedDataRepository.findByHarvestId(harvestId)
                .orElseThrow(() -> new IllegalArgumentException("Harvest not found: " + harvestId));

        if (harvested.getAlgorithm() != CryptoAlgorithm.RSA_2048) {
            throw new IllegalArgumentException("Shor's algorithm only applies to RSA encryption");
        }

        return executeShorAttackInternal(harvested);
    }

    /**
     * Execute Grover's algorithm attack on AES-encrypted data.
     */
    @Transactional
    public AttackAttempt executeGroverAttack(String harvestId) {
        log.warn("🚨 GROVER'S ATTACK on harvest {}", harvestId);

        HarvestedData harvested = harvestedDataRepository.findByHarvestId(harvestId)
                .orElseThrow(() -> new IllegalArgumentException("Harvest not found: " + harvestId));

        CryptoAlgorithm algo = harvested.getAlgorithm();
        if (algo != CryptoAlgorithm.AES_128 && algo != CryptoAlgorithm.AES_256) {
            throw new IllegalArgumentException("Grover's algorithm only applies to AES encryption");
        }

        return executeGroverAttackInternal(harvested);
    }

    /**
     * Attack all vulnerable harvested data.
     */
    @Transactional
    public List<AttackAttempt> attackAllVulnerable() {
        log.warn("🚨 BULK QUANTUM ATTACK on all vulnerable data");

        List<HarvestedData> vulnerable = harvestedDataRepository.findPendingQuantumAttacks();

        return vulnerable.stream()
                .map(this::executeQuantumAttack)
                .toList();
    }

    /**
     * Get attack history.
     */
    @Transactional(readOnly = true)
    public List<AttackAttempt> getAttackHistory() {
        return attackAttemptRepository.findTop10ByOrderByAttemptedAtDesc();
    }

    /**
     * Get attack statistics.
     */
    public AttackStatistics getStatistics() {
        long total = attackAttemptRepository.count();
        long success = attackAttemptRepository.countByStatus(AttackStatus.SUCCESS);
        long failed = attackAttemptRepository.countByStatus(AttackStatus.FAILED);

        InterceptionService.HarvestStatistics harvestStats = interceptionService.getStatistics();

        return AttackStatistics.builder()
                .totalAttacks(total)
                .successfulAttacks(success)
                .failedAttacks(failed)
                .successRate(total > 0 ? (double) success / total * 100 : 0)
                .totalHarvested(harvestStats.getTotalHarvested())
                .vulnerableData(harvestStats.getQuantumVulnerable())
                .protectedData(harvestStats.getQuantumResistant())
                .build();
    }

    // ==================== Internal Attack Execution ====================

    private AttackAttempt executeQuantumAttack(HarvestedData harvested) {
        CryptoAlgorithm algo = harvested.getAlgorithm();

        if (algo == CryptoAlgorithm.RSA_2048) {
            return executeShorAttackInternal(harvested);
        } else if (algo == CryptoAlgorithm.AES_128 || algo == CryptoAlgorithm.AES_256) {
            return executeGroverAttackInternal(harvested);
        } else if (algo == CryptoAlgorithm.ML_DSA || algo == CryptoAlgorithm.ML_KEM) {
            // Quantum-resistant - attack will fail
            return createFailedAttack(harvested, "Target uses quantum-resistant algorithm");
        } else {
            return createFailedAttack(harvested, "Unknown algorithm: " + algo);
        }
    }

    private AttackAttempt executeShorAttackInternal(HarvestedData harvested) {
        harvested.setStatus(HarvestStatus.ATTACK_IN_PROGRESS);
        harvested.setAttackAttemptedAt(LocalDateTime.now());
        harvestedDataRepository.save(harvested);

        QuantumJobResult result = quantumProviderService.executeShorAlgorithm(
                harvested.getEncryptedContent(), 2048);

        AttackAttempt attack = AttackAttempt.builder()
                .attemptId("ATK-" + System.currentTimeMillis())
                .harvestedData(harvested)
                .attackType(AttackType.SHOR_RSA)
                .targetAlgorithm(CryptoAlgorithm.RSA_2048)
                .status(mapJobStatus(result.getStatus()))
                .quantumProvider(result.getProvider())
                .qubitsUsed(result.getQubitsUsed())
                .quantumGates(result.getQuantumGatesEstimate())
                .shotsExecuted(result.getShotsExecuted())
                .executionTimeMs(result.getExecutionTimeMs())
                .classicalEstimateYears(result.getClassicalTimeEstimateYears())
                .quantumEstimateHours(result.getQuantumTimeEstimateHours())
                .resultDescription(result.getResultDescription())
                .educationalNote(result.getEducationalNote())
                .recoveredData(result.getRecoveredPlaintext())
                .completedAt(LocalDateTime.now())
                .build();

        // Update harvest status
        if (result.getStatus() == JobStatus.SUCCESS) {
            harvested.setStatus(HarvestStatus.DECRYPTED);
            harvested.setDecryptedAt(LocalDateTime.now());
            harvested.setDecryptedContent(result.getRecoveredPlaintext());
        } else {
            harvested.setStatus(HarvestStatus.ATTACK_FAILED);
        }
        harvested.setQuantumProvider(result.getProvider());
        harvested.setAttackDurationMs(result.getExecutionTimeMs());
        harvestedDataRepository.save(harvested);

        return attackAttemptRepository.save(attack);
    }

    private AttackAttempt executeGroverAttackInternal(HarvestedData harvested) {
        int keyBits = harvested.getAlgorithm() == CryptoAlgorithm.AES_128 ? 128 : 256;

        harvested.setStatus(HarvestStatus.ATTACK_IN_PROGRESS);
        harvested.setAttackAttemptedAt(LocalDateTime.now());
        harvestedDataRepository.save(harvested);

        QuantumJobResult result = quantumProviderService.executeGroverAlgorithm(
                harvested.getEncryptedContent(), keyBits);

        AttackAttempt attack = AttackAttempt.builder()
                .attemptId("ATK-" + System.currentTimeMillis())
                .harvestedData(harvested)
                .attackType(AttackType.GROVER_AES)
                .targetAlgorithm(harvested.getAlgorithm())
                .status(mapJobStatus(result.getStatus()))
                .quantumProvider(result.getProvider())
                .qubitsUsed(result.getQubitsUsed())
                .executionTimeMs(result.getExecutionTimeMs())
                .resultDescription(result.getResultDescription())
                .educationalNote(result.getEducationalNote())
                .completedAt(LocalDateTime.now())
                .build();

        // Grover's typically doesn't fully break AES-256
        if (keyBits == 128 && result.getStatus() == JobStatus.SUCCESS) {
            harvested.setStatus(HarvestStatus.DECRYPTED);
        } else {
            harvested.setStatus(HarvestStatus.ATTACK_FAILED);
        }
        harvestedDataRepository.save(harvested);

        return attackAttemptRepository.save(attack);
    }

    private AttackAttempt createFailedAttack(HarvestedData harvested, String reason) {
        harvested.setStatus(HarvestStatus.QUANTUM_RESISTANT);
        harvestedDataRepository.save(harvested);

        AttackAttempt attack = AttackAttempt.builder()
                .attemptId("ATK-" + System.currentTimeMillis())
                .harvestedData(harvested)
                .attackType(AttackType.HARVEST_DECRYPT_LATER)
                .targetAlgorithm(harvested.getAlgorithm())
                .status(AttackStatus.FAILED)
                .resultDescription(reason)
                .educationalNote(getQuantumResistantEducation())
                .completedAt(LocalDateTime.now())
                .build();

        return attackAttemptRepository.save(attack);
    }

    private AttackStatus mapJobStatus(JobStatus jobStatus) {
        return switch (jobStatus) {
            case SUCCESS -> AttackStatus.SUCCESS;
            case PARTIAL -> AttackStatus.SUCCESS;
            case QUANTUM_RESISTANT -> AttackStatus.FAILED;
            case INSUFFICIENT_QUBITS -> AttackStatus.INSUFFICIENT_RESOURCES;
            case TIMEOUT -> AttackStatus.TIMEOUT;
            default -> AttackStatus.FAILED;
        };
    }

    private String getQuantumResistantEducation() {
        return """
                📚 POST-QUANTUM CRYPTOGRAPHY SUCCESS!

                The target data is protected by quantum-resistant algorithms:

                • ML-DSA (CRYSTALS-Dilithium): Based on lattice problems
                • ML-KEM (CRYSTALS-Kyber): Based on module learning with errors

                These algorithms are designed to resist BOTH:
                ✅ Classical computer attacks
                ✅ Quantum computer attacks (Shor's and Grover's algorithms)

                Key insight: Organizations that have already migrated to PQC are
                PROTECTED from the "Harvest Now, Decrypt Later" threat!

                🛡️ This is why NIST standardized these algorithms in August 2024.
                """;
    }

    // ==================== Result Classes ====================

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class HNDLAttackResult {
        private boolean success;
        private String phase;
        private String harvestId;
        private String attemptId;
        private CryptoAlgorithm algorithm;
        private boolean isQuantumResistant;
        private AttackType attackType;
        private String quantumProvider;
        private Integer qubitsUsed;
        private Long executionTimeMs;
        private Long classicalTimeYears;
        private Long quantumTimeHours;
        private String message;
        private String educationalNote;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class AttackStatistics {
        private long totalAttacks;
        private long successfulAttacks;
        private long failedAttacks;
        private double successRate;
        private long totalHarvested;
        private long vulnerableData;
        private long protectedData;
    }
}
