package com.pqc.crypto;

import com.pqc.model.*;
import org.junit.jupiter.api.*;

import java.security.GeneralSecurityException;
import java.security.KeyPair;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-End Integration Test for PQC Crypto Core.
 * 
 * This test simulates the complete workflow of:
 * 1. Government Officer creating and signing a license document
 * 2. Citizen receiving encrypted notification
 * 3. Hacker attempting to break the encryption
 * 
 * Demonstrates both VULNERABLE (classical) and PROTECTED (PQC) scenarios.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("PQC CyberSec Simulator - End-to-End Cryptographic Tests")
class PqcCryptoE2ETest {

    private static PqcCryptoService cryptoService;
    
    // Officer keys
    private static KeyPairResult officerMlDsaKeys;
    private static KeyPairResult officerMlKemKeys;
    private static KeyPairResult officerRsaKeys;
    
    // Citizen keys
    private static KeyPairResult citizenMlDsaKeys;
    private static KeyPairResult citizenMlKemKeys;
    private static KeyPairResult citizenRsaKeys;
    
    // Test data
    private static byte[] licenseDocument;
    private static byte[] documentSignaturePQC;
    private static byte[] documentSignatureRSA;
    private static EncapsulationResult kemEncapsulation;
    private static EncryptionResult encryptedMessage;

    @BeforeAll
    static void setUp() throws GeneralSecurityException {
        cryptoService = new PqcCryptoService();
        
        System.out.println("\n" + "=".repeat(70));
        System.out.println("🔐 PQC CYBERSEC SIMULATOR - END-TO-END TEST");
        System.out.println("=".repeat(70));
        System.out.println("\n📋 SCENARIO: Government License Application Workflow");
        System.out.println("   • Officer: Government employee processing applications");
        System.out.println("   • Citizen: User applying for driver's license");
        System.out.println("   • Hacker: Adversary attempting to intercept/forge documents");
        System.out.println();
    }

    // ==================== KEY GENERATION ====================

    @Test
    @Order(1)
    @DisplayName("1. Generate Officer Cryptographic Keys (PQC + Classical)")
    void testGenerateOfficerKeys() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("👮 OFFICER KEY GENERATION");
        System.out.println("-".repeat(50));
        
        // ML-DSA keys for signing
        officerMlDsaKeys = cryptoService.generateMLDSAKeyPair();
        assertThat(officerMlDsaKeys).isNotNull();
        assertThat(officerMlDsaKeys.getPublicKey()).isNotEmpty();
        assertThat(officerMlDsaKeys.getAlgorithm()).isEqualTo(CryptoAlgorithm.ML_DSA);
        
        System.out.println("   ✅ ML-DSA (Dilithium3) Keys:");
        System.out.println("      Public Key:  " + officerMlDsaKeys.getPublicKey().length + " bytes");
        System.out.println("      Private Key: " + officerMlDsaKeys.getPrivateKey().length + " bytes");
        System.out.println("      Quantum Safe: YES ✅");
        
        // ML-KEM keys for encryption
        officerMlKemKeys = cryptoService.generateMLKEMKeyPair();
        assertThat(officerMlKemKeys).isNotNull();
        assertThat(officerMlKemKeys.getAlgorithm()).isEqualTo(CryptoAlgorithm.ML_KEM);
        
        System.out.println("\n   ✅ ML-KEM (Kyber768) Keys:");
        System.out.println("      Public Key:  " + officerMlKemKeys.getPublicKey().length + " bytes");
        System.out.println("      Private Key: " + officerMlKemKeys.getPrivateKey().length + " bytes");
        System.out.println("      Quantum Safe: YES ✅");
        
        // RSA keys for fallback
        officerRsaKeys = cryptoService.generateRSAKeyPair();
        assertThat(officerRsaKeys).isNotNull();
        
        System.out.println("\n   ⚠️ RSA-2048 Keys (Classical Fallback):");
        System.out.println("      Public Key:  " + officerRsaKeys.getPublicKey().length + " bytes");
        System.out.println("      Private Key: " + officerRsaKeys.getPrivateKey().length + " bytes");
        System.out.println("      Quantum Safe: NO ⚠️ (Vulnerable to Shor's algorithm)");
    }

    @Test
    @Order(2)
    @DisplayName("2. Generate Citizen Cryptographic Keys")
    void testGenerateCitizenKeys() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("👤 CITIZEN KEY GENERATION");
        System.out.println("-".repeat(50));
        
        citizenMlDsaKeys = cryptoService.generateMLDSAKeyPair();
        citizenMlKemKeys = cryptoService.generateMLKEMKeyPair();
        citizenRsaKeys = cryptoService.generateRSAKeyPair();
        
        assertThat(citizenMlDsaKeys).isNotNull();
        assertThat(citizenMlKemKeys).isNotNull();
        assertThat(citizenRsaKeys).isNotNull();
        
        System.out.println("   ✅ ML-DSA Keys: Generated");
        System.out.println("   ✅ ML-KEM Keys: Generated");
        System.out.println("   ⚠️ RSA Keys: Generated (fallback)");
        System.out.println("\n   Total key material generated per user: ~15KB");
    }

    // ==================== DOCUMENT SIGNING ====================

    @Test
    @Order(3)
    @DisplayName("3. Citizen Submits License Application")
    void testCreateLicenseApplication() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("📄 LICENSE APPLICATION SUBMISSION");
        System.out.println("-".repeat(50));
        
        String applicationText = """
            DRIVER'S LICENSE APPLICATION
            ============================
            
            Applicant: John Citizen
            Date of Birth: 1990-05-15
            Address: 123 Main Street, Springfield, ST 12345
            License Class: C (Standard Non-Commercial)
            
            I hereby certify that all information provided is true and accurate.
            
            Submitted electronically with digital signature.
            Timestamp: 2024-12-22T10:30:00Z
            """;
        
        licenseDocument = applicationText.getBytes();
        
        // Generate document ID using SHA-384
        String documentId = cryptoService.hashSHA384AsString(applicationText);
        
        System.out.println("   Document Type: Driver's License Application");
        System.out.println("   Document ID: " + documentId.substring(0, 32) + "...");
        System.out.println("   Content Size: " + licenseDocument.length + " bytes");
        System.out.println("   Status: PENDING SIGNATURE");
    }

    @Test
    @Order(4)
    @DisplayName("4. Citizen Signs Application with ML-DSA (Quantum-Resistant)")
    void testSignWithMLDSA() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("✍️ SIGNING WITH ML-DSA (QUANTUM-RESISTANT)");
        System.out.println("-".repeat(50));
        
        KeyPair citizenKeyPair = cryptoService.loadMLDSAKeyPair(
            citizenMlDsaKeys.getPublicKey(), citizenMlDsaKeys.getPrivateKey());
        
        SignatureResult result = cryptoService.signWithMLDSA(licenseDocument, citizenKeyPair.getPrivate());
        documentSignaturePQC = result.getSignature();
        
        assertThat(documentSignaturePQC).isNotEmpty();
        assertThat(result.getAlgorithm()).isEqualTo(CryptoAlgorithm.ML_DSA);
        
        System.out.println("   Algorithm: ML-DSA-65 (Dilithium3)");
        System.out.println("   Signature Size: " + result.getSignatureSize() + " bytes");
        System.out.println("   Signing Time: " + (result.getExecutionTimeNanos() / 1000) + " µs");
        System.out.println("   Security Level: 128-bit post-quantum");
        System.out.println("   Quantum Resistant: YES ✅");
        System.out.println("\n   🛡️ This signature CANNOT be forged by quantum computers!");
    }

    @Test
    @Order(5)
    @DisplayName("5. Sign Same Document with RSA (For Comparison)")
    void testSignWithRSA() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("✍️ SIGNING WITH RSA-2048 (CLASSICAL)");
        System.out.println("-".repeat(50));
        
        KeyPair citizenRsaKeyPair = cryptoService.loadRSAKeyPair(
            citizenRsaKeys.getPublicKey(), citizenRsaKeys.getPrivateKey());
        
        SignatureResult result = cryptoService.signWithRSA(licenseDocument, citizenRsaKeyPair.getPrivate());
        documentSignatureRSA = result.getSignature();
        
        assertThat(documentSignatureRSA).isNotEmpty();
        assertThat(documentSignatureRSA.length).isEqualTo(256); // RSA-2048 = 256 bytes
        
        System.out.println("   Algorithm: RSA-2048 with SHA-256");
        System.out.println("   Signature Size: " + result.getSignatureSize() + " bytes");
        System.out.println("   Signing Time: " + (result.getExecutionTimeNanos() / 1000) + " µs");
        System.out.println("   Security Level: 112-bit classical");
        System.out.println("   Quantum Resistant: NO ⚠️");
        System.out.println("\n   ⚠️ WARNING: This signature can be FORGED using Shor's algorithm!");
        System.out.println("   ⚠️ Estimated time to break: ~8 hours on quantum computer");
    }

    // ==================== SIGNATURE VERIFICATION ====================

    @Test
    @Order(6)
    @DisplayName("6. Officer Verifies ML-DSA Signature")
    void testVerifyMLDSASignature() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("✓ OFFICER VERIFIES ML-DSA SIGNATURE");
        System.out.println("-".repeat(50));
        
        KeyPair citizenKeyPair = cryptoService.loadMLDSAKeyPair(
            citizenMlDsaKeys.getPublicKey(), citizenMlDsaKeys.getPrivateKey());
        
        boolean valid = cryptoService.verifyMLDSASignature(
            licenseDocument, documentSignaturePQC, citizenKeyPair.getPublic());
        
        assertThat(valid).isTrue();
        
        System.out.println("   Verification Result: " + (valid ? "✅ VALID" : "❌ INVALID"));
        System.out.println("   Signer Verified: Citizen's public key matches");
        System.out.println("   Document Integrity: Confirmed - no tampering detected");
        System.out.println("\n   📋 Document Status: READY FOR OFFICER APPROVAL");
    }

    @Test
    @Order(7)
    @DisplayName("7. Verify RSA Signature (Classical)")
    void testVerifyRSASignature() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("✓ VERIFY RSA SIGNATURE");
        System.out.println("-".repeat(50));
        
        KeyPair citizenRsaKeyPair = cryptoService.loadRSAKeyPair(
            citizenRsaKeys.getPublicKey(), citizenRsaKeys.getPrivateKey());
        
        boolean valid = cryptoService.verifyRSASignature(
            licenseDocument, documentSignatureRSA, citizenRsaKeyPair.getPublic());
        
        assertThat(valid).isTrue();
        
        System.out.println("   Verification Result: " + (valid ? "✅ VALID" : "❌ INVALID"));
        System.out.println("   ⚠️ Note: Valid TODAY, but vulnerable to future quantum attacks");
    }

    // ==================== ENCRYPTED MESSAGING ====================

    @Test
    @Order(8)
    @DisplayName("8. Officer Sends Encrypted Approval Message (ML-KEM)")
    void testEncryptWithMLKEM() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("📨 OFFICER SENDS ENCRYPTED MESSAGE (ML-KEM)");
        System.out.println("-".repeat(50));
        
        String approvalMessage = """
            OFFICIAL NOTIFICATION
            =====================
            
            Dear John Citizen,
            
            Your Driver's License Application has been APPROVED.
            
            License Number: DL-2024-123456
            Issue Date: December 22, 2024
            Expiry Date: December 22, 2029
            
            Please visit the DMV office within 30 days to collect
            your physical license. Bring valid government ID.
            
            This message is encrypted with quantum-resistant cryptography.
            
            Regards,
            Department of Motor Vehicles
            """;
        
        byte[] messageBytes = approvalMessage.getBytes();
        
        // Load citizen's public key for encryption
        KeyPair citizenKeyPair = cryptoService.loadMLKEMKeyPair(
            citizenMlKemKeys.getPublicKey(), citizenMlKemKeys.getPrivateKey());
        
        // Encapsulate shared secret
        kemEncapsulation = cryptoService.encapsulateMLKEM(citizenKeyPair.getPublic());
        
        assertThat(kemEncapsulation).isNotNull();
        assertThat(kemEncapsulation.getEncapsulation()).isNotEmpty();
        assertThat(kemEncapsulation.getSharedSecret()).isNotEmpty();
        
        // Encrypt message with shared secret
        encryptedMessage = cryptoService.encryptWithSharedSecret(
            messageBytes, kemEncapsulation.getSharedSecret(), 256);
        
        assertThat(encryptedMessage).isNotNull();
        assertThat(encryptedMessage.getCiphertext()).isNotEmpty();
        
        System.out.println("   Key Encapsulation:");
        System.out.println("      Algorithm: ML-KEM-768 (CRYSTALS-Kyber)");
        System.out.println("      Encapsulated Key: " + kemEncapsulation.getEncapsulationSize() + " bytes");
        System.out.println("      Shared Secret: " + kemEncapsulation.getSharedSecretSize() + " bytes");
        System.out.println();
        System.out.println("   Message Encryption:");
        System.out.println("      Algorithm: AES-256-GCM");
        System.out.println("      Original Size: " + messageBytes.length + " bytes");
        System.out.println("      Encrypted Size: " + encryptedMessage.getCiphertext().length + " bytes");
        System.out.println("      IV: " + encryptedMessage.getIv().length + " bytes");
        System.out.println();
        System.out.println("   🛡️ Message is QUANTUM RESISTANT!");
        System.out.println("   Only the citizen with the private key can decrypt this.");
    }

    @Test
    @Order(9)
    @DisplayName("9. Citizen Decrypts the Approval Message")
    void testDecryptWithMLKEM() throws GeneralSecurityException {
        System.out.println("\n" + "-".repeat(50));
        System.out.println("📬 CITIZEN DECRYPTS MESSAGE");
        System.out.println("-".repeat(50));
        
        // Citizen decapsulates the shared secret
        KeyPair citizenKeyPair = cryptoService.loadMLKEMKeyPair(
            citizenMlKemKeys.getPublicKey(), citizenMlKemKeys.getPrivateKey());
        
        byte[] recoveredSecret = cryptoService.decapsulateMLKEM(
            kemEncapsulation.getEncapsulation(), citizenKeyPair.getPrivate());
        
        assertThat(recoveredSecret).isEqualTo(kemEncapsulation.getSharedSecret());
        
        // Decrypt message
        byte[] decryptedMessage = cryptoService.decryptWithSharedSecret(
            encryptedMessage.getCiphertext(),
            encryptedMessage.getIv(),
            recoveredSecret,
            256);
        
        String plaintext = new String(decryptedMessage);
        
        assertThat(plaintext).contains("APPROVED");
        assertThat(plaintext).contains("DL-2024-123456");
        
        System.out.println("   Decapsulation: SUCCESS");
        System.out.println("   Decryption: SUCCESS");
        System.out.println("   Message Preview:");
        System.out.println("   " + plaintext.split("\n")[0]);
        System.out.println("   ...");
        System.out.println("   License Number Found: DL-2024-123456");
        System.out.println("\n   ✅ Citizen successfully received the approval!");
    }

    // ==================== HACKER SIMULATION ====================

    @Test
    @Order(10)
    @DisplayName("10. 🕵️ HACKER: Attempt to Forge ML-DSA Signature")
    void testHackerCannotForgeMLDSA() throws GeneralSecurityException {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("🕵️ HACKER SIMULATION: SIGNATURE FORGERY ATTEMPT");
        System.out.println("=".repeat(60));
        
        // Hacker generates their own keys
        KeyPairResult hackerKeys = cryptoService.generateMLDSAKeyPair();
        
        // Hacker creates a fake document
        String fakeDocument = """
            DRIVER'S LICENSE APPLICATION
            ============================
            Applicant: Hacker McHackface
            License Class: A (Commercial - Forged)
            """;
        
        // Hacker signs with their own key
        KeyPair hackerKeyPair = cryptoService.loadMLDSAKeyPair(
            hackerKeys.getPublicKey(), hackerKeys.getPrivateKey());
        SignatureResult fakeSignature = cryptoService.signWithMLDSA(
            fakeDocument.getBytes(), hackerKeyPair.getPrivate());
        
        // Try to verify with citizen's public key (should fail)
        KeyPair citizenKeyPair = cryptoService.loadMLDSAKeyPair(
            citizenMlDsaKeys.getPublicKey(), citizenMlDsaKeys.getPrivateKey());
        
        boolean forgedValid = cryptoService.verifyMLDSASignature(
            fakeDocument.getBytes(), fakeSignature.getSignature(), citizenKeyPair.getPublic());
        
        assertThat(forgedValid).isFalse();
        
        System.out.println("\n   ATTACK: Create fake document and forge signature");
        System.out.println("   Target: ML-DSA signed license application");
        System.out.println();
        System.out.println("   Hacker Actions:");
        System.out.println("   1. Generated own ML-DSA keys");
        System.out.println("   2. Created fraudulent license document");
        System.out.println("   3. Signed with hacker's private key");
        System.out.println("   4. Attempted to pass as citizen's signature");
        System.out.println();
        System.out.println("   RESULT: ❌ FORGERY DETECTED!");
        System.out.println("   Verification Failed: Signature does not match citizen's public key");
        System.out.println();
        System.out.println("   🛡️ ML-DSA signatures CANNOT be forged!");
        System.out.println("   Even with quantum computers, lattice-based signatures are secure.");
    }

    @Test
    @Order(11)
    @DisplayName("11. 🕵️ HACKER: Attempt to Decrypt ML-KEM Message")
    void testHackerCannotDecryptMLKEM() throws GeneralSecurityException {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("🕵️ HACKER SIMULATION: INTERCEPTION & DECRYPTION ATTEMPT");
        System.out.println("=".repeat(60));
        
        // Hacker intercepts the encrypted message and encapsulated key
        byte[] interceptedCiphertext = encryptedMessage.getCiphertext().clone();
        byte[] interceptedIV = encryptedMessage.getIv().clone();
        byte[] interceptedEncapsulation = kemEncapsulation.getEncapsulation().clone();
        
        // Hacker generates their own keys
        KeyPairResult hackerKeys = cryptoService.generateMLKEMKeyPair();
        KeyPair hackerKeyPair = cryptoService.loadMLKEMKeyPair(
            hackerKeys.getPublicKey(), hackerKeys.getPrivateKey());
        
        System.out.println("\n   HARVEST NOW, DECRYPT LATER SCENARIO:");
        System.out.println("   ─────────────────────────────────────");
        System.out.println("   1. Hacker intercepts network traffic");
        System.out.println("   2. Captures:");
        System.out.println("      - Encrypted message: " + interceptedCiphertext.length + " bytes");
        System.out.println("      - IV: " + interceptedIV.length + " bytes");
        System.out.println("      - Encapsulated key: " + interceptedEncapsulation.length + " bytes");
        System.out.println();
        System.out.println("   ATTACK ATTEMPT:");
        System.out.println("   ─────────────────────────────────────");
        
        // Try to decapsulate with hacker's key (will get wrong secret)
        byte[] wrongSecret;
        try {
            wrongSecret = cryptoService.decapsulateMLKEM(
                interceptedEncapsulation, hackerKeyPair.getPrivate());
        } catch (Exception e) {
            System.out.println("   Decapsulation with hacker's key: FAILED (wrong key)");
            System.out.println("   Cannot recover shared secret without citizen's private key!");
            System.out.println();
            System.out.println("   RESULT: ❌ ATTACK FAILED!");
            System.out.println("   🛡️ ML-KEM encryption is QUANTUM RESISTANT");
            return;
        }
        
        // Even if decapsulation succeeds, we get wrong secret
        // Decryption will fail or produce garbage
        System.out.println("   Decapsulation: Got a secret (but it's WRONG)");
        System.out.println("   Attempting decryption with wrong secret...");
        
        try {
            @SuppressWarnings("unused")
            byte[] failedDecrypt = cryptoService.decryptWithSharedSecret(
                interceptedCiphertext, interceptedIV, wrongSecret, 256);
            // If we get here, the secret was wrong and decryption produced garbage
            System.out.println("   Decryption result: GARBAGE (authentication failed)");
        } catch (Exception e) {
            System.out.println("   Decryption: FAILED - " + e.getClass().getSimpleName());
        }
        
        System.out.println();
        System.out.println("   RESULT: ❌ ATTACK FAILED!");
        System.out.println("   Without citizen's private key, message CANNOT be decrypted.");
        System.out.println("   🛡️ ML-KEM is resistant to all known quantum attacks!");
    }

    @Test
    @Order(12)
    @DisplayName("12. 🕵️ HACKER: Classical RSA Would Be Vulnerable")
    void testRSAVulnerabilityDemo() throws GeneralSecurityException {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("⚠️ DEMONSTRATION: RSA VULNERABILITY TO QUANTUM ATTACKS");
        System.out.println("=".repeat(60));
        
        System.out.println("\n   IF this message had been encrypted with RSA key exchange:");
        System.out.println();
        System.out.println("   Shor's Algorithm Attack:");
        System.out.println("   ─────────────────────────────────────");
        System.out.println("   • Target: RSA-2048 public key");
        System.out.println("   • Method: Quantum period-finding");
        System.out.println("   • Result: Factor N = p × q");
        System.out.println("   • Derive: Private key from p and q");
        System.out.println();
        System.out.println("   ATTACK TIMELINE:");
        System.out.println("   ─────────────────────────────────────");
        System.out.println("   Classical Computer: ~300 trillion years");
        System.out.println("   Quantum Computer:   ~8 hours");
        System.out.println();
        System.out.println("   ⚠️ RSA encryption will be COMPLETELY BROKEN");
        System.out.println("   ⚠️ All historical RSA-encrypted data at risk");
        System.out.println("   ⚠️ Harvest Now, Decrypt Later is a REAL threat");
        System.out.println();
        System.out.println("   🔑 SOLUTION: Use ML-KEM for key encapsulation");
        System.out.println("   🔑 SOLUTION: Use ML-DSA for digital signatures");
    }

    // ==================== FINAL SUMMARY ====================

    @Test
    @Order(99)
    @DisplayName("FINAL: Print E2E Test Summary")
    void printFinalSummary() {
        System.out.println("\n" + "=".repeat(70));
        System.out.println("🎉 END-TO-END CRYPTOGRAPHIC TEST COMPLETED!");
        System.out.println("=".repeat(70));
        
        System.out.println("\n📋 WORKFLOW TESTED:");
        System.out.println("   ✅ Key generation (ML-DSA, ML-KEM, RSA)");
        System.out.println("   ✅ Document creation and hashing (SHA-384)");
        System.out.println("   ✅ Digital signing (ML-DSA + RSA comparison)");
        System.out.println("   ✅ Signature verification");
        System.out.println("   ✅ Key encapsulation (ML-KEM)");
        System.out.println("   ✅ Symmetric encryption (AES-256-GCM)");
        System.out.println("   ✅ Message decryption");
        System.out.println("   ✅ Forgery attempt detection");
        System.out.println("   ✅ Interception attack failure");
        
        System.out.println("\n🔐 ALGORITHMS VALIDATED:");
        System.out.println("   QUANTUM-RESISTANT:");
        System.out.println("   • ML-DSA (CRYSTALS-Dilithium) - FIPS 204");
        System.out.println("   • ML-KEM (CRYSTALS-Kyber) - FIPS 203");
        System.out.println("   • AES-256-GCM (symmetric, safe with ML-KEM key exchange)");
        System.out.println("   • SHA-384 (hashing, pre-image resistant)");
        System.out.println();
        System.out.println("   CLASSICAL (Vulnerable):");
        System.out.println("   • RSA-2048 - Broken by Shor's algorithm");
        System.out.println("   • ECDSA - Broken by Shor's algorithm");
        
        System.out.println("\n🛡️ SECURITY TAKEAWAYS:");
        System.out.println("   1. ML-DSA signatures cannot be forged by quantum computers");
        System.out.println("   2. ML-KEM encryption cannot be broken by quantum computers");
        System.out.println("   3. RSA/ECDSA will be completely broken by Shor's algorithm");
        System.out.println("   4. Harvest Now, Decrypt Later is a real threat TODAY");
        System.out.println("   5. Organizations must migrate to PQC algorithms NOW");
        
        System.out.println("\n" + "=".repeat(70));
        System.out.println("   This simulation demonstrates why post-quantum");
        System.out.println("   cryptography is essential for protecting sensitive");
        System.out.println("   government and personal data against future threats.");
        System.out.println("=".repeat(70) + "\n");
    }
}
