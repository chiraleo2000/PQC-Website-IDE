package com.pqc.hacker.intercept;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pqc.hacker.entity.HarvestedData;
import com.pqc.hacker.quantum.CuQuantumGpuSimulator;
import com.pqc.hacker.repository.HarvestedDataRepository;
import com.pqc.model.CryptoAlgorithm;
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
 * Transaction Harvester - HNDL Attack Simulation
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
public class TransactionHarvester {

    private static final String ML_KEM_UNDERSCORE = "ML_KEM";
    private static final String ML_KEM_HYPHEN = "ML-KEM";
    private static final String ML_DSA_UNDERSCORE = "ML_DSA";
    private static final String ML_DSA_HYPHEN = "ML-DSA";

    private final CuQuantumGpuSimulator quantumSimulator;
    private final HarvestedDataRepository harvestedDataRepository;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    private String govPortalUrl = "http://localhost:8181";
    @SuppressWarnings("unused") // Reserved for future messaging interception
    private String messagingUrl = "http://localhost:8182";

    // Harvested encrypted data storage (simulates attacker's database)
    private final List<InterceptedTransaction> harvestedData = Collections.synchronizedList(new ArrayList<>());

    public TransactionHarvester(CuQuantumGpuSimulator quantumSimulator,
                                HarvestedDataRepository harvestedDataRepository,
                                @Value("${hacker.target.gov-portal:http://localhost:8181}") String govPortalUrl,
                                @Value("${hacker.target.messaging:http://localhost:8182}") String messagingUrl) {
        this.quantumSimulator = quantumSimulator;
        this.harvestedDataRepository = harvestedDataRepository;
        this.govPortalUrl = govPortalUrl;
        this.messagingUrl = messagingUrl;
        this.objectMapper = new ObjectMapper();
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build();
        log.warn("🕵️ Transaction Harvester initialized - targeting {} and {}", govPortalUrl, messagingUrl);
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
                        String documentId = String.valueOf(tx.get("documentId"));
                        String encryptionAlgo = String.valueOf(tx.get("encryptionAlgorithm"));
                        String signatureAlgo = String.valueOf(tx.get("signatureAlgorithm"));
                        
                        InterceptedTransaction itx = new InterceptedTransaction();
                        itx.setDocumentId(documentId);
                        itx.setDocumentType(String.valueOf(tx.get("type")));
                        itx.setApplicant(String.valueOf(tx.get("applicant")));
                        // Use the enum name for algorithm identification (RSA_2048, ML_KEM, ML_DSA, etc.)
                        itx.setEncryptionAlgorithm(encryptionAlgo);
                        itx.setSignatureAlgorithm(signatureAlgo);
                        itx.setStatus(String.valueOf(tx.get("status")));
                        itx.setInterceptedAt(LocalDateTime.now());
                        
                        // Simulate capturing encrypted payload (KEM)
                        byte[] encryptedPayload = generateSimulatedEncryptedData(encryptionAlgo);
                        itx.setEncryptedPayload(encryptedPayload);
                        
                        // Simulate capturing digital signature data
                        itx.setSignatureData(generateSimulatedSignatureData(signatureAlgo));
                        
                        // Extract encryption metadata for quantum attack
                        itx.setKeyMetadata(extractKeyMetadata(encryptionAlgo));
                        
                        // Extract signature metadata for quantum attack
                        itx.setSignatureKeyMetadata(extractKeyMetadata(signatureAlgo));
                        
                        intercepted.add(itx);
                        harvestedData.add(itx);
                        
                        // Also persist to database for dashboard display
                        saveToRepository(itx, encryptedPayload, tx);
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
            // Attack ENCRYPTION (KEM) algorithm
            AttackResult encryptionAttack = attackEncryption(tx);
            results.add(encryptionAttack);
            rsaEncryptionBroken += encryptionAttack.isDecrypted() ? 1 : 0;
            pqcEncryptionProtected += isPqcEncryptionProtected(encryptionAttack) ? 1 : 0;
            
            // Attack SIGNATURE (DSA) algorithm
            AttackResult signatureAttack = attackSignature(tx);
            results.add(signatureAttack);
            rsaSignatureForged += signatureAttack.isForged() ? 1 : 0;
            pqcSignatureProtected += isPqcSignatureProtected(signatureAttack) ? 1 : 0;
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
        
        log.warn("📊 ATTACK COMPLETE: {} RSA encryptions broken, {} RSA signatures forged, {} PQC protected", 
                rsaEncryptionBroken, rsaSignatureForged, pqcEncryptionProtected + pqcSignatureProtected);
        
        return report;
    }

    private boolean isPqcEncryptionProtected(AttackResult attack) {
        return !attack.isDecrypted() && (attack.getAlgorithm().contains(ML_KEM_UNDERSCORE)
                || attack.getAlgorithm().contains(ML_KEM_HYPHEN));
    }

    private boolean isPqcSignatureProtected(AttackResult attack) {
        return !attack.isForged() && (attack.getAlgorithm().contains(ML_DSA_UNDERSCORE)
                || attack.getAlgorithm().contains(ML_DSA_HYPHEN));
    }

    private void generateAttackSummary(QuantumAttackReport report, int totalBroken,
            int rsaEncryptionBroken, int rsaSignatureForged,
            int pqcEncryptionProtected, int pqcSignatureProtected) {
        if (totalBroken > 0) {
            StringBuilder sb = new StringBuilder("⚠️ CRITICAL: ");
            if (rsaEncryptionBroken > 0) {
                sb.append(rsaEncryptionBroken).append(" RSA encryption(s) DECRYPTED! ");
            }
            if (rsaSignatureForged > 0) {
                sb.append(rsaSignatureForged).append(" RSA signature(s) FORGED!");
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
     * Attack ENCRYPTION algorithm (Key Encapsulation Mechanism)
     * Uses Shor's algorithm against RSA, attempts lattice attacks against ML-KEM
     */
    private AttackResult attackEncryption(InterceptedTransaction tx) {
        AttackResult result = new AttackResult();
        result.setDocumentId(tx.getDocumentId());
        result.setDocumentType(tx.getDocumentType());
        result.setAlgorithm(tx.getEncryptionAlgorithm());
        result.setTargetType("ENCRYPTION");
        
        String algo = tx.getEncryptionAlgorithm().toUpperCase();
        
        if (algo.contains("RSA")) {
            // RSA-KEM is vulnerable to Shor's algorithm
            // ATTACK FLOW: Break RSA → Recover private key → Decapsulate AES-256 key → Decrypt bulk data
            int keyBits = algo.contains("4096") ? 4096 : 2048;
            BigInteger fakeModulus = generateFakeRsaModulus(keyBits);
            
            CuQuantumGpuSimulator.ShorsAttackResult shorsResult = 
                    quantumSimulator.simulateShorsAlgorithm(fakeModulus, keyBits);
            
            result.setDecrypted(shorsResult.isSuccess());
            result.setForged(false);
            result.setAttackType("Shor's Algorithm (RSA-KEM Key Recovery)");
            result.setQubitsUsed(shorsResult.getQubitsRequired());
            result.setAttackTimeMs(shorsResult.getExecutionTimeMs());
            result.setDetails(shorsResult.getMessage() + 
                    " | RSA-" + keyBits + " KEM BROKEN → AES-256 session key DECAPSULATED → Bulk data DECRYPTED!");
            
            if (shorsResult.isSuccess()) {
                result.setDecryptedPreview("🔓 [HYBRID ATTACK SUCCESS] " + 
                        "Step 1: RSA-" + keyBits + " factored → Step 2: AES-256 key recovered → " +
                        "Step 3: Document for " + tx.getApplicant() + " (" + tx.getDocumentType() + ") DECRYPTED!");
            }
            
        } else if (algo.contains(ML_KEM_UNDERSCORE) || algo.contains(ML_KEM_HYPHEN) || algo.contains("KYBER")) {
            // ML-KEM (Kyber) is quantum-resistant - AES-256 key remains protected
            CuQuantumGpuSimulator.LatticeAttackResult latticeResult = 
                    quantumSimulator.simulateLatticeAttack(algo);
            
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Lattice Reduction Attack (BKZ/LLL) on ML-KEM");
            result.setQubitsUsed(0);
            result.setAttackTimeMs(latticeResult.getExecutionTimeMs());
            result.setDetails("🛡️ " + latticeResult.getMessage() + 
                    " | ML-KEM-768 PROTECTED → AES-256 key SAFE → Bulk data CANNOT be decrypted!");
            
        } else if (algo.contains("AES")) {
            // AES-256 itself is quantum-resistant (Grover's only reduces to 128-bit)
            // The vulnerability is in the KEM that wraps the AES key, NOT AES itself!
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Grover's Algorithm (AES Key Search)");
            result.setQubitsUsed(256);
            result.setAttackTimeMs(100);
            result.setDetails("🛡️ AES-256 SECURE! Grover's reduces 256-bit → 128-bit (still infeasible). " +
                    "Note: Quantum threat is to the KEM that wraps this key, not AES itself!");
            
        } else {
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Unknown Algorithm");
            result.setDetails("❓ No quantum attack implemented for encryption: " + algo);
        }
        
        return result;
    }

    /**
     * Attack SIGNATURE algorithm (Digital Signature)
     * Uses Shor's algorithm to forge RSA signatures, attempts to forge ML-DSA signatures.
     * 
     * SIGNATURE ATTACK CONSEQUENCES:
     * - If RSA signature is broken → Hacker can FORGE documents (identity theft)
     * - Can create fake government documents that pass verification
     * - Can impersonate users and submit fraudulent applications
     */
    private AttackResult attackSignature(InterceptedTransaction tx) {
        AttackResult result = new AttackResult();
        result.setDocumentId(tx.getDocumentId());
        result.setDocumentType(tx.getDocumentType());
        result.setAlgorithm(tx.getSignatureAlgorithm());
        result.setTargetType("SIGNATURE");
        
        String algo = tx.getSignatureAlgorithm().toUpperCase();
        
        if (algo.contains("RSA")) {
            // RSA signatures are vulnerable - can recover signing key and FORGE documents
            int keyBits = algo.contains("4096") ? 4096 : 2048;
            BigInteger fakeModulus = generateFakeRsaModulus(keyBits);
            
            CuQuantumGpuSimulator.ShorsAttackResult shorsResult = 
                    quantumSimulator.simulateShorsAlgorithm(fakeModulus, keyBits);
            
            result.setDecrypted(false);
            result.setForged(shorsResult.isSuccess());
            result.setAttackType("Shor's Algorithm (RSA Signature Key Recovery)");
            result.setQubitsUsed(shorsResult.getQubitsRequired());
            result.setAttackTimeMs(shorsResult.getExecutionTimeMs());
            result.setDetails(shorsResult.getMessage() + 
                    " | RSA-" + keyBits + " signing key RECOVERED → Can FORGE any " + tx.getDocumentType() + "!");
            
            if (shorsResult.isSuccess()) {
                result.setDecryptedPreview("✍️ [FORGERY ENABLED] " + 
                        "Can create FAKE " + tx.getDocumentType() + " for " + tx.getApplicant() + 
                        " with VALID signature! Identity theft possible!");
            }
            
        } else if (algo.contains(ML_DSA_UNDERSCORE) || algo.contains(ML_DSA_HYPHEN) || algo.contains("DILITHIUM")) {
            // ML-DSA (Dilithium) signatures are quantum-resistant - forgery FAILS
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Lattice-Based Signature Forgery Attempt");
            result.setQubitsUsed(0);
            result.setAttackTimeMs(50);
            result.setDetails("🛡️ ML-DSA (Dilithium) signatures CANNOT be forged! " +
                    "Based on Module-LWE and SelfTargetMSIS hard problems - quantum resistant.");
            
        } else if (algo.contains("SLH_DSA") || algo.contains("SLH-DSA") || algo.contains("SPHINCS")) {
            // SLH-DSA (SPHINCS+) is hash-based and quantum-resistant
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Hash-Based Signature Forgery Attempt");
            result.setQubitsUsed(0);
            result.setAttackTimeMs(30);
            result.setDetails("🛡️ SLH-DSA (SPHINCS+) signatures CANNOT be forged! " +
                    "Hash-based signatures - no known quantum attack exists.");
            
        } else if (algo.contains("ECDSA")) {
            // ECDSA is vulnerable to Shor's algorithm
            result.setDecrypted(false);
            result.setForged(true);
            result.setAttackType("Shor's Algorithm (ECDSA Key Recovery)");
            result.setQubitsUsed(512);
            result.setAttackTimeMs(200);
            result.setDetails("⚠️ ECDSA private key RECOVERED using Shor's algorithm! " +
                    "Elliptic curve discrete log problem solved by quantum computer.");
            result.setDecryptedPreview("✍️ [FORGED] Can create fake signatures for " + tx.getApplicant());
            
        } else {
            result.setDecrypted(false);
            result.setForged(false);
            result.setAttackType("Unknown Signature Algorithm");
            result.setDetails("❓ No quantum attack implemented for signature: " + algo);
        }
        
        return result;
    }

    /**
     * Generate simulated encrypted data payload (KEM ciphertext)
     */
    private byte[] generateSimulatedEncryptedData(String algorithm) {
        // Generate realistic-looking encrypted data
        int size = algorithm.contains(ML_KEM_HYPHEN) ? 1088 : 256;  // ML-KEM has larger ciphertexts
        byte[] data = new byte[size];
        secureRandom.nextBytes(data);
        return data;
    }
    
    /**
     * Generate simulated digital signature data
     */
    private byte[] generateSimulatedSignatureData(String algorithm) {
        // Generate realistic-looking signature data
        // ML-DSA-65 (Dilithium) signatures are ~3293 bytes, RSA-2048 is 256 bytes
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
        harvestedDataRepository.deleteAll();
        log.info("🧹 Cleared all harvested data from memory and database");
    }

    /**
     * Save intercepted transaction to database for dashboard display
     */
    private void saveToRepository(InterceptedTransaction itx, byte[] encryptedPayload, Map<String, Object> tx) {
        try {
            String harvestId = "harvest_" + itx.getDocumentId() + "_" + System.currentTimeMillis();
            
            // Check if already harvested
            if (harvestedDataRepository.existsByTargetId(itx.getDocumentId())) {
                log.debug("📋 Document {} already harvested, skipping duplicate", itx.getDocumentId());
                return;
            }
            
            // Determine crypto algorithm enum
            CryptoAlgorithm algorithm = determineAlgorithm(itx.getEncryptionAlgorithm());
            boolean isQuantumResistant = itx.getEncryptionAlgorithm().contains(ML_KEM_UNDERSCORE) || 
                                         itx.getEncryptionAlgorithm().contains(ML_KEM_HYPHEN);
            
            HarvestedData harvested = HarvestedData.builder()
                    .harvestId(harvestId)
                    .sourceService("GOV_PORTAL")
                    .targetId(itx.getDocumentId())
                    .dataType(HarvestedData.DataType.DOCUMENT)
                    .encryptedContent(encryptedPayload)
                    .algorithm(algorithm)
                    .algorithmDetails(itx.getEncryptionAlgorithm() + " / " + itx.getSignatureAlgorithm())
                    .isQuantumResistant(isQuantumResistant)
                    .originalSender(itx.getApplicant())
                    .intendedRecipient("gov-portal")
                    .metadata(objectMapper.writeValueAsString(tx))
                    .status(HarvestedData.HarvestStatus.HARVESTED)
                    .harvestedAt(LocalDateTime.now())
                    .build();
            
            harvestedDataRepository.save(harvested);
            log.debug("💾 Saved {} to database with encryption: {}", itx.getDocumentId(), itx.getEncryptionAlgorithm());
            
        } catch (Exception e) {
            log.warn("Failed to save harvest to repository: {}", e.getMessage());
        }
    }
    
    /**
     * Determine CryptoAlgorithm enum from string
     */
    private CryptoAlgorithm determineAlgorithm(String algoString) {
        if (algoString == null) return CryptoAlgorithm.RSA_2048;
        
        String upper = algoString.toUpperCase();
        if (upper.contains(ML_KEM_UNDERSCORE) || upper.contains(ML_KEM_HYPHEN) || upper.contains("KYBER")) {
            return CryptoAlgorithm.ML_KEM;
        } else if (upper.contains(ML_DSA_UNDERSCORE) || upper.contains(ML_DSA_HYPHEN) || upper.contains("DILITHIUM")) {
            return CryptoAlgorithm.ML_DSA;
        } else if (upper.contains("AES-256") || upper.contains("AES_256")) {
            return CryptoAlgorithm.AES_256;
        } else if (upper.contains("AES")) {
            return CryptoAlgorithm.AES_128;
        } else if (upper.contains("RSA-4096") || upper.contains("RSA_4096")) {
            return CryptoAlgorithm.RSA_4096;
        }
        return CryptoAlgorithm.RSA_2048;
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
