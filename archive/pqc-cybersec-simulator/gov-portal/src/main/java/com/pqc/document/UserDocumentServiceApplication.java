package com.pqc.document;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

import java.security.Security;

/**
 * PQC User & Document Service
 * 
 * A full-featured user registration and document management service
 * with Post-Quantum Cryptography support.
 * 
 * Features:
 * - JWT Authentication
 * - User Registration with PQC Key Generation
 * - Document Management with Digital Signatures
 * - ML-DSA (Dilithium) and RSA-2048 Signing
 * - Role-based Access Control (Admin, Officer, Citizen)
 * 
 * Default Admin: admin / Admin@PQC2024!
 */
@SpringBootApplication
@ComponentScan(basePackages = { "com.pqc.document", "com.pqc.crypto" })
public class UserDocumentServiceApplication {

    public static void main(String[] args) {
        // Register Bouncy Castle security providers
        Security.addProvider(new BouncyCastleProvider());
        Security.addProvider(new BouncyCastlePQCProvider());

        SpringApplication.run(UserDocumentServiceApplication.class, args);
    }
}
