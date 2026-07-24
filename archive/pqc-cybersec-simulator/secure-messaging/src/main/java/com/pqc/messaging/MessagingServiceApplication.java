package com.pqc.messaging;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

import java.security.Security;

/**
 * PQC Messaging Service
 * 
 * Provides end-to-end encrypted messaging with:
 * - ML-KEM (Kyber768) for quantum-resistant key encapsulation
 * - AES-256-GCM for symmetric encryption
 * - Classical AES fallback support
 * 
 * Features HNDL (Harvest Now, Decrypt Later) tracking to demonstrate
 * the importance of quantum-resistant encryption.
 */
@SpringBootApplication
@ComponentScan(basePackages = { "com.pqc.messaging", "com.pqc.crypto" })
public class MessagingServiceApplication {

    public static void main(String[] args) {
        // Register Bouncy Castle security providers
        Security.addProvider(new BouncyCastleProvider());
        Security.addProvider(new BouncyCastlePQCProvider());

        System.out.println("""

                ╔═══════════════════════════════════════════════════════════════╗
                ║           PQC Messaging Service - Starting                    ║
                ╠═══════════════════════════════════════════════════════════════╣
                ║                                                               ║
                ║  Encryption Algorithms:                                       ║
                ║  • ML-KEM (Kyber768) - Quantum-Resistant                     ║
                ║  • AES-256-GCM - Symmetric Encryption                        ║
                ║                                                               ║
                ║  API Endpoints:                                               ║
                ║  • POST /api/messages/send - Send encrypted message          ║
                ║  • POST /api/messages/{id}/decrypt - Decrypt message         ║
                ║  • GET  /api/messages/inbox/{id} - Get inbox                 ║
                ║                                                               ║
                ╚═══════════════════════════════════════════════════════════════╝

                """);

        SpringApplication.run(MessagingServiceApplication.class, args);
    }
}
