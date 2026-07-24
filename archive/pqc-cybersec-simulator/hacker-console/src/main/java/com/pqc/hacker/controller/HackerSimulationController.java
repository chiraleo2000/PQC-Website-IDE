package com.pqc.hacker.controller;

import com.pqc.hacker.entity.AttackAttempt;
import com.pqc.hacker.entity.HarvestedData;
import com.pqc.hacker.intercept.TransactionHarvester;
import com.pqc.hacker.quantum.CuQuantumGpuSimulator;
import com.pqc.hacker.quantum.PythonQuantumClient;
import com.pqc.hacker.quantum.QuantumProviderService;
import com.pqc.hacker.service.InterceptionService;
import com.pqc.hacker.service.QuantumAttackService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;

/**
 * Hacker Simulation API Controller
 * 
 * Provides endpoints for demonstrating quantum computing threats:
 * - Network interception (document/message harvesting)
 * - Quantum attack execution (Shor's, Grover's)
 * - HNDL (Harvest Now, Decrypt Later) scenarios
 * - Educational attack scenarios
 * 
 * ⚠️ EDUCATIONAL PURPOSES ONLY
 */
@RestController
@RequestMapping("/api/hacker")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class HackerSimulationController {

        private static final String KEY_SUCCESS = "success";
        private static final String KEY_DESCRIPTION = "description";
        private static final String KEY_TARGET_ALGORITHM = "targetAlgorithm";
        private static final String KEY_QUANTUM_ATTACK = "quantumAttack";
        private static final String KEY_EDUCATION = "education";
        private static final String KEY_EVENT = "event";
        private static final String KEY_RECOMMENDATION = "recommendation";
        private static final String KEY_MESSAGE = "message";

        private final InterceptionService interceptionService;
        private final QuantumAttackService quantumAttackService;
        private final QuantumProviderService quantumProviderService;
        private final TransactionHarvester transactionHarvester;
        private final CuQuantumGpuSimulator cuQuantumSimulator;
        private final PythonQuantumClient pythonQuantumClient;

        // ==================== System Status ====================

        /**
         * Get quantum provider status and configuration.
         * GET /api/hacker/status
         */
        @GetMapping("/status")
        public ResponseEntity<Object> getStatus() {
                return ResponseEntity.ok(Map.of(
                                "service", "PQC Hacker Simulation",
                                "purpose", "EDUCATIONAL DEMONSTRATION ONLY",
                                "quantumProviders", quantumProviderService.getProviderStatus(),
                                "harvestStatistics", interceptionService.getStatistics(),
                                "attackStatistics", quantumAttackService.getStatistics(),
                                "disclaimer",
                                "This service demonstrates quantum computing threats for awareness purposes."));
        }

        // ==================== Data Interception ====================

        /**
         * Intercept a document from the User Document Service.
         * POST /api/hacker/intercept/document
         */
        @PostMapping("/intercept/document")
        public ResponseEntity<Object> interceptDocument(@RequestBody InterceptRequest request) {
                log.warn("🕵️ INTERCEPTION REQUEST: Document {}", request.targetId());

                InterceptionService.InterceptionResult result = interceptionService
                                .interceptDocument(request.targetId());

                return ResponseEntity.ok(result);
        }

        /**
         * Intercept a message from the Messaging Service.
         * POST /api/hacker/intercept/message
         */
        @PostMapping("/intercept/message")
        public ResponseEntity<Object> interceptMessage(@RequestBody InterceptRequest request) {
                log.warn("🕵️ INTERCEPTION REQUEST: Message {}", request.targetId());

                InterceptionService.InterceptionResult result = interceptionService
                                .interceptMessage(request.targetId());

                return ResponseEntity.ok(result);
        }

        /**
         * Bulk harvest all available messages.
         * POST /api/hacker/intercept/bulk
         */
        @PostMapping("/intercept/bulk")
        public ResponseEntity<Object> bulkHarvest() {
                log.warn("🕵️ BULK HARVEST REQUEST");

                InterceptionService.BulkHarvestResult result = interceptionService.bulkHarvestMessages();

                return ResponseEntity.ok(result);
        }

        /**
         * Live intercept - Get new transactions since last poll.
         * GET /api/hacker/intercept/live
         */
        @GetMapping("/intercept/live")
        public ResponseEntity<Object> liveIntercept() {
                TransactionHarvester.InterceptionResult result = transactionHarvester.harvestTransactionLogs();
                
                return ResponseEntity.ok(Map.of(
                        "newTransactions", result.getInterceptedTransactions() != null 
                                ? result.getInterceptedTransactions() 
                                : List.of(),
                        KEY_SUCCESS, result.isSuccess(),
                        "timestamp", java.time.LocalDateTime.now()
                ));
        }

        /**
         * Store a harvested packet from the UI.
         * POST /api/hacker/harvest/packet
         */
        @PostMapping("/harvest/packet")
        public ResponseEntity<Object> harvestPacket(@RequestBody Map<String, Object> packet) {
                log.info("📦 Storing harvested packet: {}", packet.get("documentId"));
                // Store in memory for later quantum attack
                return ResponseEntity.ok(Map.of("stored", true, "packetId", packet.get("id")));
        }

        /**
         * Get all harvested data.
         * GET /api/hacker/harvested
         */
        @GetMapping("/harvested")
        public ResponseEntity<List<HarvestedData>> getHarvestedData() {
                return ResponseEntity.ok(interceptionService.getHarvestedData());
        }

        /**
         * Get quantum-vulnerable harvested data.
         * GET /api/hacker/harvested/vulnerable
         */
        @GetMapping("/harvested/vulnerable")
        public ResponseEntity<List<HarvestedData>> getVulnerableData() {
                return ResponseEntity.ok(interceptionService.getQuantumVulnerableData());
        }

        // ==================== Quantum Attacks ====================

        /**
         * Execute full HNDL (Harvest Now, Decrypt Later) attack scenario.
         * POST /api/hacker/attack/hndl
         */
        @PostMapping("/attack/hndl")
        public ResponseEntity<Object> executeHNDLAttack(@RequestBody HNDLRequest request) {
                log.warn("🚨 HNDL ATTACK: {} {}", request.targetType(), request.targetId());

                QuantumAttackService.HNDLAttackResult result = quantumAttackService
                                .executeHNDLScenario(request.targetId(), request.targetType());

                return ResponseEntity.ok(result);
        }

        /**
         * Execute Shor's algorithm attack on harvested RSA data.
         * POST /api/hacker/attack/shor
         */
        @PostMapping("/attack/shor")
        public ResponseEntity<Object> executeShorAttack(@RequestBody AttackRequest request) {
                log.warn("🚨 SHOR'S ATTACK: {}", request.harvestId());

                try {
                        AttackAttempt result = quantumAttackService.executeShorAttack(request.harvestId());
                        return ResponseEntity.ok(result);
                } catch (IllegalArgumentException e) {
                        return ResponseEntity.badRequest().body(Map.of(
                                        "error", e.getMessage(),
                                        "note", "Shor's algorithm only works on RSA-encrypted data"));
                }
        }

        /**
         * Execute Grover's algorithm attack on harvested AES data.
         * POST /api/hacker/attack/grover
         */
        @PostMapping("/attack/grover")
        public ResponseEntity<Object> executeGroverAttack(@RequestBody AttackRequest request) {
                log.warn("🚨 GROVER'S ATTACK: {}", request.harvestId());

                try {
                        AttackAttempt result = quantumAttackService.executeGroverAttack(request.harvestId());
                        return ResponseEntity.ok(result);
                } catch (IllegalArgumentException e) {
                        return ResponseEntity.badRequest().body(Map.of(
                                        "error", e.getMessage(),
                                        "note", "Grover's algorithm only works on AES-encrypted data"));
                }
        }

        /**
         * Attack all quantum-vulnerable harvested data.
         * POST /api/hacker/attack/all
         */
        @PostMapping("/attack/all")
        public ResponseEntity<Object> attackAll() {
                log.warn("🚨 BULK QUANTUM ATTACK");

                List<AttackAttempt> results = quantumAttackService.attackAllVulnerable();

                return ResponseEntity.ok(Map.of(
                                "attacksExecuted", results.size(),
                                "results", results));
        }

        /**
         * Get attack history.
         * GET /api/hacker/attacks
         */
        @GetMapping("/attacks")
        public ResponseEntity<List<AttackAttempt>> getAttackHistory() {
                return ResponseEntity.ok(quantumAttackService.getAttackHistory());
        }

        /**
         * Get attack statistics.
         * GET /api/hacker/statistics
         */
        @GetMapping("/statistics")
        public ResponseEntity<Object> getStatistics() {
                return ResponseEntity.ok(quantumAttackService.getStatistics());
        }

        // ==================== Educational Scenarios ====================

        /**
         * Get available attack scenarios with educational descriptions.
         * GET /api/hacker/scenarios
         */
        @GetMapping("/scenarios")
        public ResponseEntity<Object> getScenarios() {
                return ResponseEntity.ok(List.of(
                                Map.of(
                                                "id", "HNDL_RSA",
                                                "name", "Harvest Now, Decrypt Later (RSA)",
                                                KEY_DESCRIPTION,
                                                "Demonstrates capturing RSA-encrypted data and decrypting with Shor's algorithm",
                                                KEY_TARGET_ALGORITHM, "RSA-2048",
                                                KEY_QUANTUM_ATTACK, "Shor's Algorithm",
                                                "classicalBreakTime", "300+ trillion years",
                                                "quantumBreakTime", "~8 hours",
                                                KEY_EDUCATION,
                                                "Shows why RSA must be replaced before quantum computers mature"),
                                Map.of(
                                                "id", "HNDL_AES",
                                                "name", "Grover's Attack on AES",
                                                KEY_DESCRIPTION,
                                                "Demonstrates Grover's algorithm reducing AES security by half",
                                                KEY_TARGET_ALGORITHM, "AES-128/256",
                                                KEY_QUANTUM_ATTACK, "Grover's Algorithm",
                                                "securityReduction", "AES-128: 128→64 bits, AES-256: 256→128 bits",
                                                KEY_EDUCATION,
                                                "Shows quadratic speedup but AES-256 remains practically secure"),
                                Map.of(
                                                "id", "PQC_PROTECTION",
                                                "name", "Post-Quantum Protection",
                                                KEY_DESCRIPTION,
                                                "Demonstrates how ML-KEM and ML-DSA resist quantum attacks",
                                                KEY_TARGET_ALGORITHM, "ML-DSA, ML-KEM",
                                                KEY_QUANTUM_ATTACK, "NONE EFFECTIVE",
                                                "protection", "Complete immunity to Shor's and Grover's algorithms",
                                                KEY_EDUCATION,
                                                "Shows the importance of migrating to NIST PQC standards NOW"),
                                Map.of(
                                                "id", "TIMING_ATTACK",
                                                "name", "Timing Side-Channel Attack",
                                                KEY_DESCRIPTION, "Demonstrates timing analysis to extract secrets",
                                                KEY_TARGET_ALGORITHM, "Any with timing leaks",
                                                "classicalAttack", "Statistical timing analysis",
                                                KEY_EDUCATION, "Shows importance of constant-time implementations")));
        }

        /**
         * Get quantum computing timeline projection.
         * GET /api/hacker/timeline
         */
        @GetMapping("/timeline")
        public ResponseEntity<Object> getQuantumTimeline() {
                return ResponseEntity.ok(Map.of(
                                "currentYear", 2024,
                                "milestones", List.of(
                                                Map.of("year", 2024, KEY_EVENT, "IBM Condor: 1,121 qubits available"),
                                                Map.of("year", 2025, KEY_EVENT, "Expected: 5,000 qubit systems"),
                                                Map.of("year", 2027, KEY_EVENT,
                                                                "Projected: Error-corrected logical qubits"),
                                                Map.of("year", 2030, KEY_EVENT,
                                                                "Projected: Cryptographically relevant QC"),
                                                Map.of("year", 2035, KEY_EVENT,
                                                                "Projected: Widespread quantum advantage")),
                                "rsaBreakEstimate", Map.of(
                                                "qubitsNeeded", 4000,
                                                "estimatedYear", "2030-2035",
                                                KEY_RECOMMENDATION, "Migrate to ML-KEM NOW"),
                                KEY_RECOMMENDATION, "All sensitive data encrypted today with RSA/classical methods " +
                                                "should be considered compromised by 2035. Migrate to PQC immediately."));
        }

        // ==================== GPU Quantum Attack Endpoints ====================

        /**
         * Get GPU information for cuQuantum simulation.
         * GET /api/hacker/gpu
         */
        @GetMapping("/gpu")
        public ResponseEntity<Object> getGpuInfo() {
                log.info("🎮 GPU info requested");
                return ResponseEntity.ok(cuQuantumSimulator.getGpuInfo());
        }

        /**
         * Get GPU status including availability and memory usage.
         * GET /api/hacker/gpu/status
         */
        @GetMapping("/gpu/status")
        public ResponseEntity<Object> getGpuStatus() {
                log.info("🎮 GPU status requested");
                return ResponseEntity.ok(Map.of(
                        "gpuInfo", cuQuantumSimulator.getGpuInfo(),
                        "gpuAvailable", cuQuantumSimulator.isGpuAvailable(),
                        "gpuRequired", cuQuantumSimulator.isGpuRequired(),
                        "gpuName", cuQuantumSimulator.getGpuName(),
                        "gpuMemoryMB", cuQuantumSimulator.getGpuMemoryMB(),
                        "gpuMemoryUsedMB", cuQuantumSimulator.getGpuMemoryUsedMB(),
                        "computeCapability", cuQuantumSimulator.getComputeCapability(),
                        "timeoutLimitHours", 1,
                        KEY_MESSAGE, cuQuantumSimulator.isGpuAvailable() 
                                ? "✅ GPU is available and ready for quantum simulation"
                                : "⚠️ GPU NOT AVAILABLE - Running in degraded mode!"
                ));
        }

        /**
         * Get detailed process logs from quantum operations.
         * GET /api/hacker/quantum/logs
         */
        @GetMapping("/quantum/logs")
        public ResponseEntity<Object> getQuantumLogs() {
                log.info("📋 Quantum process logs requested");
                return ResponseEntity.ok(Map.of(
                        "logs", cuQuantumSimulator.getProcessLogs(),
                        "totalEntries", cuQuantumSimulator.getProcessLogs().size(),
                        "gpuStatus", Map.of(
                                "available", cuQuantumSimulator.isGpuAvailable(),
                                "name", cuQuantumSimulator.getGpuName(),
                                "memoryUsedMB", cuQuantumSimulator.getGpuMemoryUsedMB()
                        )
                ));
        }

        /**
         * Clear process logs.
         * DELETE /api/hacker/quantum/logs
         */
        @DeleteMapping("/quantum/logs")
        public ResponseEntity<Object> clearQuantumLogs() {
                log.info("🗑️ Clearing quantum process logs");
                cuQuantumSimulator.getProcessLogs().clear();
                return ResponseEntity.ok(Map.of("cleared", true, KEY_MESSAGE, "Process logs cleared"));
        }

        /**
         * HARVEST: Intercept real encrypted transaction logs from Government Portal.
         * POST /api/hacker/harvest/transactions
         * 
         * This fetches REAL encrypted data from gov-portal /api/transactions endpoint.
         */
        @PostMapping("/harvest/transactions")
        public ResponseEntity<Object> harvestTransactions() {
                log.warn("🕵️ HARVEST REQUEST: Intercepting encrypted transactions from Government Portal...");
                
                TransactionHarvester.InterceptionResult result = transactionHarvester.harvestTransactionLogs();
                
                return ResponseEntity.ok(Map.of(
                        "harvest", result,
                        "gpu", cuQuantumSimulator.getGpuInfo(),
                        KEY_MESSAGE, result.isSuccess() 
                                ? "✅ " + result.getTransactionCount() + " encrypted transactions harvested!" 
                                : "❌ Harvest failed: " + result.getMessage()
                ));
        }

        /**
         * ATTACK: Execute cuQuantum GPU-accelerated quantum attack on harvested data.
         * POST /api/hacker/quantum-attack
         * 
         * Uses Shor's Algorithm to break RSA, demonstrates ML-KEM resistance.
         */
        @PostMapping("/quantum-attack")
        public ResponseEntity<Object> executeQuantumAttack() {
                log.warn("⚛️ QUANTUM ATTACK: Deploying Shor's Algorithm via cuQuantum GPU Simulator...");
                
                TransactionHarvester.QuantumAttackReport report = transactionHarvester.executeQuantumAttack();
                
                return ResponseEntity.ok(Map.of(
                        "attack", report,
                        "summary", Map.of(
                                "totalTargets", report.getTotalTargets(),
                                "rsaBroken", report.getRsaKeysBroken(),
                                "pqcProtected", report.getPqcProtectedCount(),
                                "severity", report.getSeverity(),
                                "result", report.getOverallResult()
                        )
                ));
        }

        /**
         * Full HNDL scenario: Harvest + Attack in one call.
         * POST /api/hacker/hndl/full
         */
        @PostMapping("/hndl/full")
        public ResponseEntity<Object> executeFullHNDL() {
                log.warn("🚨 FULL HNDL ATTACK: Harvest Now, Decrypt Later scenario initiated!");
                
                // Phase 1: Harvest
                TransactionHarvester.InterceptionResult harvestResult = transactionHarvester.harvestTransactionLogs();
                
                if (!harvestResult.isSuccess()) {
                        return ResponseEntity.ok(Map.of(
                                "phase1_harvest", harvestResult,
                                "phase2_attack", "SKIPPED - No data harvested",
                                KEY_SUCCESS, false
                        ));
                }
                
                // Phase 2: Quantum Attack
                TransactionHarvester.QuantumAttackReport attackReport = transactionHarvester.executeQuantumAttack();
                
                return ResponseEntity.ok(Map.of(
                        "phase1_harvest", Map.of(
                                KEY_SUCCESS, true,
                                "transactionsIntercepted", harvestResult.getTransactionCount(),
                                "rawData", harvestResult.getRawDataCaptured()
                        ),
                        "phase2_attack", Map.of(
                                "gpuUsed", attackReport.getGpuInfo().getGpuName(),
                                "totalTargets", attackReport.getTotalTargets(),
                                "rsaBroken", attackReport.getRsaKeysBroken(),
                                "pqcProtected", attackReport.getPqcProtectedCount(),
                                "results", attackReport.getAttackResults()
                        ),
                        "summary", Map.of(
                                "severity", attackReport.getSeverity(),
                                "result", attackReport.getOverallResult(),
                                KEY_RECOMMENDATION, attackReport.getRsaKeysBroken() > 0 
                                        ? "⚠️ RSA encryption is VULNERABLE! Migrate to ML-KEM immediately!"
                                        : "✅ All data protected with Post-Quantum Cryptography"
                        )
                ));
        }

        /**
         * Get harvested transaction count.
         * GET /api/hacker/harvest/count
         */
        @GetMapping("/harvest/count")
        public ResponseEntity<Object> getHarvestedCount() {
                return ResponseEntity.ok(Map.of(
                        "harvestedCount", transactionHarvester.getHarvestedCount()
                ));
        }

        /**
         * Clear harvested data.
         * DELETE /api/hacker/harvest
         */
        @DeleteMapping("/harvest")
        public ResponseEntity<Object> clearHarvest() {
                transactionHarvester.clearHarvestedData();
                return ResponseEntity.ok(Map.of(
                        KEY_MESSAGE, "Harvested data cleared",
                        "count", 0
                ));
        }

        // ==================== Python cuQuantum Service Endpoints ====================

        /**
         * Get Python cuQuantum service status.
         * GET /api/hacker/quantum/status
         */
        @GetMapping("/quantum/status")
        public ResponseEntity<Object> getQuantumStatus() {
                log.info("⚛️ Checking Python cuQuantum service status...");
                return ResponseEntity.ok(Map.of(
                        "pythonService", pythonQuantumClient.getStatus(),
                        "javaSimulator", cuQuantumSimulator.getGpuInfo(),
                        "pythonServiceAvailable", pythonQuantumClient.isServiceAvailable()
                ));
        }

        /**
         * Execute Shor's Algorithm via Python cuQuantum.
         * POST /api/hacker/quantum/shor
         */
        @PostMapping("/quantum/shor")
        public ResponseEntity<Object> runShorsAlgorithm(@RequestBody(required = false) ShorsRequest request) {
                int keyBits = request != null ? request.keyBits() : 2048;
                BigInteger modulus = BigInteger.valueOf(request != null ? request.modulus() : 15);
                
                log.warn("⚛️ SHOR'S ALGORITHM: Attacking RSA-{} via Python cuQuantum...", keyBits);
                
                PythonQuantumClient.ShorsResponse result = pythonQuantumClient.runShorsAlgorithm(modulus, keyBits);
                
                return ResponseEntity.ok(result);
        }

        /**
         * Execute Grover's Algorithm via Python cuQuantum.
         * POST /api/hacker/quantum/grover
         */
        @PostMapping("/quantum/grover")
        public ResponseEntity<Object> runGroversAlgorithm(@RequestBody(required = false) GroversRequest request) {
                int keyBits = request != null ? request.keyBits() : 256;
                
                log.info("🔍 GROVER'S ALGORITHM: Searching {}-bit key space via Python cuQuantum...", keyBits);
                
                PythonQuantumClient.GroversResponse result = pythonQuantumClient.runGroversAlgorithm(keyBits);
                
                return ResponseEntity.ok(result);
        }

        /**
         * Attack RSA via Python cuQuantum.
         * POST /api/hacker/quantum/attack/rsa
         */
        @PostMapping("/quantum/attack/rsa")
        public ResponseEntity<Object> attackRsa(@RequestBody(required = false) RsaAttackRequest request) {
                int keySize = request != null ? request.keySize() : 2048;
                
                log.warn("⚛️ QUANTUM RSA ATTACK: RSA-{} via Python cuQuantum GPU...", keySize);
                
                PythonQuantumClient.RsaAttackResponse result = pythonQuantumClient.attackRsa(keySize);
                
                return ResponseEntity.ok(result);
        }

        /**
         * Attack ML-KEM/Kyber via Python cuQuantum (will fail - PQC is secure!).
         * POST /api/hacker/quantum/attack/lattice
         */
        @PostMapping("/quantum/attack/lattice")
        public ResponseEntity<Object> attackLattice(@RequestBody(required = false) LatticeAttackRequest request) {
                String algorithm = request != null ? request.algorithm() : "ML-KEM-768";
                int securityLevel = request != null ? request.securityLevel() : 3;
                
                log.info("🛡️ QUANTUM LATTICE ATTACK: {} via Python cuQuantum...", algorithm);
                
                PythonQuantumClient.LatticeAttackResponse result = pythonQuantumClient.attackLattice(algorithm, securityLevel);
                
                return ResponseEntity.ok(result);
        }

        // ==================== Request DTOs ====================

        public record InterceptRequest(String targetId) {
        }

        public record AttackRequest(String harvestId) {
        }

        public record HNDLRequest(String targetId, String targetType) {
        }
        
        public record ShorsRequest(long modulus, int keyBits) {
        }
        
        public record GroversRequest(int keyBits) {
        }
        
        public record RsaAttackRequest(int keySize) {
        }
        
        public record LatticeAttackRequest(String algorithm, int securityLevel) {
        }
}
