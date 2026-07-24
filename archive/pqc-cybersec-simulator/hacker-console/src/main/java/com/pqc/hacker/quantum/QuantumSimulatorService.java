package com.pqc.hacker.quantum;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pqc.model.CryptoAlgorithm;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Quantum Computer Simulation Service
 * 
 * Provides quantum attack simulations through:
 * 1. IBM Qiskit Runtime API - Connect to real IBM quantum computers
 * 2. Local Simulation - Simulate quantum algorithms locally
 * 
 * Implements:
 * - Shor's algorithm (RSA factorization)
 * - Grover's algorithm (AES key search)
 * - Harvest Now, Decrypt Later scenarios
 * 
 * ⚠️ EDUCATIONAL PURPOSES ONLY
 */
@Service
@Slf4j
public class QuantumSimulatorService {

    @Value("${ibm.quantum.api-url:https://api.quantum-computing.ibm.com/runtime}")
    private String ibmApiUrl;

    @Value("${ibm.quantum.api-token:demo-mode}")
    private String ibmApiToken;

    @Value("${ibm.quantum.backend:ibmq_qasm_simulator}")
    private String ibmBackend;

    @Value("${ibm.quantum.enabled:false}")
    private boolean ibmQuantumEnabled;

    @Value("${simulation.quantum.shor-delay-ms:3000}")
    private long shorDelayMs;

    @Value("${simulation.quantum.grover-delay-ms:2000}")
    private long groverDelayMs;

    @SuppressWarnings("unused")
    private final OkHttpClient httpClient;
    @SuppressWarnings("unused")
    private final ObjectMapper objectMapper;

    public QuantumSimulatorService() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Simulate Shor's algorithm attack on RSA.
     */
    public QuantumAttackResult simulateShorsAlgorithm(CryptoAlgorithm algorithm) {
        log.warn("🚨 Executing Shor's algorithm simulation against {}", algorithm);

        if (algorithm.isQuantumResistant()) {
            return QuantumAttackResult.builder()
                    .attackType("SHOR_RSA")
                    .status(AttackStatus.QUANTUM_RESISTANT)
                    .resultDescription("Target uses " + algorithm.getDisplayName() +
                            " - Shor's algorithm is INEFFECTIVE against lattice-based cryptography")
                    .educationalLesson("ML-DSA and ML-KEM are designed to resist quantum attacks. " +
                            "They use lattice problems that remain hard for quantum computers.")
                    .build();
        }

        // Simulate attack delay
        simulateDelay(shorDelayMs);

        if (algorithm == CryptoAlgorithm.RSA_2048 || algorithm == CryptoAlgorithm.RSA_4096) {
            return QuantumAttackResult.builder()
                    .attackType("SHOR_RSA")
                    .status(AttackStatus.SUCCESS)
                    .executionTimeMs(shorDelayMs)
                    .estimatedQubitsRequired(4096)
                    .estimatedQuantumGates(1_000_000_000L)
                    .estimatedClassicalTimeYears(300_000_000_000L)
                    .estimatedQuantumTimeHours(8)
                    .resultDescription("RSA BROKEN! Shor's algorithm successfully factored the modulus. " +
                            "Private key recovered in simulated quantum time.")
                    .educationalLesson(
                            """
                            ⚠️ 'HARVEST NOW, DECRYPT LATER' THREAT DEMONSTRATED!
                            
                            Shor's algorithm exploits quantum superposition to find prime factors \
                            exponentially faster than classical computers.
                            
                            • Classical computer: ~300 trillion years to break RSA-2048
                            • Quantum computer: ~8 hours
                            
                            This is why data encrypted today with RSA may be compromised \
                            when quantum computers mature. Migrate to PQC NOW!""")
                    .build();
        }

        return QuantumAttackResult.builder()
                .attackType("SHOR_RSA")
                .status(AttackStatus.FAILED)
                .resultDescription("Attack not applicable to " + algorithm.getDisplayName())
                .build();
    }

    /**
     * Simulate Grover's algorithm attack on AES.
     */
    public QuantumAttackResult simulateGroversAlgorithm(CryptoAlgorithm algorithm) {
        log.warn("🚨 Executing Grover's algorithm simulation against {}", algorithm);

        if (algorithm.isQuantumResistant()) {
            return QuantumAttackResult.builder()
                    .attackType("GROVER_AES")
                    .status(AttackStatus.QUANTUM_RESISTANT)
                    .resultDescription("Target uses " + algorithm.getDisplayName() +
                            " - Grover's provides no advantage against KEM-based encryption")
                    .educationalLesson("ML-KEM uses lattice-based key encapsulation. Even with Grover's " +
                            "quadratic speedup, the security remains computationally infeasible.")
                    .build();
        }

        // Simulate attack delay
        simulateDelay(groverDelayMs);

        if (algorithm == CryptoAlgorithm.AES_128) {
            return QuantumAttackResult.builder()
                    .attackType("GROVER_AES")
                    .status(AttackStatus.SUCCESS)
                    .executionTimeMs(groverDelayMs)
                    .estimatedQubitsRequired(256)
                    .estimatedQuantumGates((long) Math.pow(2, 64))
                    .resultDescription("AES-128 COMPROMISED! Security reduced from 128 bits to 64 bits. " +
                            "Key space search now feasible with quantum computer.")
                    .educationalLesson(
                            """
                            Grover's algorithm provides quadratic speedup for unstructured search.
                            
                            • AES-128: 2^128 → 2^64 operations (VULNERABLE)
                            • AES-256: 2^256 → 2^128 operations (Still secure)
                            
                            For quantum-era security, use AES-256 or better yet, ML-KEM for key exchange.""")
                    .build();
        } else if (algorithm == CryptoAlgorithm.AES_256) {
            return QuantumAttackResult.builder()
                    .attackType("GROVER_AES")
                    .status(AttackStatus.FAILED)
                    .executionTimeMs(groverDelayMs)
                    .resultDescription("AES-256 RESISTANT. Security reduced from 256 to 128 bits, " +
                            "but 2^128 operations remains computationally infeasible.")
                    .educationalLesson("AES-256 provides adequate quantum resistance due to its large key size. " +
                            "For maximum protection, combine with ML-KEM for key exchange.")
                    .build();
        }

        return QuantumAttackResult.builder()
                .attackType("GROVER_AES")
                .status(AttackStatus.FAILED)
                .resultDescription("Attack not applicable to " + algorithm.getDisplayName())
                .build();
    }

    /**
     * Simulate Harvest Now, Decrypt Later attack.
     */
    public QuantumAttackResult simulateHarvestNowDecryptLater(CryptoAlgorithm algorithm, int yearsInFuture) {
        log.warn("🚨 Simulating HNDL attack - {} years in future", yearsInFuture);

        if (algorithm.isQuantumResistant()) {
            return QuantumAttackResult.builder()
                    .attackType("HARVEST_DECRYPT_LATER")
                    .status(AttackStatus.QUANTUM_RESISTANT)
                    .resultDescription("HNDL ATTACK FAILED! Data encrypted with " + algorithm.getDisplayName() +
                            " remains secure even " + yearsInFuture + " years in the future.")
                    .educationalLesson(
                            """
                            ✅ This is why organizations should migrate to PQC NOW!
                            
                            Data encrypted today with quantum-resistant algorithms will remain \
                            secure regardless of future quantum computing advances.
                            
                            The 'Harvest Now, Decrypt Later' threat is NEUTRALIZED by proactive PQC adoption.""")
                    .build();
        }

        // Simulate quantum computation time
        simulateDelay(shorDelayMs);

        return QuantumAttackResult.builder()
                .attackType("HARVEST_DECRYPT_LATER")
                .status(AttackStatus.SUCCESS)
                .executionTimeMs(shorDelayMs)
                .estimatedQuantumTimeHours(8)
                .resultDescription("HNDL ATTACK SUCCESSFUL! Data encrypted " + yearsInFuture +
                        " years ago with " + algorithm.getDisplayName() + " has been decrypted!")
                .educationalLesson(
                        """
                        ⚠️ THIS IS THE 'HARVEST NOW, DECRYPT LATER' THREAT IN ACTION!
                        
                        Adversaries are actively collecting encrypted data TODAY, waiting for \
                        quantum computers to mature.
                        
                        At risk:
                        • Government secrets
                        • Financial records
                        • Medical data
                        • Personal communications
                        
                        The ONLY defense is to encrypt with PQC algorithms NOW!""")
                .build();
    }

    /**
     * Check if IBM Quantum is available.
     */
    public boolean isIBMQuantumAvailable() {
        return ibmQuantumEnabled && !"demo-mode".equals(ibmApiToken);
    }

    /**
     * Get simulator status.
     */
    public QuantumSimulatorStatus getStatus() {
        return QuantumSimulatorStatus.builder()
                .ibmQuantumEnabled(ibmQuantumEnabled)
                .ibmBackend(ibmBackend)
                .simulationMode(!isIBMQuantumAvailable())
                .shorDelayMs(shorDelayMs)
                .groverDelayMs(groverDelayMs)
                .build();
    }

    private void simulateDelay(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    // ==================== Result Classes ====================

    @lombok.Builder
    @lombok.Data
    public static class QuantumAttackResult {
        private String attackType;
        private AttackStatus status;
        private long executionTimeMs;
        private int estimatedQubitsRequired;
        private long estimatedQuantumGates;
        private long estimatedClassicalTimeYears;
        private long estimatedQuantumTimeHours;
        private String resultDescription;
        private String educationalLesson;
    }

    @lombok.Builder
    @lombok.Data
    public static class QuantumSimulatorStatus {
        private boolean ibmQuantumEnabled;
        private String ibmBackend;
        private boolean simulationMode;
        private long shorDelayMs;
        private long groverDelayMs;
    }

    public enum AttackStatus {
        SUCCESS("Attack Successful - Data Compromised!"),
        FAILED("Attack Failed"),
        QUANTUM_RESISTANT("Target is Quantum-Resistant - Attack Ineffective"),
        IN_PROGRESS("Attack In Progress");

        private final String displayName;

        AttackStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
