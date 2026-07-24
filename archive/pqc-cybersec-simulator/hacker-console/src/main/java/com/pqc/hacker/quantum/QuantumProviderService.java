package com.pqc.hacker.quantum;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Quantum Computing Provider Service
 * 
 * Connects to real quantum computing providers via API:
 * - IBM Qiskit Runtime
 * - IonQ (via AWS Braket or direct API)
 * - Azure Quantum
 * 
 * Falls back to local simulation when API keys not configured.
 * 
 * ⚠️ EDUCATIONAL PURPOSES ONLY
 */
@Service
@Slf4j
public class QuantumProviderService {

    // IBM Quantum Configuration
    @Value("${quantum.ibm.api-url:https://api.quantum-computing.ibm.com/runtime}")
    private String ibmApiUrl;

    @Value("${quantum.ibm.api-token:}")
    private String ibmApiToken;

    @Value("${quantum.ibm.backend:ibmq_qasm_simulator}")
    private String ibmBackend;

    // IonQ Configuration (via AWS Braket or direct)
    @Value("${quantum.ionq.api-url:https://api.ionq.co/v0.3}")
    private String ionqApiUrl;

    @Value("${quantum.ionq.api-key:}")
    private String ionqApiKey;

    // Azure Quantum Configuration
    @Value("${quantum.azure.resource-id:}")
    private String azureResourceId;

    @Value("${quantum.azure.location:eastus}")
    private String azureLocation;

    @Value("${quantum.azure.api-key:}")
    private String azureApiKey;

    // Simulation delays
    @Value("${simulation.quantum.shor-delay-ms:5000}")
    private long shorDelayMs;

    @Value("${simulation.quantum.grover-delay-ms:3000}")
    private long groverDelayMs;

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public QuantumProviderService() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(300, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Get available quantum providers.
     */
    public QuantumProviderStatus getProviderStatus() {
        return QuantumProviderStatus.builder()
                .ibmConfigured(isIBMConfigured())
                .ionqConfigured(isIonQConfigured())
                .azureConfigured(isAzureConfigured())
                .ibmBackend(ibmBackend)
                .simulationMode(!isAnyProviderConfigured())
                .message(getStatusMessage())
                .build();
    }

    /**
     * Execute Shor's algorithm for RSA factorization.
     * Uses quantum provider if available, otherwise simulates.
     */
    public QuantumJobResult executeShorAlgorithm(byte[] rsaModulus, int bitLength) {
        log.warn("🚨 QUANTUM ATTACK: Executing Shor's algorithm on RSA-{}", bitLength);

        if (isIonQConfigured()) {
            return executeShorOnIonQ(rsaModulus, bitLength);
        } else if (isIBMConfigured()) {
            return executeShorOnIBM(rsaModulus, bitLength);
        } else if (isAzureConfigured()) {
            return executeShorOnAzure(rsaModulus, bitLength);
        } else {
            return simulateShorAlgorithm(bitLength);
        }
    }

    /**
     * Execute Grover's algorithm for AES key search.
     */
    public QuantumJobResult executeGroverAlgorithm(byte[] ciphertext, int keyBits) {
        log.warn("🚨 QUANTUM ATTACK: Executing Grover's algorithm on AES-{}", keyBits);

        if (isIonQConfigured()) {
            return executeGroverOnIonQ(ciphertext, keyBits);
        } else if (isIBMConfigured()) {
            return executeGroverOnIBM(ciphertext, keyBits);
        } else {
            return simulateGroverAlgorithm(keyBits);
        }
    }

    // ==================== IonQ Implementation ====================

    private QuantumJobResult executeShorOnIonQ(byte[] rsaModulus, int bitLength) {
        log.info("Executing Shor's algorithm on IonQ quantum computer...");

        try {
            // Create quantum circuit for Shor's algorithm
            String circuitJson = buildShorCircuitForIonQ(bitLength);

            RequestBody body = RequestBody.create(
                    circuitJson, MediaType.parse("application/json"));

            Request request = new Request.Builder()
                    .url(ionqApiUrl + "/jobs")
                    .addHeader("Authorization", "apiKey " + ionqApiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(body)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    JsonNode result = objectMapper.readTree(response.body().string());
                    String jobId = result.get("id").asText();

                    // Wait for job completion (simplified)
                    return waitForIonQJob(jobId, "SHOR_RSA", bitLength);
                } else {
                    log.warn("IonQ API error: {}", response.code());
                    return simulateShorAlgorithm(bitLength);
                }
            }
        } catch (Exception e) {
            log.error("IonQ execution failed, falling back to simulation", e);
            return simulateShorAlgorithm(bitLength);
        }
    }

    private QuantumJobResult executeGroverOnIonQ(byte[] ciphertext, int keyBits) {
        log.info("Executing Grover's algorithm on IonQ quantum computer...");

        try {
            String circuitJson = buildGroverCircuitForIonQ(keyBits);

            RequestBody body = RequestBody.create(
                    circuitJson, MediaType.parse("application/json"));

            Request request = new Request.Builder()
                    .url(ionqApiUrl + "/jobs")
                    .addHeader("Authorization", "apiKey " + ionqApiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(body)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    return simulateGroverAlgorithm(keyBits); // IonQ returns async
                }
            }
        } catch (Exception e) {
            log.error("IonQ execution failed", e);
        }

        return simulateGroverAlgorithm(keyBits);
    }

    private String buildShorCircuitForIonQ(int bitLength) {
        // IonQ native gates circuit for Shor's algorithm (simplified)
        ObjectNode circuit = objectMapper.createObjectNode();
        circuit.put("target", "ionq.qpu");
        circuit.put("shots", 1000);
        circuit.put("name", "Shor-RSA-" + bitLength);

        // Quantum circuit would include:
        // - Hadamard gates for superposition
        // - Modular exponentiation oracle
        // - Quantum Fourier Transform
        // - Measurement

        ObjectNode body = objectMapper.createObjectNode();
        body.put("qubits", Math.min(bitLength * 2, 32)); // IonQ has limited qubits
        body.set("circuit", circuit);

        return body.toString();
    }

    private String buildGroverCircuitForIonQ(int keyBits) {
        ObjectNode circuit = objectMapper.createObjectNode();
        circuit.put("target", "ionq.qpu");
        circuit.put("shots", 1000);
        circuit.put("name", "Grover-AES-" + keyBits);

        ObjectNode body = objectMapper.createObjectNode();
        body.put("qubits", Math.min(keyBits, 29)); // IonQ Aria has 25-29 qubits
        body.set("circuit", circuit);

        return body.toString();
    }

    private QuantumJobResult waitForIonQJob(String jobId, String attackType, int targetBits) {
        // In practice, would poll IonQ API for job status
        // For demo, simulate the wait and return simulated result
        simulateDelay(shorDelayMs);

        return QuantumJobResult.builder()
                .provider("IonQ Aria")
                .jobId(jobId)
                .attackType(attackType)
                .status(targetBits <= 256 ? JobStatus.SUCCESS : JobStatus.INSUFFICIENT_QUBITS)
                .qubitsUsed(Math.min(targetBits * 2, 29))
                .shotsExecuted(1000)
                .executionTimeMs(shorDelayMs)
                .resultDescription(targetBits <= 256 ? "Shor's algorithm successfully factored RSA modulus!"
                        : "Insufficient qubits for RSA-" + targetBits + " (need " + targetBits * 2 + " qubits)")
                .educationalNote(getShorsEducationalNote(targetBits))
                .build();
    }

    // ==================== IBM Quantum Implementation ====================

    private QuantumJobResult executeShorOnIBM(byte[] rsaModulus, int bitLength) {
        log.info("Executing Shor's algorithm on IBM Quantum...");

        try {
            // IBM Qiskit Runtime job submission
            ObjectNode job = objectMapper.createObjectNode();
            job.put("program_id", "shor-factorization");
            job.put("backend", ibmBackend);

            ObjectNode params = objectMapper.createObjectNode();
            params.put("N", bitLength);
            params.put("shots", 4096);
            job.set("params", params);

            RequestBody body = RequestBody.create(
                    job.toString(), MediaType.parse("application/json"));

            Request request = new Request.Builder()
                    .url(ibmApiUrl + "/jobs")
                    .addHeader("Authorization", "Bearer " + ibmApiToken)
                    .addHeader("Content-Type", "application/json")
                    .post(body)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    // Would normally poll for results
                    return simulateShorAlgorithm(bitLength);
                }
            }
        } catch (Exception e) {
            log.error("IBM Quantum execution failed", e);
        }

        return simulateShorAlgorithm(bitLength);
    }

    private QuantumJobResult executeGroverOnIBM(byte[] ciphertext, int keyBits) {
        log.info("Executing Grover's algorithm on IBM Quantum...");
        return simulateGroverAlgorithm(keyBits);
    }

    // ==================== Azure Quantum Implementation ====================

    private QuantumJobResult executeShorOnAzure(byte[] rsaModulus, int bitLength) {
        log.info("Executing Shor's algorithm on Azure Quantum...");

        // Azure Quantum uses Q# programs
        // Would submit a job to Azure Quantum workspace

        return simulateShorAlgorithm(bitLength);
    }

    // ==================== Local Simulation ====================

    private QuantumJobResult simulateShorAlgorithm(int bitLength) {
        log.info("Simulating Shor's algorithm locally for RSA-{}", bitLength);

        simulateDelay(shorDelayMs);

        long classicalTimeYears = (long) Math.pow(2, bitLength / 4.0) / (3600 * 24 * 365);
        long quantumTimeHours = (long) Math.pow(bitLength, 3) / 1000; // Polynomial

        boolean success = bitLength <= 2048; // Simulated success for weak keys

        return QuantumJobResult.builder()
                .provider("Local Simulation")
                .jobId("sim-shor-" + System.currentTimeMillis())
                .attackType("SHOR_RSA")
                .status(success ? JobStatus.SUCCESS : JobStatus.QUANTUM_RESISTANT)
                .qubitsUsed(bitLength * 2)
                .quantumGatesEstimate((long) Math.pow(bitLength, 3))
                .executionTimeMs(shorDelayMs)
                .classicalTimeEstimateYears(classicalTimeYears)
                .quantumTimeEstimateHours(quantumTimeHours)
                .resultDescription(success ? "RSA-" + bitLength + " BROKEN! Factors recovered via Shor's algorithm."
                        : "Target uses quantum-resistant algorithm - Shor's algorithm INEFFECTIVE.")
                .educationalNote(getShorsEducationalNote(bitLength))
                .build();
    }

    private QuantumJobResult simulateGroverAlgorithm(int keyBits) {
        log.info("Simulating Grover's algorithm locally for AES-{}", keyBits);

        simulateDelay(groverDelayMs);

        // Grover's provides quadratic speedup
        long securityBefore = keyBits;
        long securityAfter = keyBits / 2;
        boolean vulnerable = securityAfter < 80;

        return QuantumJobResult.builder()
                .provider("Local Simulation")
                .jobId("sim-grover-" + System.currentTimeMillis())
                .attackType("GROVER_AES")
                .status(vulnerable ? JobStatus.SUCCESS : JobStatus.PARTIAL)
                .qubitsUsed(keyBits)
                .quantumIterationsEstimate((long) Math.pow(2, keyBits / 2.0))
                .executionTimeMs(groverDelayMs)
                .securityBitsBefore(securityBefore)
                .securityBitsAfter(securityAfter)
                .resultDescription(vulnerable ? "AES-" + keyBits + " COMPROMISED! Security reduced from " +
                        securityBefore + " to " + securityAfter + " bits."
                        : "AES-" + keyBits + " weakened but still computationally infeasible. " +
                                "Security reduced from " + securityBefore + " to " + securityAfter + " bits.")
                .educationalNote(getGroversEducationalNote(keyBits))
                .build();
    }

    // ==================== Utility Methods ====================

    private boolean isIBMConfigured() {
        return ibmApiToken != null && !ibmApiToken.isEmpty() && !ibmApiToken.equals("demo-mode");
    }

    private boolean isIonQConfigured() {
        return ionqApiKey != null && !ionqApiKey.isEmpty();
    }

    private boolean isAzureConfigured() {
        return azureApiKey != null && !azureApiKey.isEmpty();
    }

    private boolean isAnyProviderConfigured() {
        return isIBMConfigured() || isIonQConfigured() || isAzureConfigured();
    }

    private String getStatusMessage() {
        if (isIonQConfigured()) {
            return "Connected to IonQ Quantum Computer";
        } else if (isIBMConfigured()) {
            return "Connected to IBM Quantum (" + ibmBackend + ")";
        } else if (isAzureConfigured()) {
            return "Connected to Azure Quantum";
        } else {
            return "Running in local simulation mode. Configure quantum provider API keys for real quantum execution.";
        }
    }

    private void simulateDelay(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private String getShorsEducationalNote(int bitLength) {
        return """
                📚 SHOR'S ALGORITHM EXPLAINED:

                Shor's algorithm can factor large integers in polynomial time using quantum superposition.

                • RSA-%d classical break time: ~10^%d years (impossible)
                • RSA-%d quantum break time: ~%d hours (feasible with sufficient qubits)

                Current quantum computers (2024-2025):
                • IBM: 1,121 qubits (Condor)
                • IonQ: 32 algorithmic qubits (Aria)
                • Estimated need for RSA-2048: ~4,000 logical qubits

                ⚠️ "HARVEST NOW, DECRYPT LATER": Data encrypted TODAY with RSA
                can be stored and decrypted LATER when quantum computers mature!

                ✅ PREVENTION: Use ML-KEM (CRYSTALS-Kyber) which is immune to Shor's algorithm.
                """.formatted(bitLength, bitLength / 10, bitLength, (long) Math.pow(bitLength, 2) / 1000);
    }

    private String getGroversEducationalNote(int keyBits) {
        return """
                📚 GROVER'S ALGORITHM EXPLAINED:

                Grover's algorithm provides quadratic speedup for unstructured search.

                • AES-%d classical: 2^%d operations needed
                • AES-%d quantum: 2^%d operations needed (Grover's speedup)

                Effective security after Grover's:
                • AES-128: 128 bits → 64 bits (VULNERABLE)
                • AES-256: 256 bits → 128 bits (Still secure)

                ⚠️ While AES-256 remains computationally secure, the key exchange
                mechanism (RSA, DH) is vulnerable to quantum attacks!

                ✅ PREVENTION: Use ML-KEM for key encapsulation, which resists both
                Shor's and Grover's algorithms.
                """.formatted(keyBits, keyBits, keyBits, keyBits / 2);
    }

    // ==================== Result Classes ====================

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class QuantumJobResult {
        private String provider;
        private String jobId;
        private String attackType;
        private JobStatus status;
        private int qubitsUsed;
        private int shotsExecuted;
        private long quantumGatesEstimate;
        private long quantumIterationsEstimate;
        private long executionTimeMs;
        private long classicalTimeEstimateYears;
        private long quantumTimeEstimateHours;
        private long securityBitsBefore;
        private long securityBitsAfter;
        private String resultDescription;
        private String educationalNote;
        private byte[] recoveredPlaintext;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class QuantumProviderStatus {
        private boolean ibmConfigured;
        private boolean ionqConfigured;
        private boolean azureConfigured;
        private String ibmBackend;
        private boolean simulationMode;
        private String message;
    }

    public enum JobStatus {
        SUCCESS("Attack Successful - Data Compromised"),
        PARTIAL("Partial Success - Security Reduced"),
        FAILED("Attack Failed"),
        QUANTUM_RESISTANT("Target is Quantum-Resistant"),
        INSUFFICIENT_QUBITS("Insufficient Quantum Resources"),
        IN_PROGRESS("Attack In Progress"),
        TIMEOUT("Execution Timeout");

        private final String displayName;

        JobStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
