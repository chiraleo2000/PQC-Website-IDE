package com.pqc.document.service;

import com.pqc.crypto.PqcCryptoService;
import com.pqc.document.dto.DocumentRequest;
import com.pqc.document.dto.DocumentResponse;
import com.pqc.document.entity.Document;
import com.pqc.document.entity.Document.*;
import com.pqc.document.entity.User;
import com.pqc.document.repository.DocumentRepository;
import com.pqc.document.repository.UserRepository;
import com.pqc.model.CryptoAlgorithm;
import com.pqc.model.SignatureResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Document service with signing and verification.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final PqcCryptoService cryptoService = new PqcCryptoService();

    /**
     * Create a new document.
     */
    @Transactional
    public Document createDocument(String applicantUserId, DocumentRequest request)
            throws GeneralSecurityException {
        log.info("Creating document: {} for user {}", request.getDocumentType(), applicantUserId);

        User applicant = userRepository.findByUserId(applicantUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + applicantUserId));

        String documentId = cryptoService.hashSHA384AsString(
                applicantUserId + request.getDocumentType() + System.currentTimeMillis());

        Document document = Document.builder()
                .documentId(documentId)
                .documentType(request.getDocumentType())
                .title(request.getTitle())
                .content(request.getContent())
                .applicant(applicant)
                .status(DocumentStatus.PENDING)
                .build();

        document = documentRepository.save(document);
        log.info("Document created: {} ({})", document.getDocumentId(), document.getDocumentType());

        return document;
    }

    /**
     * Sign a document using the signer's preferred algorithm.
     */
    @Transactional
    public Document signDocument(String documentId, String signerUserId)
            throws GeneralSecurityException {
        log.info("Signing document {} by user {}", documentId, signerUserId);

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        if (document.getSignature() != null) {
            throw new IllegalStateException("Document is already signed");
        }

        User signer = userRepository.findByUserId(signerUserId)
                .orElseThrow(() -> new IllegalArgumentException("Signer not found: " + signerUserId));

        CryptoAlgorithm algorithm = signer.getPreferredSignatureAlgorithm();
        byte[] documentBytes = document.getContent().getBytes();
        SignatureResult signatureResult;

        if (algorithm == CryptoAlgorithm.ML_DSA) {
            KeyPair keyPair = cryptoService.loadMLDSAKeyPair(
                    signer.getMlDsaPublicKey(), signer.getMlDsaPrivateKey());
            signatureResult = cryptoService.signWithMLDSA(documentBytes, keyPair.getPrivate());
            log.info("Document signed with ML-DSA (quantum-resistant) - {} bytes",
                    signatureResult.getSignatureSize());
        } else if (algorithm == CryptoAlgorithm.RSA_2048) {
            KeyPair keyPair = cryptoService.loadRSAKeyPair(
                    signer.getRsaPublicKey(), signer.getRsaPrivateKey());
            signatureResult = cryptoService.signWithRSA(documentBytes, keyPair.getPrivate());
            log.warn("Document signed with RSA-2048 (QUANTUM VULNERABLE!) - {} bytes",
                    signatureResult.getSignatureSize());
        } else {
            throw new IllegalArgumentException("Unsupported signature algorithm: " + algorithm);
        }

        document.setSignature(signatureResult.getSignature());
        document.setSignatureAlgorithm(algorithm);
        document.setSigner(signer);
        document.setSignedAt(LocalDateTime.now());
        document.setStatus(DocumentStatus.SIGNED);

        return documentRepository.save(document);
    }

    /**
     * Verify a document's signature.
     */
    public VerificationResult verifyDocument(String documentId) throws GeneralSecurityException {
        log.info("Verifying document: {}", documentId);

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        if (document.getSignature() == null) {
            return VerificationResult.failed("Document is not signed");
        }

        User signer = document.getSigner();
        if (signer == null) {
            return VerificationResult.failed("Signer information not found");
        }

        byte[] documentBytes = document.getContent().getBytes();
        CryptoAlgorithm algorithm = document.getSignatureAlgorithm();
        boolean valid;

        if (algorithm == CryptoAlgorithm.ML_DSA) {
            KeyPair keyPair = cryptoService.loadMLDSAKeyPair(
                    signer.getMlDsaPublicKey(), signer.getMlDsaPrivateKey());
            valid = cryptoService.verifyMLDSASignature(
                    documentBytes, document.getSignature(), keyPair.getPublic());
        } else if (algorithm == CryptoAlgorithm.RSA_2048) {
            KeyPair keyPair = cryptoService.loadRSAKeyPair(
                    signer.getRsaPublicKey(), signer.getRsaPrivateKey());
            valid = cryptoService.verifyRSASignature(
                    documentBytes, document.getSignature(), keyPair.getPublic());
        } else {
            return VerificationResult.failed("Unknown algorithm: " + algorithm);
        }

        return VerificationResult.builder()
                .valid(valid)
                .message(valid ? "Signature verified successfully" : "Signature verification FAILED")
                .algorithm(algorithm)
                .algorithmName(algorithm.getDisplayName())
                .quantumThreatLevel(algorithm.getQuantumThreatLevel())
                .signerName(signer.getFullName())
                .signerUsername(signer.getUsername())
                .signedAt(document.getSignedAt())
                .build();
    }

    /**
     * Approve a document (Officer/Admin only).
     */
    @Transactional
    public Document approveDocument(String documentId, String approverUserId) {
        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        if (document.getStatus() != DocumentStatus.SIGNED) {
            throw new IllegalStateException("Document must be signed before approval");
        }

        document.setStatus(DocumentStatus.APPROVED);
        log.info("Document {} approved by {}", documentId, approverUserId);

        return documentRepository.save(document);
    }

    /**
     * Reject a document (Officer/Admin only).
     */
    @Transactional
    public Document rejectDocument(String documentId, String reason) {
        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        document.setStatus(DocumentStatus.REJECTED);
        log.info("Document {} rejected: {}", documentId, reason);

        return documentRepository.save(document);
    }

    /**
     * Get document by ID.
     */
    public Document getDocument(String documentId) {
        return documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));
    }

    /**
     * Get all documents.
     */
    @Transactional(readOnly = true)
    public List<Document> getAllDocuments() {
        return documentRepository.findAllWithAssociations();
    }

    /**
     * Get documents by applicant.
     */
    @Transactional(readOnly = true)
    public List<Document> getDocumentsByApplicant(String applicantUserId) {
        return documentRepository.findByApplicantUserId(applicantUserId);
    }

    /**
     * Get documents by status.
     */
    @Transactional(readOnly = true)
    public List<Document> getDocumentsByStatus(DocumentStatus status) {
        return documentRepository.findByStatus(status);
    }

    /**
     * Convert document to response DTO.
     */
    public DocumentResponse toDocumentResponse(Document doc) {
        return DocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .documentType(doc.getDocumentType())
                .documentTypeName(doc.getDocumentType().getDisplayName())
                .title(doc.getTitle())
                .content(doc.getContent())
                .status(doc.getStatus())
                .statusName(doc.getStatus().getDisplayName())
                .applicantUserId(doc.getApplicant() != null ? doc.getApplicant().getUserId() : null)
                .applicantName(doc.getApplicant() != null ? doc.getApplicant().getFullName() : null)
                .isSigned(doc.getSignature() != null)
                .signerUserId(doc.getSigner() != null ? doc.getSigner().getUserId() : null)
                .signerName(doc.getSigner() != null ? doc.getSigner().getFullName() : null)
                .signatureAlgorithm(doc.getSignatureAlgorithm())
                .signatureAlgorithmName(
                        doc.getSignatureAlgorithm() != null ? doc.getSignatureAlgorithm().getDisplayName() : null)
                .quantumThreatLevel(
                        doc.getSignatureAlgorithm() != null ? doc.getSignatureAlgorithm().getQuantumThreatLevel()
                                : null)
                .signatureSize(doc.getSignature() != null ? doc.getSignature().length : 0)
                .signedAt(doc.getSignedAt())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .expiresAt(doc.getExpiresAt())
                .build();
    }

    /**
     * Verification result.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class VerificationResult {
        private boolean valid;
        private String message;
        private CryptoAlgorithm algorithm;
        private String algorithmName;
        private String quantumThreatLevel;
        private String signerName;
        private String signerUsername;
        private LocalDateTime signedAt;

        public static VerificationResult failed(String message) {
            return VerificationResult.builder().valid(false).message(message).build();
        }
    }
}
