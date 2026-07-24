package com.pqc.hacker.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.pqc.model.CryptoAlgorithm;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entity representing intercepted/harvested encrypted data.
 * 
 * This stores data captured through network interception
 * for the "Harvest Now, Decrypt Later" (HNDL) demonstration.
 */
@Entity
@Table(name = "harvested_data")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class HarvestedData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "harvest_id", unique = true, nullable = false)
    private String harvestId;

    @Column(name = "source_service")
    private String sourceService;

    @Column(name = "target_id")
    private String targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type")
    private DataType dataType;

    // Captured encrypted content
    @Lob
    @Column(name = "encrypted_content")
    private byte[] encryptedContent;

    @Lob
    @Column(name = "encapsulated_key")
    private byte[] encapsulatedKey;

    @Lob
    private byte[] iv;

    @Lob
    @Column(name = "auth_tag")
    private byte[] authTag;

    // Algorithm information
    @Enumerated(EnumType.STRING)
    private CryptoAlgorithm algorithm;

    @Column(name = "algorithm_details")
    private String algorithmDetails;

    @Column(name = "is_quantum_resistant")
    private boolean isQuantumResistant;

    // Origin tracking
    @Column(name = "original_sender")
    private String originalSender;

    @Column(name = "intended_recipient")
    private String intendedRecipient;

    // Capture metadata
    @Column(columnDefinition = "TEXT")
    private String metadata;

    // Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private HarvestStatus status = HarvestStatus.HARVESTED;

    // Attack results
    @Lob
    @Column(name = "decrypted_content")
    private byte[] decryptedContent;

    @Column(name = "attack_type_used")
    private String attackTypeUsed;

    @Column(name = "quantum_provider")
    private String quantumProvider;

    @Column(name = "attack_duration_ms")
    private Long attackDurationMs;

    // Timestamps
    @CreationTimestamp
    @Column(name = "harvested_at", updatable = false)
    private LocalDateTime harvestedAt;

    @Column(name = "attack_attempted_at")
    private LocalDateTime attackAttemptedAt;

    @Column(name = "decrypted_at")
    private LocalDateTime decryptedAt;

    /**
     * Type of harvested data.
     */
    public enum DataType {
        MESSAGE("Encrypted Message"),
        DOCUMENT("Signed Document"),
        TRANSACTION("Transaction Data"),
        KEY_EXCHANGE("Key Exchange Data"),
        SIGNATURE("Digital Signature");

        private final String displayName;

        DataType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    /**
     * Status of harvested data in the HNDL attack lifecycle.
     */
    public enum HarvestStatus {
        HARVESTED("Data Captured - Awaiting Quantum Attack"),
        ATTACK_IN_PROGRESS("Quantum Attack In Progress"),
        DECRYPTED("Successfully Decrypted by Quantum Attack"),
        ATTACK_FAILED("Quantum Attack Failed"),
        QUANTUM_RESISTANT("Protected - Quantum Resistant Algorithm");

        private final String displayName;

        HarvestStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
