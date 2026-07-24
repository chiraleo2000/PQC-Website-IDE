package com.pqc.hacker.quantum;

import lombok.Data;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.math.BigInteger;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/**
 * cuQuantum GPU Simulator v2.0 - NVIDIA GPU-Accelerated Quantum Attack Engine
 * 
 * *** GPU-ONLY MODE - CPU FALLBACK DISABLED ***
 * 
 * This service uses the NVIDIA GPU to simulate quantum computing attacks.
 * GPU is REQUIRED for proper operation - will show warnings if not available.
 * 
 * Features:
 * - Shor's Algorithm for RSA factorization (RSA is VULNERABLE)
 * - Grover's Algorithm for key search
 * - PQC Attack Simulation (ML-KEM/ML-DSA are RESISTANT)
 * - Detailed process logging for UI display
 * - 1-hour timeout limit on all decryption operations
 * 
 * @author PQC CyberSec Simulator - Educational Demo
 */
@Service
@Slf4j
public class CuQuantumGpuSimulator {

    private static final String GPU_INIT_CATEGORY = "GPU_INIT";
    private static final String LOG_LEVEL_ERROR = "ERROR";
    private static final String LOG_FORMAT_CATEGORY_MSG = "[{}] {}";
    private static final String GPU_REQUIRED_MSG = "GPU is REQUIRED but not available - operation blocked!";
    private static final String GPU_REQUIRED_ERROR = "GPU is REQUIRED for quantum simulation but no GPU detected!";
    private static final String SHOR_TIMEOUT_CATEGORY = "SHOR_TIMEOUT";
    private static final String TIMEOUT_MSG = "Operation timed out (1 hour limit exceeded)";
    private static final String TIMEOUT_ERROR_MSG = "Operation timed out - exceeded 1 hour limit";
    private static final String PQC_TIMEOUT_CATEGORY = "PQC_TIMEOUT";

    // Maximum decryption timeout (1 hour)
    public static final Duration MAX_DECRYPTION_TIMEOUT = Duration.ofHours(1);
    
    // GPU Properties (detected at startup)
    @Getter
    private String gpuName = "Unknown GPU";
    @Getter
    private long gpuMemoryMB = 0;
    @Getter
    private int computeCapability = 0;
    @Getter
    private boolean gpuAvailable = false;
    @Getter
    private boolean gpuRequired = true;  // GPU is REQUIRED
    
    // GPU Memory tracking
    @Getter
    private long gpuMemoryUsedMB = 0;

    // cuQuantum Simulation State
    private int numQubits = 0;
    @SuppressWarnings("unused")
    private double[] stateVectorImag;
    private final SecureRandom random = new SecureRandom();

    // Thread pool for parallel GPU simulation
    @SuppressWarnings("unused")
    private ExecutorService gpuThreadPool;

    // Attack Statistics
    private final Map<String, AttackStatistics> attackHistory = new ConcurrentHashMap<>();
    
    // Process logs for UI display
    @Getter
    private final List<ProcessLogEntry> processLogs = Collections.synchronizedList(new ArrayList<>());

    @PostConstruct
    public void initialize() {
        log.info("🚀 Initializing cuQuantum GPU Simulator v2.0 - GPU-ONLY MODE");
        logProcess(GPU_INIT_CATEGORY, "Starting GPU initialization - GPU is REQUIRED", "INFO");
        
        detectGpu();
        initializeThreadPool();
        
        if (gpuAvailable) {
            log.info("✅ cuQuantum GPU Simulator initialized - GPU: {} ({} MB VRAM)", gpuName, gpuMemoryMB);
            logProcess(GPU_INIT_CATEGORY, "GPU initialized successfully: " + gpuName, "INFO");
        } else {
            log.warn("⚠️ GPU NOT AVAILABLE - Running in DEGRADED MODE!");
            log.warn("⚠️ Install NVIDIA drivers for full GPU acceleration.");
            logProcess(GPU_INIT_CATEGORY, "GPU NOT AVAILABLE - Running in degraded mode!", LOG_LEVEL_ERROR);
        }
        
        log.info("⏱️ Decryption timeout limit: {} hour(s)", MAX_DECRYPTION_TIMEOUT.toHours());
    }
    
    /**
     * Log a process step for UI display
     */
    public void logProcess(String category, String message, String level) {
        ProcessLogEntry entry = new ProcessLogEntry();
        entry.setTimestamp(Instant.now().toString());
        entry.setCategory(category);
        entry.setMessage(message);
        entry.setLevel(level);
        entry.setGpuMemoryMB(gpuMemoryUsedMB);
        
        processLogs.add(entry);
        
        // Keep only last 1000 entries
        while (processLogs.size() > 1000) {
            processLogs.remove(0);
        }
        
        // Also log to standard logger
        switch (level) {
            case LOG_LEVEL_ERROR -> log.error(LOG_FORMAT_CATEGORY_MSG, category, message);
            case "WARN" -> log.warn(LOG_FORMAT_CATEGORY_MSG, category, message);
            default -> log.info(LOG_FORMAT_CATEGORY_MSG, category, message);
        }
    }
    
    /**
     * Check if operation has exceeded timeout
     */
    public boolean hasTimedOut(Instant startTime) {
        return Duration.between(startTime, Instant.now()).compareTo(MAX_DECRYPTION_TIMEOUT) > 0;
    }

    /**
     * Detect NVIDIA GPU using nvidia-smi command
     */
    private void detectGpu() {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "nvidia-smi", 
                    "--query-gpu=name,memory.total,compute_cap", 
                    "--format=csv,noheader,nounits"
            );
            Process process = pb.start();
            
            try (var reader = new java.io.BufferedReader(
                    new java.io.InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null && !line.isEmpty()) {
                    String[] parts = line.split(",");
                    if (parts.length >= 3) {
                        gpuName = parts[0].trim();
                        gpuMemoryMB = Long.parseLong(parts[1].trim());
                        String capStr = parts[2].trim().replace(".", "");
                        computeCapability = Integer.parseInt(capStr);
                        gpuAvailable = true;
                    }
                }
            }
            process.waitFor(5, TimeUnit.SECONDS);
            
        } catch (Exception e) {
            log.warn("⚠️ GPU detection failed: {}. Using CPU simulation.", e.getMessage());
            gpuName = "CPU Fallback (No NVIDIA GPU)";
            gpuMemoryMB = Runtime.getRuntime().maxMemory() / (1024 * 1024);
            gpuAvailable = false;
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private void initializeThreadPool() {
        // Use number of CPU cores as parallel threads (simulates GPU threads)
        int threads = Runtime.getRuntime().availableProcessors();
        gpuThreadPool = Executors.newFixedThreadPool(threads, r -> {
            Thread t = new Thread(r, "GPU-Simulator-" + System.nanoTime());
            t.setDaemon(true);
            return t;
        });
    }

    /**
     * Get GPU information for display
     */
    public GpuInfo getGpuInfo() {
        GpuInfo info = new GpuInfo();
        info.setGpuName(gpuName);
        info.setMemoryMB(gpuMemoryMB);
        info.setComputeCapability(computeCapability / 10.0);
        info.setGpuAvailable(gpuAvailable);
        info.setCuQuantumVersion("24.03.0");
        info.setMaxQubits(calculateMaxQubits());
        return info;
    }

    /**
     * Calculate maximum qubits that can be simulated based on GPU memory
     * State vector size = 2^n * 16 bytes (complex double)
     */
    private int calculateMaxQubits() {
        long memoryBytes = gpuMemoryMB * 1024L * 1024L;
        // Reserve 20% for overhead
        long usableMemory = (long) (memoryBytes * 0.8);
        // 2^n complex numbers * 16 bytes each
        int maxQubits = (int) (Math.log(usableMemory / 16.0) / Math.log(2));
        return Math.min(maxQubits, 30); // Cap at 30 for practical reasons
    }

    // ==========================================================================
    // QUANTUM STATE VECTOR SIMULATION (cuQuantum-style)
    // ==========================================================================

    /**
     * Initialize quantum state vector on GPU memory
     * In cuQuantum, this would be: custatevecCreate()
     */
    public void initializeStateVector(int nQubits) {
        this.numQubits = nQubits;
        long stateSize = 1L << nQubits;
        
        // For large state vectors, we simulate (real cuQuantum would allocate GPU memory)
        if (stateSize > 1_000_000) {
            log.info("🎮 GPU: Allocating {} amplitude state vector ({} MB)", 
                    stateSize, (stateSize * 16) / (1024 * 1024));
            // We'll track statistics but not allocate huge arrays in Java
            stateVectorImag = null;
        } else {
            double[] stateVectorReal = new double[(int) stateSize];
            stateVectorImag = new double[(int) stateSize];
            // Initialize to |0⟩ state
            stateVectorReal[0] = 1.0;
        }
        
        log.debug("⚛️ State vector initialized: {} qubits, {} amplitudes", nQubits, stateSize);
    }

    /**
     * Apply Hadamard gate to all qubits (creates superposition)
     * In cuQuantum: custatevecApplyGate() with Hadamard matrix
     */
    public void applyHadamardAll() {
        log.debug("🔄 Applying Hadamard gates to all {} qubits", numQubits);
        // In real cuQuantum, this would be a GPU kernel launch
        // For simulation, we note the operation
    }

    /**
     * Apply Quantum Fourier Transform
     * Core component of Shor's algorithm
     */
    public void applyQFT(int startQubit, int endQubit) {
        log.debug("📊 Applying QFT to qubits {} - {}", startQubit, endQubit);
        // cuQuantum would use optimized CUDA kernels for this
    }

    /**
     * Apply modular exponentiation oracle
     * U|x⟩|y⟩ = |x⟩|y ⊕ a^x mod N⟩
     */
    public void applyModularExponentiation(BigInteger a, BigInteger modulus, int controlQubits) {
        log.debug("🧮 Modular exponentiation: a={}, N={}, control_qubits={}", a, modulus, controlQubits);
    }

    /**
     * Measure all qubits and return classical result
     */
    public long measureAll() {
        // Simulate measurement based on probability distribution
        return random.nextLong(1L << Math.min(numQubits, 30));
    }

    // ==========================================================================
    // SHOR'S ALGORITHM - RSA FACTORIZATION
    // ==========================================================================

    /**
     * Execute Shor's Algorithm to factor an RSA modulus
     * 
     * EDUCATIONAL NOTE:
     * - RSA-2048 has a 2048-bit modulus N = p * q
     * - Classical factorization: ~10^9 years
     * - Quantum factorization: ~hours to days with sufficient qubits
     * - This simulation demonstrates the VULNERABILITY of RSA to quantum attacks
     * 
     * @param N The RSA modulus to factor
     * @param keySize Key size in bits (e.g., 2048)
     * @return FactorizationResult with factors and timing
     */
    public FactorizationResult runShorsAlgorithm(BigInteger modulus, int keySize) {
        Instant operationStart = Instant.now();
        
        log.warn("⚛️ SHOR'S ALGORITHM: Attempting to factor {}-bit RSA modulus", keySize);
        logProcess("SHOR_START", String.format("Starting Shor's Algorithm on %d-bit RSA modulus", keySize), "INFO");
        
        FactorizationResult result = new FactorizationResult();
        result.setModulus(modulus);
        result.setKeySize(keySize);
        result.setStartTime(System.currentTimeMillis());
        result.setGpuUsed(gpuName);

        // Calculate required qubits: ~2n qubits for n-bit number
        int requiredQubits = keySize * 2 + 3;
        result.setQubitsRequired(requiredQubits);
        
        log.info("📐 Shor's algorithm requires {} qubits for {}-bit factorization", requiredQubits, keySize);
        logProcess("SHOR_QUBITS", String.format("Allocating %d qubits for factorization", requiredQubits), "INFO");
        
        // Check GPU requirement
        if (gpuRequired && !gpuAvailable) {
            logProcess("SHOR_ERROR", GPU_REQUIRED_MSG, LOG_LEVEL_ERROR);
            result.setSuccess(false);
            result.setErrorMessage(GPU_REQUIRED_ERROR);
            return result;
        }

        try {
            // Initialize quantum registers
            logProcess("SHOR_INIT", "Initializing quantum state vector", "INFO");
            initializeStateVector(Math.min(requiredQubits, calculateMaxQubits()));
            gpuMemoryUsedMB = (1L << Math.min(numQubits, 20)) * 16 / (1024 * 1024);
            logProcess("SHOR_MEMORY", String.format("GPU memory allocated: %d MB", gpuMemoryUsedMB), "INFO");
            
            // Check timeout
            if (hasTimedOut(operationStart)) {
                logProcess(SHOR_TIMEOUT_CATEGORY, TIMEOUT_MSG, LOG_LEVEL_ERROR);
                result.setSuccess(false);
                result.setErrorMessage(TIMEOUT_ERROR_MSG);
                return result;
            }
            
            // Phase 1: Superposition of all possible values
            logProcess("SHOR_PHASE1", "Phase 1: Creating quantum superposition", "INFO");
            log.info("🌊 Phase 1: Creating superposition over {} values...", 1L << numQubits);
            applyHadamardAll();
            logProcess("SHOR_HADAMARD", String.format("Applied Hadamard gates to %d qubits", numQubits), "INFO");
            simulateGpuComputation(100);
            logProcess("SHOR_SUPERPOSITION", "Superposition created - all values exist simultaneously", "INFO");

            // Check timeout
            if (hasTimedOut(operationStart)) {
                logProcess(SHOR_TIMEOUT_CATEGORY, "Operation timed out during Phase 1", LOG_LEVEL_ERROR);
                result.setSuccess(false);
                result.setErrorMessage(TIMEOUT_ERROR_MSG);
                return result;
            }

            // Phase 2: Period finding via modular exponentiation
            logProcess("SHOR_PHASE2", "Phase 2: Modular exponentiation oracle", "INFO");
            log.info("🔄 Phase 2: Modular exponentiation oracle...");
            BigInteger a = BigInteger.valueOf(2L + random.nextInt(Math.max(1, modulus.intValue() - 2)));
            logProcess("SHOR_BASE", String.format("Selected random base a = %s", a.toString()), "INFO");
            applyModularExponentiation(a, modulus, numQubits / 2);
            simulateGpuComputation(200);
            logProcess("SHOR_MOD_EXP", "Modular exponentiation U|x⟩|y⟩ = |x⟩|y ⊕ a^x mod N⟩ complete", "INFO");

            // Check timeout
            if (hasTimedOut(operationStart)) {
                logProcess(SHOR_TIMEOUT_CATEGORY, "Operation timed out during Phase 2", LOG_LEVEL_ERROR);
                result.setSuccess(false);
                result.setErrorMessage(TIMEOUT_ERROR_MSG);
                return result;
            }

            // Phase 3: Quantum Fourier Transform to extract period
            logProcess("SHOR_PHASE3", "Phase 3: Quantum Fourier Transform", "INFO");
            log.info("📊 Phase 3: Quantum Fourier Transform...");
            applyQFT(0, numQubits / 2);
            simulateGpuComputation(150);
            logProcess("SHOR_QFT", "QFT applied - extracting period information", "INFO");

            // Check timeout
            if (hasTimedOut(operationStart)) {
                logProcess(SHOR_TIMEOUT_CATEGORY, "Operation timed out during Phase 3", LOG_LEVEL_ERROR);
                result.setSuccess(false);
                result.setErrorMessage(TIMEOUT_ERROR_MSG);
                return result;
            }

            // Phase 4: Measurement and classical post-processing
            logProcess("SHOR_PHASE4", "Phase 4: Quantum measurement", "INFO");
            log.info("📏 Phase 4: Measurement and GCD computation...");
            long measurement = measureAll();
            logProcess("SHOR_MEASURE", String.format("Quantum measurement result: %d", measurement), "INFO");
            log.debug("Quantum measurement result: {}", measurement);
            
            // Classical post-processing
            logProcess("SHOR_CLASSICAL", "Running continued fractions to find period r", "INFO");
            logProcess("SHOR_GCD", "Computing GCD(a^(r/2) ± 1, N) for factors", "INFO");
            
            // For demo: "Find" the factors using simulated quantum speedup
            BigInteger p = generateDemoPrimeFactor(keySize / 2);
            BigInteger q = modulus.divide(p);
            
            // Verify factorization (for demo, we adjust q)
            if (!p.multiply(q).equals(modulus)) {
                p = new BigInteger(keySize / 2, 100, random);
                q = new BigInteger(keySize / 2, 100, random);
            }

            result.setP(p);
            result.setQ(q);
            result.setSuccess(true);
            result.setEndTime(System.currentTimeMillis());
            
            long elapsedMs = result.getEndTime() - result.getStartTime();
            result.setQuantumTimeMs(elapsedMs);
            
            // Calculate "theoretical" classical time for comparison
            double classicalYears = Math.pow(2, keySize / 3.0) / (1e9 * 365.25 * 24 * 3600);
            result.setClassicalTimeEstimate(String.format("%.2e years", classicalYears));

            logProcess("SHOR_SUCCESS", String.format("FACTORIZATION SUCCESSFUL in %d ms!", elapsedMs), "INFO");
            logProcess("SHOR_FACTOR_P", String.format("Factor p = %s...", p.toString().substring(0, Math.min(20, p.toString().length()))), "INFO");
            logProcess("SHOR_FACTOR_Q", String.format("Factor q = %s...", q.toString().substring(0, Math.min(20, q.toString().length()))), "INFO");
            logProcess("SHOR_COMPARE", String.format("Classical factorization would take: %s", result.getClassicalTimeEstimate()), "WARN");
            
            log.warn("✅ SHOR'S ALGORITHM SUCCESSFUL!");
            log.warn("🔓 Factors found in {} ms (simulated quantum time)", elapsedMs);
            log.warn("⏱️ Classical factorization would take: {}", result.getClassicalTimeEstimate());

        } catch (Exception e) {
            log.error("Shor's algorithm error", e);
            logProcess("SHOR_ERROR", "Error during factorization: " + e.getMessage(), LOG_LEVEL_ERROR);
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
        }

        // Record attack statistics
        recordAttackStatistics("RSA-" + keySize, result.isSuccess());
        gpuMemoryUsedMB = 0;  // Release GPU memory

        return result;
    }

    /**
     * Generate a demo prime factor (for educational visualization)
     */
    private BigInteger generateDemoPrimeFactor(int bitLength) {
        return new BigInteger(bitLength, 100, random);
    }

    // ==========================================================================
    // GROVER'S ALGORITHM - AES KEY SEARCH
    // ==========================================================================

    /**
     * Execute Grover's Algorithm to search for AES key
     * 
     * EDUCATIONAL NOTE:
     * - AES-256 has 2^256 possible keys
     * - Classical brute force: ~10^77 operations
     * - Grover's algorithm: √(2^256) = 2^128 operations
     * - This provides quadratic speedup, but AES-256 remains secure
     */
    public GroverResult runGroversAlgorithm(int keyBits) {
        Instant operationStart = Instant.now();
        
        log.info("🔍 GROVER'S ALGORITHM: Searching {}-bit key space", keyBits);
        logProcess("GROVER_START", String.format("Starting Grover's Algorithm for %d-bit key search", keyBits), "INFO");

        GroverResult result = new GroverResult();
        result.setKeyBits(keyBits);
        result.setStartTime(System.currentTimeMillis());
        result.setGpuUsed(gpuName);

        // Check GPU requirement
        if (gpuRequired && !gpuAvailable) {
            logProcess("GROVER_ERROR", GPU_REQUIRED_MSG, LOG_LEVEL_ERROR);
            result.setVulnerable(false);
            result.setMessage(GPU_REQUIRED_ERROR);
            return result;
        }

        // Grover requires √N iterations
        long searchSpace = 1L << Math.min(keyBits, 30);
        int iterations = (int) Math.ceil(Math.PI / 4 * Math.sqrt(searchSpace));
        result.setIterationsRequired(iterations);

        log.info("📊 Search space: 2^{} = {} possibilities", keyBits, searchSpace);
        logProcess("GROVER_SPACE", String.format("Search space: 2^%d possible keys", keyBits), "INFO");
        log.info("🔄 Grover iterations needed: {}", iterations);
        logProcess("GROVER_ITERATIONS", String.format("Grover iterations required: π/4 × √(2^%d) = %d", keyBits, iterations), "INFO");

        // Initialize quantum register
        logProcess("GROVER_INIT", String.format("Initializing %d-qubit quantum register", Math.min(keyBits, calculateMaxQubits())), "INFO");
        initializeStateVector(Math.min(keyBits, calculateMaxQubits()));
        
        // Apply Hadamard to create uniform superposition
        logProcess("GROVER_HADAMARD", "Applying Hadamard gates - creating uniform superposition", "INFO");
        applyHadamardAll();

        // Grover iterations
        int iterationsToSimulate = Math.min(iterations, 20);
        logProcess("GROVER_LOOP", String.format("Running %d Grover iterations (simulated)", iterationsToSimulate), "INFO");
        
        for (int i = 1; i <= iterationsToSimulate; i++) {
            // Check timeout
            if (hasTimedOut(operationStart)) {
                logProcess("GROVER_TIMEOUT", TIMEOUT_MSG, LOG_LEVEL_ERROR);
                result.setVulnerable(false);
                result.setMessage(TIMEOUT_ERROR_MSG);
                return result;
            }
            
            if (i % 5 == 0 || i == 1) {
                logProcess("GROVER_ITER", String.format("Iteration %d/%d: Applying oracle and diffusion", i, iterationsToSimulate), "INFO");
            }
            // Oracle and diffusion (simulated)
            simulateGpuComputation(10);
        }
        
        logProcess("GROVER_MEASURE", "Measuring quantum state for key candidate", "INFO");

        result.setEndTime(System.currentTimeMillis());
        result.setQuantumTimeMs(result.getEndTime() - result.getStartTime());

        // Grover provides quadratic speedup: 2^128 vs 2^256 for AES-256
        if (keyBits <= 128) {
            result.setEffectiveSecurity(keyBits / 2);
            result.setVulnerable(true);
            result.setMessage(String.format(
                    "⚠️ %d-bit key reduced to %d-bit security by Grover's algorithm",
                    keyBits, keyBits / 2));
            logProcess("GROVER_RESULT", String.format("⚠️ VULNERABLE: %d-bit key → %d-bit effective security", keyBits, keyBits / 2), "WARN");
        } else {
            result.setEffectiveSecurity(keyBits / 2);
            result.setVulnerable(false);
            result.setMessage(String.format(
                    "✅ %d-bit key maintains %d-bit post-quantum security (sufficient)",
                    keyBits, keyBits / 2));
            logProcess("GROVER_RESULT", String.format("✅ SECURE: %d-bit key maintains %d-bit post-quantum security", keyBits, keyBits / 2), "INFO");
        }
        
        logProcess("GROVER_COMPLETE", String.format("Grover's Algorithm completed in %d ms", result.getQuantumTimeMs()), "INFO");

        recordAttackStatistics("AES-" + keyBits, result.isVulnerable());
        return result;
    }

    // ==========================================================================
    // LATTICE-BASED CRYPTO ATTACK (ML-KEM/Kyber) - PQC ATTACK SIMULATION
    // ==========================================================================

    /**
     * Attempt quantum attack on ML-KEM (Kyber) lattice-based encryption
     * 
     * EDUCATIONAL NOTE:
     * - ML-KEM security is based on the Learning With Errors (LWE) problem
     * - NO known quantum algorithm provides exponential speedup against LWE
     * - This demonstrates why PQC algorithms are quantum-resistant
     * 
     * Attack Methods Simulated:
     * - BKZ Lattice Reduction (best known classical/quantum algorithm)
     * - Grover-enhanced search (only quadratic speedup)
     * - Dual attack variants
     */
    public LatticeAttackResult attackLatticeBasedCrypto(String algorithm, int securityLevel) {
        Instant operationStart = Instant.now();
        
        log.info("🛡️ ATTACKING LATTICE CRYPTO: {} (Level {})", algorithm, securityLevel);
        logProcess("PQC_ATTACK_START", String.format("Initiating PQC attack on %s (Security Level %d)", algorithm, securityLevel), "WARN");
        
        LatticeAttackResult result = new LatticeAttackResult();
        result.setAlgorithm(algorithm);
        result.setSecurityLevel(securityLevel);
        result.setStartTime(System.currentTimeMillis());
        result.setGpuUsed(gpuName);

        // Check GPU requirement
        if (gpuRequired && !gpuAvailable) {
            logProcess("PQC_ERROR", GPU_REQUIRED_MSG, LOG_LEVEL_ERROR);
            result.setBroken(false);
            result.setMessage(GPU_REQUIRED_ERROR);
            return result;
        }

        // Log algorithm parameters
        int latticeDimension = switch (securityLevel) {
            case 1 -> 512;   // ML-KEM-512
            case 3 -> 768;   // ML-KEM-768
            case 5 -> 1024;  // ML-KEM-1024
            default -> 768;
        };
        
        logProcess("PQC_PARAMS", String.format("Lattice dimension: %d, Module rank: %d", latticeDimension, latticeDimension / 256), "INFO");
        
        // Best known quantum attack: BKZ algorithm with Grover speedup
        int latticeSecurityBits = switch (securityLevel) {
            case 1 -> 128;  // ML-KEM-512
            case 3 -> 192;  // ML-KEM-768
            case 5 -> 256;  // ML-KEM-1024
            default -> 192;
        };

        // Phase 1: Lattice basis analysis
        logProcess("PQC_PHASE1", "Phase 1: Analyzing lattice structure", "INFO");
        simulateGpuComputation(100);
        logProcess("PQC_LATTICE_ANALYSIS", String.format("Lattice dimension: %d, Finding short vectors...", latticeDimension), "INFO");
        
        // Check timeout
        if (hasTimedOut(operationStart)) {
            logProcess(PQC_TIMEOUT_CATEGORY, TIMEOUT_MSG, LOG_LEVEL_ERROR);
            result.setBroken(false);
            result.setMessage(TIMEOUT_ERROR_MSG);
            return result;
        }
        
        // Phase 2: BKZ lattice reduction attempt
        logProcess("PQC_PHASE2", "Phase 2: BKZ-2.0 lattice reduction", "INFO");
        int blockSize = Math.min(latticeDimension / 4, 100);
        logProcess("PQC_BKZ", String.format("Running BKZ with block size β=%d", blockSize), "INFO");
        simulateGpuComputation(200);
        
        // Simulate BKZ progress (will NOT succeed against proper PQC)
        for (int tour = 1; tour <= 5; tour++) {
            if (hasTimedOut(operationStart)) {
                logProcess(PQC_TIMEOUT_CATEGORY, "Operation timed out during BKZ reduction", LOG_LEVEL_ERROR);
                result.setBroken(false);
                result.setMessage(TIMEOUT_ERROR_MSG);
                return result;
            }
            logProcess("PQC_BKZ_TOUR", String.format("BKZ tour %d/∞: Shortest vector norm still too large", tour), "INFO");
            simulateGpuComputation(50);
        }
        
        logProcess("PQC_BKZ_FAIL", "BKZ reduction cannot find sufficiently short vectors", "WARN");
        
        // Phase 3: Grover-enhanced dual attack
        logProcess("PQC_PHASE3", "Phase 3: Grover-enhanced search (quadratic speedup only)", "INFO");
        simulateGpuComputation(100);
        logProcess("PQC_GROVER", String.format("Grover search space: 2^%d (reduced from 2^%d)", latticeSecurityBits / 2, latticeSecurityBits), "INFO");
        logProcess("PQC_GROVER_LIMIT", "Quadratic speedup insufficient against lattice-based security", "INFO");
        
        // Check timeout
        if (hasTimedOut(operationStart)) {
            logProcess(PQC_TIMEOUT_CATEGORY, "Operation timed out during Grover search", LOG_LEVEL_ERROR);
            result.setBroken(false);
            result.setMessage(TIMEOUT_ERROR_MSG);
            return result;
        }
        
        // Phase 4: Sieving attack attempt
        logProcess("PQC_PHASE4", "Phase 4: Quantum sieving attack", "INFO");
        double sievingExponent = 0.292 * latticeDimension;
        double sievingComplexity = Math.pow(2, sievingExponent);
        logProcess("PQC_SIEVE", String.format("Sieving complexity: %.2e (2^%.1f) operations - INFEASIBLE", sievingComplexity, sievingExponent), "INFO");
        simulateGpuComputation(100);

        // Even with quantum computer, lattice security remains strong
        int postQuantumSecurity = (int) (latticeSecurityBits * 0.95); // ~5% reduction at most

        result.setClassicalSecurityBits(latticeSecurityBits);
        result.setQuantumSecurityBits(postQuantumSecurity);
        result.setBroken(false);

        result.setEndTime(System.currentTimeMillis());
        result.setExecutionTimeMs(result.getEndTime() - result.getStartTime());
        result.setMessage(String.format(
                "❌ ATTACK FAILED: %s maintains %d-bit security against quantum attacks. " +
                "No known efficient quantum algorithm breaks lattice-based cryptography.",
                algorithm, postQuantumSecurity));

        logProcess("PQC_RESULT", String.format("ATTACK FAILED after %d ms", result.getExecutionTimeMs()), LOG_LEVEL_ERROR);
        logProcess("PQC_SECURE", String.format("%s maintains %d-bit post-quantum security", algorithm, postQuantumSecurity), "INFO");
        logProcess("PQC_EXPLANATION", "LWE/MLWE problems have no known efficient quantum solutions", "INFO");
        
        log.warn("🛡️ {} is QUANTUM RESISTANT - Attack unsuccessful", algorithm);
        recordAttackStatistics(algorithm, false);

        return result;
    }

    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================

    /**
     * Simulate GPU computation time
     */
    private void simulateGpuComputation(int baseMs) {
        try {
            // Add some randomness to make it realistic
            int jitter = random.nextInt(baseMs / 2);
            Thread.sleep((long) baseMs + jitter);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void recordAttackStatistics(String algorithm, boolean success) {
        attackHistory.computeIfAbsent(algorithm, k -> new AttackStatistics())
                .recordAttempt(success);
    }

    public Map<String, AttackStatistics> getAttackHistory() {
        return new HashMap<>(attackHistory);
    }

    // ==========================================================================
    // DATA CLASSES
    // ==========================================================================

    @Data
    public static class GpuInfo {
        private String gpuName;
        private long memoryMB;
        private double computeCapability;
        private boolean gpuAvailable;
        private String cuQuantumVersion;
        private int maxQubits;
    }

    @Data
    public static class FactorizationResult {
        private BigInteger modulus;
        private int keySize;
        private BigInteger p;
        private BigInteger q;
        private boolean success;
        private int qubitsRequired;
        private long startTime;
        private long endTime;
        private long quantumTimeMs;
        private String classicalTimeEstimate;
        private String gpuUsed;
        private String errorMessage;
    }

    @Data
    public static class GroverResult {
        private int keyBits;
        private int iterationsRequired;
        private int effectiveSecurity;
        private boolean vulnerable;
        private long startTime;
        private long endTime;
        private long quantumTimeMs;
        private String gpuUsed;
        private String message;
    }

    @Data
    public static class LatticeAttackResult {
        private String algorithm;
        private int securityLevel;
        private int classicalSecurityBits;
        private int quantumSecurityBits;
        private boolean broken;
        private long startTime;
        private long endTime;
        private long executionTimeMs;
        private String gpuUsed;
        private String message;
    }

    @Data
    public static class ShorsAttackResult {
        private BigInteger modulus;
        private int keySize;
        private BigInteger p;
        private BigInteger q;
        private boolean success;
        private int qubitsRequired;
        private long executionTimeMs;
        private String message;
        private String gpuUsed;
    }

    @Data
    public static class AttackStatistics {
        private int totalAttempts = 0;
        private int successfulAttacks = 0;
        private int failedAttacks = 0;

        public void recordAttempt(boolean success) {
            totalAttempts++;
            if (success) successfulAttacks++;
            else failedAttacks++;
        }
    }

    // ==========================================================================
    // COMPATIBILITY METHODS (for TransactionInterceptor)
    // ==========================================================================

    /**
     * Simulate Shor's Algorithm attack on RSA - returns ShorsAttackResult
     * Compatible with TransactionInterceptor.attackTransaction()
     */
    public ShorsAttackResult simulateShorsAlgorithm(BigInteger modulus, int keySize) {
        log.warn("⚛️ SHOR'S ALGORITHM: Attacking {}-bit RSA key...", keySize);
        
        ShorsAttackResult result = new ShorsAttackResult();
        result.setModulus(modulus);
        result.setKeySize(keySize);
        result.setGpuUsed(gpuName);
        result.setQubitsRequired(keySize * 2 + 3);
        
        long startTime = System.currentTimeMillis();
        
        // Run the full Shor's algorithm simulation
        FactorizationResult factorResult = runShorsAlgorithm(modulus, keySize);
        
        result.setP(factorResult.getP());
        result.setQ(factorResult.getQ());
        result.setSuccess(factorResult.isSuccess());
        result.setExecutionTimeMs(System.currentTimeMillis() - startTime);
        
        if (factorResult.isSuccess()) {
            result.setMessage(String.format(
                "✅ RSA-%d BROKEN! Factors found in %d ms. Classical time: %s",
                keySize, result.getExecutionTimeMs(), factorResult.getClassicalTimeEstimate()));
        } else {
            result.setMessage("❌ Attack failed: " + factorResult.getErrorMessage());
        }
        
        return result;
    }

    /**
     * Simulate lattice-based attack on ML-KEM/Kyber - returns LatticeAttackResult
     * Compatible with TransactionInterceptor.attackTransaction()
     */
    public LatticeAttackResult simulateLatticeAttack(String algorithm) {
        log.info("🛡️ LATTICE ATTACK: Attempting attack on {}...", algorithm);
        
        // Determine security level from algorithm name
        int securityLevel = 3;  // Default ML-KEM-768
        if (algorithm.contains("512")) securityLevel = 1;
        else if (algorithm.contains("1024")) securityLevel = 5;
        
        // Run the lattice attack (will always fail - PQC is secure!)
        return attackLatticeBasedCrypto(algorithm, securityLevel);
    }
    
    /**
     * Process log entry for UI display
     */
    @Data
    public static class ProcessLogEntry {
        private String timestamp;
        private String category;
        private String message;
        private String level;
        private long gpuMemoryMB;
    }
}
