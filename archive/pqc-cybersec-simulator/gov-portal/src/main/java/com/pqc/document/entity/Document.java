package com.pqc.document.entity;

import com.pqc.model.CryptoAlgorithm;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Document entity for licenses, permits, and applications.
 */
@Entity
@Table(name = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", unique = true, nullable = false, length = 128)
    private String documentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private DocumentType documentType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_id")
    private User applicant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signer_id")
    private User signer;

    // Encryption Algorithm (for key encapsulation: RSA, ML-KEM)
    @Enumerated(EnumType.STRING)
    @Column(name = "encryption_algorithm")
    private CryptoAlgorithm encryptionAlgorithm;

    // Signature
    @Column(columnDefinition = "bytea")
    private byte[] signature;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_algorithm")
    private CryptoAlgorithm signatureAlgorithm;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    // Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DocumentStatus status = DocumentStatus.DRAFT;

    // Timestamps
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /**
     * Document types.
     */
    public enum DocumentType {
        LICENSE("Driver's License"),
        PERMIT("Permit Application"),
        HOUSING("Housing Application"),
        REGISTRATION("Registration Form"),
        CERTIFICATE("Digital Certificate"),
        CONTRACT("Contract"),
        ID_CARD("Identity Card"),
        PASSPORT("Passport Application");

        private final String displayName;

        DocumentType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    /**
     * Document status.
     */
    public enum DocumentStatus {
        DRAFT("Draft"),
        PENDING("Pending Review"),
        SIGNED("Digitally Signed"),
        APPROVED("Approved"),
        REJECTED("Rejected"),
        EXPIRED("Expired"),
        REVOKED("Revoked");

        private final String displayName;

        DocumentStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
