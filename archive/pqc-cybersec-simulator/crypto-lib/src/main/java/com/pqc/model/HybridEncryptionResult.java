package com.pqc.model;

import lombok.Builder;
import lombok.Data;

/**
 * Result of hybrid encryption following industry best practices:
 * 
 * REALISTIC WEB SERVICE ENCRYPTION:
 * 1. KEM Algorithm (RSA or ML-KEM) encapsulates a random AES-256 key
 * 2. AES-256-GCM encrypts the bulk data (files, documents, messages)
 * 3. This provides both speed (AES for data) and security (asymmetric for key exchange)
 * 
 * This is how TLS, Signal, WhatsApp, and enterprise systems work:
 * - RSA/ECDH/ML-KEM for key establishment
 * - AES-256 for bulk data encryption
 * - Separate digital signature for authentication/integrity
 */
@Data
@Builder
public class HybridEncryptionResult {
    
    /**
     * The encapsulated AES key (encrypted using RSA or ML-KEM).
     * Only the recipient with the private key can decrypt this.
     */
    private byte[] encapsulatedKey;
    
    /**
     * The AES-256-GCM encrypted ciphertext (the actual data).
     * Much faster than asymmetric encryption for large data.
     */
    private byte[] ciphertext;
    
    /**
     * The AES-GCM IV (Initialization Vector).
     * Required for decryption.
     */
    private byte[] iv;
    
    /**
     * The KEM algorithm used for key encapsulation.
     * RSA-2048 (classical, vulnerable) or ML-KEM-768 (quantum-safe)
     */
    private CryptoAlgorithm kemAlgorithm;
    
    /**
     * The symmetric algorithm used for bulk encryption.
     * Always AES-256-GCM in production.
     */
    private CryptoAlgorithm symmetricAlgorithm;
    
    /**
     * The digital signature over the encrypted package.
     * Signs: kemAlgorithm || encapsulatedKey || iv || ciphertext
     */
    private byte[] signature;
    
    /**
     * The signature algorithm used.
     * RSA-2048 (classical, vulnerable) or ML-DSA-65 (quantum-safe)
     */
    private CryptoAlgorithm signatureAlgorithm;
    
    /**
     * Time taken for encryption (nanoseconds).
     */
    private long encryptionTimeNanos;
    
    /**
     * Time taken for signing (nanoseconds).
     */
    private long signingTimeNanos;
    
    /**
     * Get security assessment based on algorithms used.
     */
    public SecurityAssessment getSecurityAssessment() {
        boolean kemSafe = kemAlgorithm != null && kemAlgorithm.isQuantumResistant();
        boolean sigSafe = signatureAlgorithm != null && signatureAlgorithm.isQuantumResistant();
        
        if (kemSafe && sigSafe) {
            return SecurityAssessment.FULLY_QUANTUM_SAFE;
        } else if (!kemSafe && !sigSafe) {
            return SecurityAssessment.FULLY_VULNERABLE;
        } else if (!kemSafe) {
            return SecurityAssessment.ENCRYPTION_VULNERABLE;
        } else {
            return SecurityAssessment.SIGNATURE_VULNERABLE;
        }
    }
    
    /**
     * Security assessment for quantum threats.
     */
    public enum SecurityAssessment {
        FULLY_QUANTUM_SAFE("Both encryption and signature are quantum-resistant"),
        FULLY_VULNERABLE("Both encryption and signature are vulnerable to quantum attacks"),
        ENCRYPTION_VULNERABLE("Key exchange can be broken, data exposed"),
        SIGNATURE_VULNERABLE("Signature can be forged, authenticity compromised");
        
        private final String description;
        
        SecurityAssessment(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * Factory method for creating result.
     */
    public static HybridEncryptionResult of(
            byte[] encapsulatedKey,
            byte[] ciphertext,
            byte[] iv,
            CryptoAlgorithm kemAlgorithm,
            byte[] signature,
            CryptoAlgorithm signatureAlgorithm,
            long encryptionTimeNanos,
            long signingTimeNanos) {
        
        return HybridEncryptionResult.builder()
                .encapsulatedKey(encapsulatedKey)
                .ciphertext(ciphertext)
                .iv(iv)
                .kemAlgorithm(kemAlgorithm)
                .symmetricAlgorithm(CryptoAlgorithm.AES_256)
                .signature(signature)
                .signatureAlgorithm(signatureAlgorithm)
                .encryptionTimeNanos(encryptionTimeNanos)
                .signingTimeNanos(signingTimeNanos)
                .build();
    }
}
