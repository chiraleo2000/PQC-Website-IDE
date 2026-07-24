package com.pqc.hacker.entity;

import com.pqc.model.CryptoAlgorithm;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entity recording quantum attack attempts.
 */
@Entity
@Table(name = "attack_attempts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttackAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", unique = true, nullable = false)
    private String attemptId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "harvested_data_id")
    private HarvestedData harvestedData;

    @Enumerated(EnumType.STRING)
    @Column(name = "attack_type")
    private AttackType attackType;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_algorithm")
    private CryptoAlgorithm targetAlgorithm;

    @Enumerated(EnumType.STRING)
    private AttackStatus status;

    // Quantum resources
    @Column(name = "quantum_provider")
    private String quantumProvider;

    @Column(name = "qubits_used")
    private Integer qubitsUsed;

    @Column(name = "quantum_gates")
    private Long quantumGates;

    @Column(name = "shots_executed")
    private Integer shotsExecuted;

    // Timing
    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @Column(name = "classical_estimate_years")
    private Long classicalEstimateYears;

    @Column(name = "quantum_estimate_hours")
    private Long quantumEstimateHours;

    // Results
    @Column(name = "result_description", columnDefinition = "TEXT")
    private String resultDescription;

    @Column(name = "educational_note", columnDefinition = "TEXT")
    private String educationalNote;

    @Lob
    @Column(name = "recovered_data")
    private byte[] recoveredData;

    // Timestamps
    @CreationTimestamp
    @Column(name = "attempted_at", updatable = false)
    private LocalDateTime attemptedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * Types of quantum attacks.
     */
    public enum AttackType {
        SHOR_RSA("Shor's Algorithm - RSA Factorization"),
        SHOR_ECC("Shor's Algorithm - ECC Discrete Log"),
        GROVER_AES("Grover's Algorithm - AES Key Search"),
        GROVER_SHA("Grover's Algorithm - Hash Preimage"),
        TIMING_ANALYSIS("Timing Side-Channel Attack"),
        HARVEST_DECRYPT_LATER("Harvest Now, Decrypt Later Scenario");

        private final String displayName;

        AttackType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    /**
     * Attack status.
     */
    public enum AttackStatus {
        PENDING("Pending Execution"),
        IN_PROGRESS("Attack In Progress"),
        SUCCESS("Attack Successful - Data Compromised"),
        FAILED("Attack Failed - Algorithm Resistant"),
        TIMEOUT("Execution Timeout"),
        INSUFFICIENT_RESOURCES("Insufficient Quantum Resources");

        private final String displayName;

        AttackStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
