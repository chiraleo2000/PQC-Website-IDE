package com.pqc.model;

import lombok.Builder;
import lombok.Data;

/**
 * Result of an AES encryption operation.
 * Contains ciphertext, IV, and authentication tag.
 */
@Data
@Builder
public class EncryptionResult {
    private final byte[] ciphertext;
    private final byte[] iv; // Initialization Vector (12 bytes for GCM)
    private final byte[] authTag; // Authentication Tag (16 bytes for GCM)
    private final CryptoAlgorithm algorithm;

    /**
     * Get combined output (ciphertext includes auth tag in GCM mode).
     * Format: IV (12 bytes) + Ciphertext + AuthTag
     */
    public byte[] getCombinedOutput() {
        byte[] combined = new byte[iv.length + ciphertext.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
        return combined;
    }

    public static EncryptionResult of(byte[] ciphertext, byte[] iv, CryptoAlgorithm algorithm) {
        return EncryptionResult.builder()
                .ciphertext(ciphertext)
                .iv(iv)
                .algorithm(algorithm)
                .build();
    }
}
