package com.pqc.document.entity;

import com.pqc.model.CryptoAlgorithm;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * User entity with authentication and PQC key storage.
 */
@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false, length = 128)
    private String userId;

    @Column(unique = true, nullable = false, length = 100)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.CITIZEN;

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(length = 20)
    private String phone;

    // PQC Keys - ML-DSA (Dilithium)
    @Column(name = "ml_dsa_public_key", columnDefinition = "bytea")
    private byte[] mlDsaPublicKey;

    @Column(name = "ml_dsa_private_key", columnDefinition = "bytea")
    private byte[] mlDsaPrivateKey;

    // PQC Keys - ML-KEM (Kyber)
    @Column(name = "ml_kem_public_key", columnDefinition = "bytea")
    private byte[] mlKemPublicKey;

    @Column(name = "ml_kem_private_key", columnDefinition = "bytea")
    private byte[] mlKemPrivateKey;

    // Classical Keys - RSA (for fallback/demo)
    @Column(name = "rsa_public_key", columnDefinition = "bytea")
    private byte[] rsaPublicKey;

    @Column(name = "rsa_private_key", columnDefinition = "bytea")
    private byte[] rsaPrivateKey;

    // Algorithm preferences
    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_signature_algorithm")
    @Builder.Default
    private CryptoAlgorithm preferredSignatureAlgorithm = CryptoAlgorithm.ML_DSA;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_encryption_algorithm")
    @Builder.Default
    private CryptoAlgorithm preferredEncryptionAlgorithm = CryptoAlgorithm.ML_KEM;

    // Status
    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_verified")
    @Builder.Default
    private boolean verified = false;

    // Timestamps
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "key_generated_at")
    private LocalDateTime keyGeneratedAt;

    // OAuth 2.0 fields for social login
    @Column(name = "oauth2_provider", length = 50)
    private String oauth2Provider;

    @Column(name = "oauth2_provider_id", length = 200)
    private String oauth2ProviderId;

    /**
     * User roles with permissions.
     */
    public enum UserRole {
        ADMIN("Administrator", true, true, true),
        OFFICER("Government Officer", true, true, false),
        CITIZEN("Citizen", true, false, false);

        private final String displayName;
        private final boolean canSign;
        private final boolean canApprove;
        private final boolean canManageUsers;

        UserRole(String displayName, boolean canSign, boolean canApprove, boolean canManageUsers) {
            this.displayName = displayName;
            this.canSign = canSign;
            this.canApprove = canApprove;
            this.canManageUsers = canManageUsers;
        }

        public String getDisplayName() {
            return displayName;
        }

        public boolean canSign() {
            return canSign;
        }

        public boolean canApprove() {
            return canApprove;
        }

        public boolean canManageUsers() {
            return canManageUsers;
        }
    }
}
