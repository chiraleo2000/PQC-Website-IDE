package com.pqc.model;

/**
 * Cryptographic algorithm types supported by the PQC system.
 * 
 * Extensibility: Add new algorithms by extending this enum and
 * implementing corresponding handlers in CryptoService.
 */
public enum CryptoAlgorithm {
    // Post-Quantum Cryptography (Quantum-Resistant)
    ML_DSA("ML-DSA (Dilithium)", true, "Digital Signature", "FIPS 204"),
    ML_KEM("ML-KEM (Kyber)", true, "Key Encapsulation", "FIPS 203"),
    SLH_DSA("SLH-DSA (SPHINCS+)", true, "Hash-Based Signature", "FIPS 205"),

    // Classical Cryptography (Quantum-Vulnerable)
    RSA_2048("RSA-2048", false, "Digital Signature", null),
    RSA_4096("RSA-4096", false, "Digital Signature", null),
    ECDSA_P256("ECDSA P-256", false, "Digital Signature", null),
    AES_128("AES-128-GCM", false, "Symmetric Encryption", null),
    AES_256("AES-256-GCM", false, "Symmetric Encryption", null);

    private final String displayName;
    private final boolean quantumResistant;
    private final String purpose;
    private final String fipsStandard;

    CryptoAlgorithm(String displayName, boolean quantumResistant, String purpose, String fipsStandard) {
        this.displayName = displayName;
        this.quantumResistant = quantumResistant;
        this.purpose = purpose;
        this.fipsStandard = fipsStandard;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isQuantumResistant() {
        return quantumResistant;
    }

    public String getPurpose() {
        return purpose;
    }

    public String getFipsStandard() {
        return fipsStandard;
    }

    /**
     * Get quantum threat assessment for this algorithm.
     */
    public String getQuantumThreatLevel() {
        if (quantumResistant) {
            return "IMMUNE - Lattice/hash-based, resistant to Shor's and Grover's algorithms";
        }
        return switch (this) {
            case RSA_2048, RSA_4096, ECDSA_P256 ->
                "CRITICAL - Vulnerable to Shor's algorithm (breaks in hours with quantum computer)";
            case AES_128 ->
                "HIGH - Grover's algorithm reduces security from 2^128 to 2^64";
            case AES_256 ->
                "MEDIUM - Grover's algorithm reduces security from 2^256 to 2^128 (still impractical)";
            default -> "UNKNOWN";
        };
    }

    /**
     * Check if this is a signature algorithm.
     */
    public boolean isSignatureAlgorithm() {
        return purpose.contains("Signature");
    }

    /**
     * Check if this is an encryption algorithm.
     */
    public boolean isEncryptionAlgorithm() {
        return purpose.contains("Encryption") || purpose.contains("Encapsulation");
    }
}
