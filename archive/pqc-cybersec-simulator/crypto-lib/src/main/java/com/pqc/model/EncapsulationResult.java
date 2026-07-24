package com.pqc.model;

import lombok.Builder;
import lombok.Data;

/**
 * Result of a KEM encapsulation operation.
 * Contains the encapsulated key (ciphertext) and the shared secret.
 */
@Data
@Builder
public class EncapsulationResult {
    private final byte[] encapsulation; // Ciphertext to send to recipient
    private final byte[] sharedSecret; // Shared secret for symmetric encryption
    private final CryptoAlgorithm algorithm;
    private final int encapsulationSize;
    private final int sharedSecretSize;

    public static EncapsulationResult of(byte[] encapsulation, byte[] sharedSecret, CryptoAlgorithm algorithm) {
        return EncapsulationResult.builder()
                .encapsulation(encapsulation)
                .sharedSecret(sharedSecret)
                .algorithm(algorithm)
                .encapsulationSize(encapsulation != null ? encapsulation.length : 0)
                .sharedSecretSize(sharedSecret != null ? sharedSecret.length : 0)
                .build();
    }
}
