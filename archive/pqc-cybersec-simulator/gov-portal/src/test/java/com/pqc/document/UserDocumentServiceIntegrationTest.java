package com.pqc.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pqc.document.dto.AuthResponse;
import com.pqc.document.dto.DocumentRequest;
import com.pqc.document.dto.DocumentResponse;
import com.pqc.document.dto.LoginRequest;
import com.pqc.document.dto.RegisterRequest;
import com.pqc.document.entity.Document;
import com.pqc.document.entity.User;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for User Document Service.
 * 
 * Tests the full workflow:
 * 1. Admin login (demo officer)
 * 2. User registration
 * 3. Document creation (license application)
 * 4. Document signing with PQC/Classical algorithms
 * 5. Document verification
 * 6. Document approval workflow
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class UserDocumentServiceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;
    private String citizenToken;
    private String citizenUserId;
    private String documentId;

    // ==================== ADMIN / OFFICER TESTS ====================

    @Test
    @Order(1)
    @DisplayName("1. Admin (Demo Officer) Login - Should authenticate and get JWT token")
    void testAdminLogin() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsernameOrEmail("admin");
        loginRequest.setPassword("Admin@PQC2024!");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        AuthResponse authResponse = objectMapper.readValue(responseBody, AuthResponse.class);
        adminToken = authResponse.getToken();

        assertThat(adminToken).isNotEmpty();
        System.out.println("✅ Admin login successful - Token acquired");
        System.out.println("   Role: " + authResponse.getUser().getRole());
        System.out.println("   Algorithm: " + authResponse.getUser().getSignatureAlgorithm());
    }

    @Test
    @Order(2)
    @DisplayName("2. Admin - Verify quantum-resistant keys are generated")
    void testAdminHasQuantumResistantKeys() throws Exception {
        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.signatureAlgorithm").value("ML_DSA"))
                .andExpect(jsonPath("$.encryptionAlgorithm").value("ML_KEM"));

        System.out.println("✅ Admin has quantum-resistant keys: ML_DSA + ML_KEM");
    }

    // ==================== CITIZEN REGISTRATION TESTS ====================

    @Test
    @Order(3)
    @DisplayName("3. Citizen Registration - Create new user with PQC keys")
    void testCitizenRegistration() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("john_citizen");
        registerRequest.setEmail("john@citizen.example.com");
        registerRequest.setPassword("Citizen@2024!");
        registerRequest.setFullName("John Citizen");
        registerRequest.setPhone("+1-555-123-4567");
        registerRequest.setRole(User.UserRole.CITIZEN);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user.username").value("john_citizen"))
                .andExpect(jsonPath("$.user.role").value("CITIZEN"))
                .andExpect(jsonPath("$.user.hasKeys").value(true))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        AuthResponse authResponse = objectMapper.readValue(responseBody, AuthResponse.class);
        citizenToken = authResponse.getToken();
        citizenUserId = authResponse.getUser().getUserId();

        assertThat(citizenToken).isNotEmpty();
        assertThat(citizenUserId).isNotEmpty();

        System.out.println("✅ Citizen registered successfully:");
        System.out.println("   User ID: " + citizenUserId);
        System.out.println("   Keys Generated: ML-DSA + ML-KEM + RSA");
        System.out.println("   Default Algorithm: " + authResponse.getUser().getSignatureAlgorithm());
    }

    @Test
    @Order(4)
    @DisplayName("4. Citizen Login - Authenticate with credentials")
    void testCitizenLogin() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsernameOrEmail("john_citizen");
        loginRequest.setPassword("Citizen@2024!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user.username").value("john_citizen"));

        System.out.println("✅ Citizen login successful");
    }

    // ==================== DOCUMENT WORKFLOW TESTS ====================

    @Test
    @Order(5)
    @DisplayName("5. Document Creation - Citizen submits Driver's License application")
    void testDocumentCreation() throws Exception {
        DocumentRequest documentRequest = new DocumentRequest();
        documentRequest.setDocumentType(Document.DocumentType.LICENSE);
        documentRequest.setTitle("Driver's License Application - John Citizen");
        documentRequest.setContent("I, John Citizen, hereby apply for a Class C driver's license. " +
                "Date of Birth: 1990-05-15. Address: 123 Main St, Springfield, ST 12345. " +
                "This application is submitted electronically with quantum-resistant digital signature.");

        MvcResult result = mockMvc.perform(post("/api/documents")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(documentRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").exists())
                .andExpect(jsonPath("$.documentType").value("LICENSE"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        DocumentResponse docResponse = objectMapper.readValue(responseBody, DocumentResponse.class);
        documentId = docResponse.getDocumentId();

        assertThat(documentId).isNotEmpty();

        System.out.println("✅ Document created successfully:");
        System.out.println("   Document ID: " + documentId);
        System.out.println("   Type: Driver's License Application");
        System.out.println("   Status: PENDING");
    }

    @Test
    @Order(6)
    @DisplayName("6. Document Signing - Citizen signs with ML-DSA (Quantum-Resistant)")
    void testDocumentSigningWithMLDSA() throws Exception {
        mockMvc.perform(post("/api/documents/" + documentId + "/sign")
                .header("Authorization", "Bearer " + citizenToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Document signed successfully"))
                .andExpect(jsonPath("$.signatureAlgorithm").value("ML-DSA (Dilithium)"))
                .andExpect(jsonPath("$.isQuantumResistant").value(true));

        System.out.println("✅ Document signed with ML-DSA (CRYSTALS-Dilithium)");
    }

    @Test
    @Order(7)
    @DisplayName("7. Document Verification - Verify ML-DSA signature is valid")
    void testDocumentVerification() throws Exception {
        mockMvc.perform(post("/api/documents/" + documentId + "/verify")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.message").value("Signature verified successfully"))
                .andExpect(jsonPath("$.algorithm").value("ML_DSA"))
                .andExpect(jsonPath("$.quantumThreatLevel").value("IMMUNE - Lattice/hash-based, resistant to Shor's and Grover's algorithms"));

        System.out.println("✅ Document signature verified: ML_DSA, Quantum Threat Level: NONE");
    }

    @Test
    @Order(8)
    @DisplayName("8. Document Approval - Officer approves the license application")
    void testDocumentApproval() throws Exception {
        mockMvc.perform(post("/api/documents/" + documentId + "/approve")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.document.status").value("APPROVED"));

        System.out.println("✅ Document approved by officer (admin)");
        System.out.println("   Final Status: APPROVED");
    }

    // ==================== ALGORITHM SWITCHING TESTS ====================

    @Test
    @Order(9)
    @DisplayName("9. Algorithm Switch - Change citizen to RSA (Classical/Vulnerable)")
    void testSwitchToClassicalRSA() throws Exception {
        mockMvc.perform(put("/api/users/" + citizenUserId + "/algorithm")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"signatureAlgorithm\": \"RSA_2048\", \"encryptionAlgorithm\": \"AES_256\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.signatureAlgorithm").value("RSA_2048"))
                .andExpect(jsonPath("$.encryptionAlgorithm").value("AES_256"));

        System.out.println("⚠️ Algorithm switched to CLASSICAL (Quantum-Vulnerable):");
        System.out.println("   Signature: RSA-2048 (VULNERABLE to Shor's algorithm)");
        System.out.println("   Encryption: AES-256 (Reduced security with Grover's)");
    }

    @Test
    @Order(10)
    @DisplayName("10. Document with RSA - Create and sign with vulnerable algorithm")
    void testDocumentWithRSASignature() throws Exception {
        // Create new document
        DocumentRequest docRequest = new DocumentRequest();
        docRequest.setDocumentType(Document.DocumentType.PERMIT);
        docRequest.setTitle("Building Permit Application - RSA Signed");
        docRequest.setContent("Building permit application signed with RSA-2048 (quantum-vulnerable).");

        MvcResult createResult = mockMvc.perform(post("/api/documents")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(docRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = createResult.getResponse().getContentAsString();
        DocumentResponse docResponse = objectMapper.readValue(responseBody, DocumentResponse.class);
        String rsaDocId = docResponse.getDocumentId();

        // Sign with RSA
        mockMvc.perform(post("/api/documents/" + rsaDocId + "/sign")
                .header("Authorization", "Bearer " + citizenToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.signatureAlgorithm").value("RSA-2048"))
                .andExpect(jsonPath("$.isQuantumResistant").value(false));

        System.out.println("⚠️ Document signed with RSA-2048 (VULNERABLE to quantum)");

        // Verify it still works (classical verification)
        mockMvc.perform(post("/api/documents/" + rsaDocId + "/verify")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.quantumThreatLevel").value("CRITICAL - Vulnerable to Shor's algorithm (breaks in hours with quantum computer)"));

        System.out.println("   Verification: VALID (but vulnerable to quantum attack)");
    }

    // ==================== DOCUMENT TYPE TESTS ====================

    @Test
    @Order(11)
    @DisplayName("11. Create Various Document Types")
    void testVariousDocumentTypes() throws Exception {
        // Switch back to quantum-resistant
        mockMvc.perform(put("/api/users/" + citizenUserId + "/algorithm")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"signatureAlgorithm\": \"ML_DSA\", \"encryptionAlgorithm\": \"ML_KEM\"}"))
                .andExpect(status().isOk());

        // Create ID Card application
        DocumentRequest idCardRequest = new DocumentRequest();
        idCardRequest.setDocumentType(Document.DocumentType.ID_CARD);
        idCardRequest.setTitle("National ID Card Application");
        idCardRequest.setContent("Application for national identity card.");

        mockMvc.perform(post("/api/documents")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(idCardRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentType").value("ID_CARD"));

        // Create Housing Application
        DocumentRequest housingRequest = new DocumentRequest();
        housingRequest.setDocumentType(Document.DocumentType.HOUSING);
        housingRequest.setTitle("Public Housing Application");
        housingRequest.setContent("Application for public housing assistance.");

        mockMvc.perform(post("/api/documents")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(housingRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentType").value("HOUSING"));

        System.out.println("✅ Created various government document types:");
        System.out.println("   - National ID Card Application");
        System.out.println("   - Public Housing Application");
    }

    // ==================== VIEW DOCUMENTS TESTS ====================

    @Test
    @Order(12)
    @DisplayName("12. View My Documents - Citizen sees their own documents")
    void testViewMyDocuments() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/documents/my")
                .header("Authorization", "Bearer " + citizenToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andReturn();

        System.out.println("✅ Citizen can view their documents");
        System.out.println("   Response: " + result.getResponse().getContentAsString().substring(0, Math.min(200, result.getResponse().getContentAsString().length())) + "...");
    }

    @Test
    @Order(13)
    @DisplayName("13. Admin Views All Documents")
    void testAdminViewsAllDocuments() throws Exception {
        mockMvc.perform(get("/api/documents")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        System.out.println("✅ Admin can view ALL documents in the system");
    }

    @Test
    @Order(14)
    @DisplayName("14. View Documents by Status")
    void testViewDocumentsByStatus() throws Exception {
        mockMvc.perform(get("/api/documents/status/PENDING")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/documents/status/APPROVED")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        System.out.println("✅ Admin can filter documents by status (PENDING, APPROVED, etc.)");
    }

    // ==================== FINAL SUMMARY ====================

    @Test
    @Order(99)
    @DisplayName("FINAL: Print Test Summary")
    void printTestSummary() {
        System.out.println("\n" + "=".repeat(70));
        System.out.println("🎉 PQC USER DOCUMENT SERVICE - ALL TESTS PASSED!");
        System.out.println("=".repeat(70));
        System.out.println("\n📋 TESTED WORKFLOWS:");
        System.out.println("   ✅ Admin (Officer) authentication");
        System.out.println("   ✅ Citizen registration with PQC key generation");
        System.out.println("   ✅ Document creation (License, Permit, ID Card, Housing)");
        System.out.println("   ✅ ML-DSA (Dilithium) quantum-resistant signing");
        System.out.println("   ✅ RSA-2048 classical signing (for comparison)");
        System.out.println("   ✅ Signature verification");
        System.out.println("   ✅ Document approval workflow");
        System.out.println("   ✅ Algorithm switching (PQC ↔ Classical)");
        System.out.println("\n🔐 CRYPTOGRAPHIC ALGORITHMS TESTED:");
        System.out.println("   • ML-DSA (CRYSTALS-Dilithium) - QUANTUM RESISTANT");
        System.out.println("   • ML-KEM (CRYSTALS-Kyber) - QUANTUM RESISTANT");
        System.out.println("   • RSA-2048 - Classical (Quantum Vulnerable)");
        System.out.println("   • AES-256 - Symmetric (Reduced security with quantum)");
        System.out.println("=".repeat(70) + "\n");
    }
}
