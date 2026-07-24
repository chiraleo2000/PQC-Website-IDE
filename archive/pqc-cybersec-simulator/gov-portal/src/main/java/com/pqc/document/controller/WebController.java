package com.pqc.document.controller;

import com.pqc.document.entity.Document;
import com.pqc.document.entity.User;
import com.pqc.document.repository.DocumentRepository;
import com.pqc.document.repository.UserRepository;
import com.pqc.model.CryptoAlgorithm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Web Controller for Government Portal UI
 * Provides real interactive forms for car licensing and tax services
 * 
 * Authentication Methods:
 * - Form-based login (traditional)
 * - OAuth 2.0 (Google, GitHub) - industry standard for social login
 * - JWT tokens for API access
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebController {

    private static final String REDIRECT_DASHBOARD = "redirect:/dashboard";
    private static final String REDIRECT_LOGIN = "redirect:/login";
    private static final String ATTR_SUCCESS = "success";

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    
    @Value("${oauth2.enabled:false}")
    private boolean oauth2Enabled;

    /**
     * Helper method to get current authenticated user from Spring Security
     */
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        String username = auth.getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    // ============ HOME & LOGIN ============

    @GetMapping("/")
    public String home(Model model) {
        User user = getCurrentUser();
        model.addAttribute("user", user);
        model.addAttribute("services", getAvailableServices());
        return "index";
    }

    @GetMapping("/login")
    public String loginPage(Model model) {
        // If already logged in, redirect to dashboard
        User user = getCurrentUser();
        if (user != null) {
            return REDIRECT_DASHBOARD;
        }
        // Pass OAuth2 enabled flag to template
        model.addAttribute("oauth2Enabled", oauth2Enabled);
        return "login";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return REDIRECT_LOGIN;
    }

    // ============ DASHBOARD ============

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        User user = getCurrentUser();
        if (user == null) {
            return REDIRECT_LOGIN;
        }

        model.addAttribute("user", user);
        
        // Get user's documents
        List<Document> myDocuments = documentRepository.findByApplicantOrderByCreatedAtDesc(user);
        model.addAttribute("myDocuments", myDocuments);
        
        // For officers: get pending documents
        if (user.getRole() == User.UserRole.OFFICER || user.getRole() == User.UserRole.ADMIN) {
            List<Document> pendingDocuments = documentRepository.findByStatus(Document.DocumentStatus.PENDING);
            model.addAttribute("pendingDocuments", pendingDocuments);
        }
        
        return "dashboard";
    }

    // ============ CAR LICENSE SERVICES ============

    @GetMapping("/services/car-license")
    public String carLicenseForm(Model model) {
        User user = getCurrentUser();
        if (user == null) {
            return REDIRECT_LOGIN;
        }
        model.addAttribute("user", user);
        return "services/car-license";
    }

    @PostMapping("/services/car-license/submit")
    public String submitCarLicense(
            @RequestParam String fullName,
            @RequestParam String dob,
            @RequestParam String address,
            @RequestParam String licenseType,
            @RequestParam String vehiclePlate,
            @RequestParam String vehicleMake,
            @RequestParam String vehicleYear,
            @RequestParam(defaultValue = "RSA_2048") String encryptionType,
            @RequestParam(defaultValue = "RSA_2048") String signatureType,
            RedirectAttributes redirectAttributes) {
        
        User user = getCurrentUser();
        if (user == null) {
            return REDIRECT_LOGIN;
        }

        // Determine encryption algorithm from user selection
        CryptoAlgorithm encryptionAlgorithm = switch(encryptionType) {
            case "ML_KEM" -> CryptoAlgorithm.ML_KEM;
            case "AES_256" -> CryptoAlgorithm.AES_256;
            case "AES_128" -> CryptoAlgorithm.AES_128;
            default -> CryptoAlgorithm.RSA_2048;
        };
        
        // Determine signature algorithm from user selection  
        CryptoAlgorithm signatureAlgorithm = switch(signatureType) {
            case "ML_DSA" -> CryptoAlgorithm.ML_DSA;
            case "SLH_DSA" -> CryptoAlgorithm.SLH_DSA;
            case "ECDSA_P256" -> CryptoAlgorithm.ECDSA_P256;
            default -> CryptoAlgorithm.RSA_2048;
        };

        String content = String.format("""
            ╔══════════════════════════════════════════════════════════════╗
            ║           CAR LICENSE APPLICATION                           ║
            ╠══════════════════════════════════════════════════════════════╣
            ║ Full Name:      %s
            ║ Date of Birth:  %s
            ║ Address:        %s
            ║ License Type:   %s
            ╠══════════════════════════════════════════════════════════════╣
            ║                  VEHICLE INFORMATION                        ║
            ╠══════════════════════════════════════════════════════════════╣
            ║ License Plate:  %s
            ║ Vehicle Make:   %s
            ║ Vehicle Year:   %s
            ╠══════════════════════════════════════════════════════════════╣
            ║ Encryption:     %s
            ║ Signature:      %s
            ║ Submitted:      %s
            ╚══════════════════════════════════════════════════════════════╝
            """, fullName, dob, address, licenseType, vehiclePlate, vehicleMake, vehicleYear,
            encryptionAlgorithm.getDisplayName(), signatureAlgorithm.getDisplayName(), LocalDateTime.now());

        Document doc = Document.builder()
                .documentId("CAR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .documentType(Document.DocumentType.LICENSE)
                .title("Car License Application - " + fullName)
                .content(content)
                .applicant(user)
                .encryptionAlgorithm(encryptionAlgorithm)
                .signatureAlgorithm(signatureAlgorithm)
                .status(Document.DocumentStatus.PENDING)
                .build();

        documentRepository.save(doc);
        
        log.info("📋 Car License Application submitted by {} [Encryption: {}, Signature: {}]", 
                user.getUsername(), encryptionAlgorithm, signatureAlgorithm);

        redirectAttributes.addFlashAttribute(ATTR_SUCCESS, 
            "Car License Application submitted successfully! Document ID: " + doc.getDocumentId());
        redirectAttributes.addFlashAttribute("encryptionUsed", encryptionAlgorithm.getDisplayName());
        redirectAttributes.addFlashAttribute("signatureUsed", signatureAlgorithm.getDisplayName());
        
        return REDIRECT_DASHBOARD;
    }

    // ============ TAX FILING SERVICES ============

    @GetMapping("/services/tax-filing")
    public String taxFilingForm(Model model) {
        User user = getCurrentUser();
        if (user == null) {
            return REDIRECT_LOGIN;
        }
        model.addAttribute("user", user);
        return "services/tax-filing";
    }

    @PostMapping("/services/tax-filing/submit")
    public String submitTaxFiling(
            @RequestParam String fullName,
            @RequestParam String taxId,
            @RequestParam String filingYear,
            @RequestParam String grossIncome,
            @RequestParam String deductions,
            @RequestParam String taxOwed,
            @RequestParam String bankAccount,
            @RequestParam(defaultValue = "RSA_2048") String encryptionType,
            @RequestParam(defaultValue = "RSA_2048") String signatureType,
            RedirectAttributes redirectAttributes) {
        
        User user = getCurrentUser();
        if (user == null) {
            return REDIRECT_LOGIN;
        }

        // Determine encryption algorithm from user selection
        CryptoAlgorithm encryptionAlgorithm = switch(encryptionType) {
            case "ML_KEM" -> CryptoAlgorithm.ML_KEM;
            case "AES_256" -> CryptoAlgorithm.AES_256;
            case "AES_128" -> CryptoAlgorithm.AES_128;
            default -> CryptoAlgorithm.RSA_2048;
        };
        
        // Determine signature algorithm from user selection  
        CryptoAlgorithm signatureAlgorithm = switch(signatureType) {
            case "ML_DSA" -> CryptoAlgorithm.ML_DSA;
            case "SLH_DSA" -> CryptoAlgorithm.SLH_DSA;
            case "ECDSA_P256" -> CryptoAlgorithm.ECDSA_P256;
            default -> CryptoAlgorithm.RSA_2048;
        };

        String content = String.format("""
            ╔══════════════════════════════════════════════════════════════╗
            ║           TAX FILING %s                                     ║
            ╠══════════════════════════════════════════════════════════════╣
            ║ Taxpayer:       %s
            ║ Tax ID:         %s
            ╠══════════════════════════════════════════════════════════════╣
            ║                  FINANCIAL INFORMATION                      ║
            ╠══════════════════════════════════════════════════════════════╣
            ║ Gross Income:   $%s
            ║ Deductions:     $%s
            ║ Tax Owed:       $%s
            ╠══════════════════════════════════════════════════════════════╣
            ║ Bank Account:   ****%s (Direct Deposit)
            ╠══════════════════════════════════════════════════════════════╣
            ║ Encryption:     %s
            ║ Signature:      %s
            ║ Filed:          %s
            ╚══════════════════════════════════════════════════════════════╝
            """, filingYear, fullName, taxId, grossIncome, deductions, taxOwed,
            bankAccount.length() > 4 ? bankAccount.substring(bankAccount.length() - 4) : bankAccount,
            encryptionAlgorithm.getDisplayName(), signatureAlgorithm.getDisplayName(), LocalDateTime.now());

        Document doc = Document.builder()
                .documentId("TAX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .documentType(Document.DocumentType.REGISTRATION)
                .title("Tax Filing " + filingYear + " - " + fullName)
                .content(content)
                .applicant(user)
                .encryptionAlgorithm(encryptionAlgorithm)
                .signatureAlgorithm(signatureAlgorithm)
                .status(Document.DocumentStatus.PENDING)
                .build();

        documentRepository.save(doc);
        
        log.info("💰 Tax Filing submitted by {} for year {} [Encryption: {}, Signature: {}]", 
                user.getUsername(), filingYear, encryptionAlgorithm, signatureAlgorithm);

        redirectAttributes.addFlashAttribute(ATTR_SUCCESS, 
            "Tax Filing submitted successfully! Document ID: " + doc.getDocumentId());
        redirectAttributes.addFlashAttribute("encryptionUsed", encryptionAlgorithm.getDisplayName());
        redirectAttributes.addFlashAttribute("signatureUsed", signatureAlgorithm.getDisplayName());
        
        return REDIRECT_DASHBOARD;
    }

    // ============ OFFICER ACTIONS ============

    @GetMapping("/officer/review/{documentId}")
    public String reviewDocument(@PathVariable String documentId, Model model) {
        User user = getCurrentUser();
        if (user == null || (user.getRole() != User.UserRole.OFFICER && user.getRole() != User.UserRole.ADMIN)) {
            return REDIRECT_LOGIN;
        }

        Document doc = documentRepository.findByDocumentId(documentId).orElse(null);
        if (doc == null) {
            return REDIRECT_DASHBOARD;
        }

        model.addAttribute("user", user);
        model.addAttribute("document", doc);
        return "officer/review";
    }

    @PostMapping("/officer/approve/{documentId}")
    public String approveDocument(@PathVariable String documentId, 
                                   RedirectAttributes redirectAttributes) {
        User user = getCurrentUser();
        if (user == null || (user.getRole() != User.UserRole.OFFICER && user.getRole() != User.UserRole.ADMIN)) {
            return REDIRECT_LOGIN;
        }

        Document doc = documentRepository.findByDocumentId(documentId).orElse(null);
        if (doc != null) {
            doc.setStatus(Document.DocumentStatus.APPROVED);
            doc.setSigner(user);
            doc.setSignedAt(LocalDateTime.now());
            documentRepository.save(doc);
            
            log.info("✅ Document {} APPROVED by Officer {}", documentId, user.getUsername());
            redirectAttributes.addFlashAttribute(ATTR_SUCCESS, "Document " + documentId + " approved!");
        }

        return REDIRECT_DASHBOARD;
    }

    @PostMapping("/officer/reject/{documentId}")
    public String rejectDocument(@PathVariable String documentId,
                                  @RequestParam(required = false) String reason,
                                  RedirectAttributes redirectAttributes) {
        User user = getCurrentUser();
        if (user == null || (user.getRole() != User.UserRole.OFFICER && user.getRole() != User.UserRole.ADMIN)) {
            return REDIRECT_LOGIN;
        }

        Document doc = documentRepository.findByDocumentId(documentId).orElse(null);
        if (doc != null) {
            doc.setStatus(Document.DocumentStatus.REJECTED);
            doc.setSigner(user);
            doc.setSignedAt(LocalDateTime.now());
            documentRepository.save(doc);
            
            log.info("❌ Document {} REJECTED by Officer {}", documentId, user.getUsername());
            redirectAttributes.addFlashAttribute("error", "Document " + documentId + " rejected.");
        }

        return REDIRECT_DASHBOARD;
    }

    // ============ TRANSACTION LOG (For Hacker Monitoring) ============

    @GetMapping("/api/transactions")
    @ResponseBody
    @Transactional(readOnly = true)
    public List<TransactionLog> getTransactionLog() {
        List<Document> recentDocs = documentRepository.findTop20ByOrderByCreatedAtDesc();
        return recentDocs.stream().map(doc -> {
            // Get the ACTUAL encryption algorithm used for this document
            String encryptionAlgo = "RSA-2048";  // Default
            if (doc.getEncryptionAlgorithm() != null) {
                encryptionAlgo = doc.getEncryptionAlgorithm().getDisplayName();
            } else if (doc.getApplicant() != null && doc.getApplicant().getPreferredEncryptionAlgorithm() != null) {
                // Fallback to user's preferred algorithm for old documents
                encryptionAlgo = doc.getApplicant().getPreferredEncryptionAlgorithm().getDisplayName();
            }
            
            // Get the ACTUAL signature algorithm used for this document
            String signatureAlgo = "RSA-2048";  // Default
            if (doc.getSignatureAlgorithm() != null) {
                signatureAlgo = doc.getSignatureAlgorithm().getDisplayName();
            }
            
            return new TransactionLog(
                doc.getDocumentId(),
                doc.getDocumentType().getDisplayName(),
                doc.getApplicant() != null ? doc.getApplicant().getUsername() : "Unknown",
                encryptionAlgo,
                doc.getEncryptionAlgorithm() != null ? doc.getEncryptionAlgorithm().name() : "RSA_2048",
                signatureAlgo,
                doc.getSignatureAlgorithm() != null ? doc.getSignatureAlgorithm().name() : "RSA_2048",
                doc.getStatus().name(),
                doc.getCreatedAt()
            );
        }).toList();
    }

    // ============ HELPER METHODS ============

    private List<ServiceInfo> getAvailableServices() {
        return List.of(
            new ServiceInfo("car-license", "🚗 Car License", "Apply for new driver's license or renewal"),
            new ServiceInfo("tax-filing", "💰 Tax Filing", "Submit your annual tax documents"),
            new ServiceInfo("passport", "🛂 Passport", "Apply for passport services"),
            new ServiceInfo("permits", "📋 Permits", "Various permit applications")
        );
    }

    // ============ INNER CLASSES ============

    public record ServiceInfo(String id, String name, String description) {}
    
    public record TransactionLog(
        String documentId, 
        String type, 
        String applicant, 
        String encryptionAlgorithmName,
        String encryptionAlgorithm,
        String signatureAlgorithmName,
        String signatureAlgorithm,
        String status,
        LocalDateTime timestamp
    ) {}
}
