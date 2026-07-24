package com.pqc.model;

import lombok.Builder;
import lombok.Data;

/**
 * Result of a key pair generation operation.
 * Contains both public and private keys in encoded format.
 */
@Data
@Builder
public class KeyPairResult {
    private final byte[] publicKey;
    private final byte[] privateKey;
    private final CryptoAlgorithm algorithm;
    private final int publicKeySize;
    private final int privateKeySize;

    public static KeyPairResult of(byte[] publicKey, byte[] privateKey, CryptoAlgorithm algorithm) {
        return KeyPairResult.builder()
                .publicKey(publicKey)
                .privateKey(privateKey)
                .algorithm(algorithm)
                .publicKeySize(publicKey != null ? publicKey.length : 0)
                .privateKeySize(privateKey != null ? privateKey.length : 0)
                .build();
    }
}
