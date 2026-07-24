package com.pqc.hacker.intercept;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pqc.hacker.quantum.CuQuantumGpuSimulator;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Encrypted Data Harvester - HNDL Attack Simulation
 * 
 * This service demonstrates "Harvest Now, Decrypt Later" attacks:
 * 1. Intercepts encrypted transaction logs from the government portal
 * 2. Stores the encrypted data for later quantum decryption
 * 3. Uses cuQuantum GPU simulator to attempt cryptographic attacks
 * 
 * EDUCATIONAL PURPOSE: Shows why post-quantum cryptography is needed NOW
 */
@Service
@Slf4j
public class EncryptedDataHarvester {

    private static final String ML_KEM_UNDERSCORE = "ML_KEM";
    private static final String ML_KEM_HYPHEN = "ML-KEM";
    private static final String ML_DSA_UNDERSCORE = "ML_DSA";
    private static final String ML_DSA_HYPHEN = "ML-DSA";

    private final CuQuantumGpuSimulator quantumSimulator;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${hacker.target.gov-portal:http://localhost:8181}")
    private String govPortalUrl;

    @Value("${hacker.target.messaging:http://localhost:8182}")
    private String messagingUrl;

    // Harvested encrypted data storage (simulates attacker's database)
    private final List<InterceptedTransaction> harvestedData = Collections.synchronizedList(new ArrayList<>());

    public EncryptedDataHarvester(CuQuantumGpuSimulator quantumSimulator) {
        this.quantumSimulator = quantumSimulator;
        this.objectMapper = new ObjectMapper();
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build();
        log.warn("🕵️ Encrypted Data Harvester initialized - targeting {} and {}", govPortalUrl, messagingUrl);
    }

    /**
     * PHASE 1: HARVEST - Intercept encrypted transaction logs from the network
     */
    public InterceptionResult harvestTransactionLogs() {
        log.warn("🎯 HARVESTING: Intercepting encrypted transaction logs from network traffic...");
        
        InterceptionResult result = new InterceptionResult();
        result.setTimestamp(LocalDateTime.now());
        result.setTargetUrl(govPortalUrl + "/api/transactions");
        
        try {
            Request request = new Request.Builder()
                    .url(govPortalUrl + "/api/transactions")
                    .header("User-Agent", "Mozilla/5.0 (Network Interceptor)")
                    .header("X-Intercepted-By", "HNDL-Attack-Simulator")
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String rawJson = response.body().string();
                    List<Map<String, Object>> transactions = objectMapper.readValue(
                            rawJson, new TypeReference<List<Map<String, Object>>>() {});
                    
                    result.setRawDataCaptured(rawJson);
                    result.setTransactionCount(transactions.size());
                    
                    List<InterceptedTransaction> intercepted = new ArrayList<>();
                    
                    for (Map<String, Object> tx : transactions) {
                        InterceptedTransaction itx = new InterceptedTransaction();
                        itx.setDocumentId(String.valueOf(tx.get("documentId")));
                        itx.setDocumentType(String.valueOf(tx.get("type")));
                        itx.setApplicant(String.valueOf(tx.get("applicant")));
                        // Use the enum name for algorithm identification (RSA_2048, ML_KEM, ML_DSA, etc.)
                        itx.setEncryptionAlgorithm(String.valueOf(tx.get("encryptionAlgorithm")));
                        itx.setSignatureAlgorithm(String.valueOf(tx.get("signatureAlgorithm")));
                        itx.setStatus(String.valueOf(tx.get("status")));
                        itx.setInterceptedAt(LocalDateTime.now());
                        
                        // Simulate capturing encrypted payload (KEM ciphertext)
                        itx.setEncryptedPayload(generateSimulatedEncryptedData(itx.getEncryptionAlgorithm()));
                        
                        // Simulate capturing digital signature data
                        itx.setSignatureData(generateSimulatedSignatureData(itx.getSignatureAlgorithm()));
                        
                        // Extract encryption metadata for quantum attack
                        itx.setKeyMetadata(extractKeyMetadata(itx.getEncryptionAlgorithm()));
                        
                        // Extract signature metadata for quantum attack
                        itx.setSignatureKeyMetadata(extractKeyMetadata(itx.getSignatureAlgorithm()));
                        
                        intercepted.add(itx);
                        harvestedData.add(itx);
                    }
                    
                    result.setSuccess(true);
                    result.setInterceptedTransactions(intercepted);
                    result.setMessage(String.format(
                            "✅ HARVEST COMPLETE: Captured %d encrypted transactions. " +
                            "Data stored for quantum decryption attack.", 
                            intercepted.size()));
                    
                    log.warn("📦 HARVESTED {} encrypted transactions - stored for HNDL attack", intercepted.size());
                    
                } else {
                    result.setSuccess(false);
                    result.setMessage("Failed to intercept: HTTP " + response.code());
                }
            }
            
        } catch (Exception e) {
            result.setSuccess(false);
            result.setMessage("Interception failed: " + e.getMessage());
            log.error("Interception error", e);
        }
        
        return result;
    }

    /**
     * PHASE 2: ATTACK - Attempt quantum decryption AND signature forgery on harvested data
     */
    public QuantumAttackReport executeQuantumAttack() {
        log.warn("⚛️ QUANTUM ATTACK: Deploying Shor's algorithm against {} intercepted transactions", 
                harvestedData.size());
        
        QuantumAttackReport report = new QuantumAttackReport();
        report.setAttackStartTime(LocalDateTime.now());
        report.setGpuInfo(quantumSimulator.getGpuInfo());
        report.setTotalTargets(harvestedData.size());
        
        List<AttackResult> results = new ArrayList<>();
        int rsaEncryptionBroken = 0;
        int rsaSignatureForged = 0;
        int pqcEncryptionProtected = 0;
        int pqcSignatureProtected = 0;
        
        for (InterceptedTransaction tx : harvestedData) {
            // Attack ENCRYPTION algorithm
            AttackResult encryptionAttack = attackEncryption(tx);
            results.add(encryptionAttack);
            rsaEncryptionBroken += countBrokenEncryption(encryptionAttack);
            pqcEncryptionProtected += countPqcEncryptionProtected(encryptionAttack);
            
            // Attack SIGNATURE algorithm
            AttackResult signatureAttack = attackSignature(tx);
            results.add(signatureAttack);
            rsaSignatureForged += countForgedSignature(signatureAttack);
            pqcSignatureProtected += countPqcSignatureProtected(signatureAttack);
        }
        
        report.setAttackResults(results);
        report.setRsaKeysBroken(rsaEncryptionBroken);
        report.setRsaSignaturesForged(rsaSignatureForged);
        report.setPqcProtectedCount(pqcEncryptionProtected + pqcSignatureProtected);
        report.setAttackEndTime(LocalDateTime.now());
        
        // Generate attack summary
        int totalBroken = rsaEncryptionBroken + rsaSignatureForged;
        generateAttackSummary(report, totalBroken, rsaEncryptionBroken, rsaSignatureForged,
                pqcEncryptionProtected, pqcSignatureProtected);
        
        log.warn("📊 ATTACK COMPLETE: {} encryptions broken, {} signatures forged, {} PQC protected", 
                rsaEncryptionBroken, rsaSignatureForged, pqcEncryptionProtected + pqcSignatureProtected);
        
        return report;
    }

    private int countBrokenEncryption(AttackResult attack) {
        return attack.isDecrypted() ? 1 : 0;
    }

    private int countPqcEncryptionProtected(AttackResult attack) {
        return (!attack.isDecrypted() && (attack.getAlgorithm().contains(ML_KEM_UNDERSCORE)
                || attack.getAlgorithm().contains(ML_KEM_HYPHEN))) ? 1 : 0;
    }

    private int countForgedSignature(AttackResult attack) {
        return attack.isForged() ? 1 : 0;
    }

    private int countPqcSignatureProtected(AttackResult attack) {
        return (!attack.isForged() && (attack.getAlgorithm().contains(ML_DSA_UNDERSCORE)
                || attack.getAlgorithm().contains(ML_DSA_HYPHEN))) ? 1 : 0;
    }

    private void generateAttackSummary(QuantumAttackReport report, int totalBroken,
            int rsaEncryptionBroken, int rsaSignatureForged,
            int pqcEncryptionProtected, int pqcSignatureProtected) {
        if (totalBroken > 0) {
            StringBuilder sb = new StringBuilder("⚠️ CRITICAL: ");
            if (rsaEncryptionBroken > 0) {
                sb.append(rsaEncryptionBroken).append(" encryption(s) DECRYPTED! ");
            }
            if (rsaSignatureForged > 0) {
                sb.append(rsaSignatureForged).append(" signature(s) FORGED!");
            }
            report.setOverallResult(sb.toString());
            report.setSeverity("CRITICAL");
        } else if (pqcEncryptionProtected > 0 || pqcSignatureProtected > 0) {
            report.setOverallResult("🛡️ PROTECTED: All documents using Post-Quantum Cryptography remain secure");
            report.setSeverity("SECURE");
        } else {
            report.setOverallResult("⏳ PENDING: Insufficient quantum resources for attack");
            report.setSeverity("UNKNOWN");
        }
    }

    /**
     * Attack ENCRYPTION algorithm (Key Encapsulation)
     */
    private AttackResult attackEncryption(InterceptedTransaction tx) {
        AttackResult result = new AttackResult();
        result.setDocumentId(tx.getDocumentId());
        result.setDocumentType(tx.getDocumentType());
        result.setAlgorithm(tx.getEncryptionAlgorithm());
        result.setTargetType("ENCRYPTION");
        
        String algo = tx.getEncryptionAlgorithm().toUpperCase();
        
        if (algo.contains("RSA")) {
            int keyBits = algo.contains("4096") ? 4096 : 2048;
            BigInteger fakeModulus = generateFakeRsaModulus(keyBits);
            
            CuQuantumGpuSimulator.ShorsAttackResult shorsResult = 
                    quantumSimulator.simulateShorsAlgorithm(fakeModulus, keyBits);
            
            result.setDecrypted(shorsResult.isSuccess());
            result.setForged(false);
            result.setAttackType("Shor's Algorithm (RSA Decryption)");
            result.setQubitsUsed(shorsResult.getQubitsRequired());
            result.setAttackTimeMs(shorsResult.getExecutionTimeMs());
            result.setDetails(shorsResult.getMessage() + " | RSA private key RECOVERED!");
            
            if (shorsResult.isSuccess()) {
                result.setDecryptedPreview("🔓 [DECRYPTED] " + tx.getDocumentType() + " for " + tx.getApplicant());
            }
            
        } else if (algo.contains(ML_KEM_UNDERSCORE) || algo.contains(ML_KEM_HYPHEN) || algo.contains("KYBER")) {
            CuQuantumGpuSimulator.LatticeAttackResult latticeResult = 
                    quantumSimulator.simulateLatticeAttack(algo);
            
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Lattice Attack (BKZ)");
            result.setQubitsUsed(0);
            result.setAttackTimeMs(latticeResult.getExecutionTimeMs());
            result.setDetails("🛡️ " + latticeResult.getMessage());
            
        } else if (algo.contains("AES")) {
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Grover's Algorithm");
            result.setDetails("🛡️ AES-256 remains secure against quantum attacks.");
            
        } else {
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Unknown");
            result.setDetails("❓ No attack for: " + algo);
        }
        
        return result;
    }

    /**
     * Attack SIGNATURE algorithm (Digital Signature Forgery)
     */
    private AttackResult attackSignature(InterceptedTransaction tx) {
        AttackResult result = new AttackResult();
        result.setDocumentId(tx.getDocumentId());
        result.setDocumentType(tx.getDocumentType());
        result.setAlgorithm(tx.getSignatureAlgorithm());
        result.setTargetType("SIGNATURE");
        
        String algo = tx.getSignatureAlgorithm().toUpperCase();
        
        if (algo.contains("RSA")) {
            int keyBits = algo.contains("4096") ? 4096 : 2048;
            BigInteger fakeModulus = generateFakeRsaModulus(keyBits);
            
            CuQuantumGpuSimulator.ShorsAttackResult shorsResult = 
                    quantumSimulator.simulateShorsAlgorithm(fakeModulus, keyBits);
            
            result.setDecrypted(false);
            result.setForged(shorsResult.isSuccess());
            result.setAttackType("Shor's Algorithm (Signature Forgery)");
            result.setQubitsUsed(shorsResult.getQubitsRequired());
            result.setAttackTimeMs(shorsResult.getExecutionTimeMs());
            result.setDetails(shorsResult.getMessage() + " | Can FORGE any document!");
            
            if (shorsResult.isSuccess()) {
                result.setDecryptedPreview("✍️ [FORGED] Can create fake " + tx.getDocumentType());
            }
            
        } else if (algo.contains(ML_DSA_UNDERSCORE) || algo.contains(ML_DSA_HYPHEN) || algo.contains("DILITHIUM")) {
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Lattice Signature Attack");
            result.setDetails("🛡️ ML-DSA signatures CANNOT be forged by quantum computers!");
            
        } else if (algo.contains("SLH_DSA") || algo.contains("SPHINCS")) {
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Hash-Based Attack");
            result.setDetails("🛡️ SLH-DSA is hash-based and quantum-resistant!");
            
        } else if (algo.contains("ECDSA")) {
            result.setDecrypted(false);
            result.setForged(true);
            result.setAttackType("Shor's Algorithm (ECDSA)");
            result.setDetails("⚠️ ECDSA private key RECOVERED!");
            result.setDecryptedPreview("✍️ [FORGED] ECDSA signature compromised");
            
        } else {
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Unknown");
            result.setDetails("❓ No attack for signature: " + algo);
        }
        
        return result;
    }

    /**
     * Generate simulated encrypted data payload (KEM ciphertext)
     */
    private byte[] generateSimulatedEncryptedData(String algorithm) {
        // Generate realistic-looking encrypted data
        int size = algorithm.contains(ML_KEM_UNDERSCORE) || algorithm.contains(ML_KEM_HYPHEN) ? 1088 : 256;
        byte[] data = new byte[size];
        secureRandom.nextBytes(data);
        return data;
    }

    /**
     * Generate simulated digital signature data
     */
    private byte[] generateSimulatedSignatureData(String algorithm) {
        // ML-DSA signatures are ~3293 bytes, RSA-2048 is 256 bytes
        int size = algorithm.contains(ML_DSA_UNDERSCORE) || algorithm.contains(ML_DSA_HYPHEN) ? 3293 : 256;
        byte[] data = new byte[size];
        secureRandom.nextBytes(data);
        return data;
    }

    /**
     * Extract key metadata for attack planning
     */
    private KeyMetadata extractKeyMetadata(String algorithm) {
        KeyMetadata meta = new KeyMetadata();
        meta.setAlgorithm(algorithm);
        
        if (algorithm.contains("RSA-2048")) {
            meta.setKeySize(2048);
            meta.setQuantumVulnerable(true);
            meta.setEstimatedQubits(4099);  // 2*2048 + 3
            meta.setEstimatedAttackTime("~8 hours (future quantum computer)");
        } else if (algorithm.contains("RSA-4096")) {
            meta.setKeySize(4096);
            meta.setQuantumVulnerable(true);
            meta.setEstimatedQubits(8195);
            meta.setEstimatedAttackTime("~32 hours (future quantum computer)");
        } else if (algorithm.contains(ML_KEM_HYPHEN)) {
            meta.setKeySize(768);  // ML-KEM-768
            meta.setQuantumVulnerable(false);
            meta.setEstimatedQubits(0);
            meta.setEstimatedAttackTime("Infeasible (quantum-resistant)");
        } else if (algorithm.contains(ML_DSA_HYPHEN)) {
            meta.setKeySize(2048);
            meta.setQuantumVulnerable(false);
            meta.setEstimatedQubits(0);
            meta.setEstimatedAttackTime("Infeasible (quantum-resistant)");
        }
        
        return meta;
    }

    /**
     * Generate a fake RSA modulus for simulation
     */
    private BigInteger generateFakeRsaModulus(int bits) {
        // For simulation, generate a product of two primes
        BigInteger p = BigInteger.probablePrime(bits / 2, secureRandom);
        BigInteger q = BigInteger.probablePrime(bits / 2, secureRandom);
        return p.multiply(q);
    }

    /**
     * Get current harvested data count
     */
    public int getHarvestedCount() {
        return harvestedData.size();
    }

    /**
     * Clear harvested data
     */
    public void clearHarvestedData() {
        harvestedData.clear();
    }

    // ==================== Data Classes ====================

    @Data
    public static class InterceptionResult {
        private LocalDateTime timestamp;
        private String targetUrl;
        private boolean success;
        private String rawDataCaptured;
        private int transactionCount;
        private List<InterceptedTransaction> interceptedTransactions;
        private String message;
    }

    @Data
    public static class InterceptedTransaction {
        private String documentId;
        private String documentType;
        private String applicant;
        private String encryptionAlgorithm;
        private String signatureAlgorithm;
        private String status;
        private LocalDateTime interceptedAt;
        private byte[] encryptedPayload;
        private byte[] signatureData;
        private KeyMetadata keyMetadata;
        private KeyMetadata signatureKeyMetadata;
    }

    @Data
    public static class KeyMetadata {
        private String algorithm;
        private int keySize;
        private boolean quantumVulnerable;
        private int estimatedQubits;
        private String estimatedAttackTime;
    }

    @Data
    public static class QuantumAttackReport {
        private LocalDateTime attackStartTime;
        private LocalDateTime attackEndTime;
        private CuQuantumGpuSimulator.GpuInfo gpuInfo;
        private int totalTargets;
        private List<AttackResult> attackResults;
        private int rsaKeysBroken;           // Encryption keys broken
        private int rsaSignaturesForged;     // Signatures that can be forged
        private int pqcProtectedCount;
        private String overallResult;
        private String severity;
    }

    @Data
    public static class AttackResult {
        private String documentId;
        private String documentType;
        private String algorithm;
        private String targetType;           // "ENCRYPTION" or "SIGNATURE"
        private String attackType;
        private boolean decrypted;           // For encryption attacks
        private boolean forged;              // For signature attacks
        private int qubitsUsed;
        private long attackTimeMs;
        private String details;
        private String decryptedPreview;
    }
}
