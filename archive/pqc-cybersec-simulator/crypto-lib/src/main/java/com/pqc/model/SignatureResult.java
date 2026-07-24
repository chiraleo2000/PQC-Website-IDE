package com.pqc.model;

import lombok.Builder;
import lombok.Data;

/**
 * Result of a signature operation.
 */
@Data
@Builder
public class SignatureResult {
    private final byte[] signature;
    private final CryptoAlgorithm algorithm;
    private final int signatureSize;
    private final long executionTimeNanos;

    public static SignatureResult of(byte[] signature, CryptoAlgorithm algorithm, long executionTimeNanos) {
        return SignatureResult.builder()
                .signature(signature)
                .algorithm(algorithm)
                .signatureSize(signature != null ? signature.length : 0)
                .executionTimeNanos(executionTimeNanos)
                .build();
    }
}
