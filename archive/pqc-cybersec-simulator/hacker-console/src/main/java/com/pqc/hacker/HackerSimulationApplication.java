package com.pqc.hacker;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.security.Security;

/**
 * PQC Hacker Simulation Service
 * 
 * ⚠️ EDUCATIONAL PURPOSES ONLY ⚠️
 * 
 * This service demonstrates quantum computing threats:
 * - Network data interception (HNDL - Harvest Now, Decrypt Later)
 * - Quantum attack simulation (Shor's algorithm for RSA)
 * - Quantum search simulation (Grover's algorithm for AES)
 * - Integration with real quantum providers (IonQ, IBM, Azure)
 * 
 * This service is NOT intended for malicious use. It exists to
 * raise awareness about the importance of Post-Quantum Cryptography.
 */
@SpringBootApplication
@EnableScheduling
@ComponentScan(basePackages = { "com.pqc.hacker", "com.pqc.crypto" })
public class HackerSimulationApplication {

    public static void main(String[] args) {
        // Register Bouncy Castle security providers
        Security.addProvider(new BouncyCastleProvider());
        Security.addProvider(new BouncyCastlePQCProvider());

        printWarningBanner();

        SpringApplication.run(HackerSimulationApplication.class, args);
    }

    private static void printWarningBanner() {
        System.out.println("""

                ╔═══════════════════════════════════════════════════════════════╗
                ║     ⚠️  PQC HACKER SIMULATION - EDUCATIONAL ONLY  ⚠️          ║
                ╠═══════════════════════════════════════════════════════════════╣
                ║                                                               ║
                ║  This service demonstrates quantum computing threats:         ║
                ║  • Network interception (HNDL)                               ║
                ║  • Shor's algorithm (RSA breaking)                           ║
                ║  • Grover's algorithm (AES weakening)                        ║
                ║                                                               ║
                ║  Configure quantum provider API keys for real execution:      ║
                ║  • IBM_QUANTUM_TOKEN - IBM Qiskit Runtime                    ║
                ║  • IONQ_API_KEY - IonQ Quantum Computer                      ║
                ║  • AZURE_QUANTUM_KEY - Azure Quantum                         ║
                ║                                                               ║
                ║  Without API keys, attacks run in LOCAL SIMULATION mode.      ║
                ║                                                               ║
                ╚═══════════════════════════════════════════════════════════════╝

                """);
    }
}
