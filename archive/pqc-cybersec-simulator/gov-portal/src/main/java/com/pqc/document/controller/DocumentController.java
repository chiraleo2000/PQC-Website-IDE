package com.pqc.document.controller;

import com.pqc.document.dto.DocumentRequest;
import com.pqc.document.dto.DocumentResponse;
import com.pqc.document.entity.Document;
import com.pqc.document.entity.Document.DocumentStatus;
import com.pqc.document.entity.User;
import com.pqc.document.service.DocumentService;
import com.pqc.document.service.DocumentService.VerificationResult;
import com.pqc.document.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Document management controller.
 */
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentService documentService;
    private final UserService userService;

    /**
     * Create a new document.
     * POST /api/documents
     */
    @PostMapping
    public ResponseEntity<?> createDocument(
            @Valid @RequestBody DocumentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userService.getUserByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            Document document = documentService.createDocument(user.getUserId(), request);
            return ResponseEntity.ok(documentService.toDocumentResponse(document));
        } catch (Exception e) {
            log.error("Failed to create document", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get all documents (Admin/Officer) or user's own documents.
     * GET /api/documents
     */
    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getAllDocuments(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername()).orElse(null);

        List<Document> documents;
        if (user != null && (user.getRole() == User.UserRole.ADMIN ||
                user.getRole() == User.UserRole.OFFICER)) {
            documents = documentService.getAllDocuments();
        } else {
            documents = documentService.getDocumentsByApplicant(user.getUserId());
        }

        List<DocumentResponse> responses = documents.stream()
                .map(documentService::toDocumentResponse)
                .toList();
        return ResponseEntity.ok(responses);
    }

    /**
     * Get document by ID.
     * GET /api/documents/{documentId}
     */
    @GetMapping("/{documentId}")
    public ResponseEntity<?> getDocument(@PathVariable String documentId) {
        try {
            Document document = documentService.getDocument(documentId);
            return ResponseEntity.ok(documentService.toDocumentResponse(document));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get my documents.
     * GET /api/documents/my
     */
    @GetMapping("/my")
    public ResponseEntity<List<DocumentResponse>> getMyDocuments(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        List<DocumentResponse> documents = documentService.getDocumentsByApplicant(user.getUserId())
                .stream()
                .map(documentService::toDocumentResponse)
                .toList();
        return ResponseEntity.ok(documents);
    }

    /**
     * Get documents by status (Admin/Officer only).
     * GET /api/documents/status/{status}
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<List<DocumentResponse>> getDocumentsByStatus(
            @PathVariable DocumentStatus status) {
        List<DocumentResponse> documents = documentService.getDocumentsByStatus(status)
                .stream()
                .map(documentService::toDocumentResponse)
                .toList();
        return ResponseEntity.ok(documents);
    }

    /**
     * Sign a document.
     * POST /api/documents/{documentId}/sign
     */
    @PostMapping("/{documentId}/sign")
    public ResponseEntity<?> signDocument(
            @PathVariable String documentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userService.getUserByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            Document document = documentService.signDocument(documentId, user.getUserId());
            return ResponseEntity.ok(Map.of(
                    "message", "Document signed successfully",
                    "document", documentService.toDocumentResponse(document),
                    "signatureAlgorithm", document.getSignatureAlgorithm().getDisplayName(),
                    "isQuantumResistant", document.getSignatureAlgorithm().isQuantumResistant()));
        } catch (Exception e) {
            log.error("Failed to sign document", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Verify a document's signature.
     * POST /api/documents/{documentId}/verify
     */
    @PostMapping("/{documentId}/verify")
    public ResponseEntity<?> verifyDocument(@PathVariable String documentId) {
        try {
            VerificationResult result = documentService.verifyDocument(documentId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to verify document", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Approve a document (Admin/Officer only).
     * POST /api/documents/{documentId}/approve
     */
    @PostMapping("/{documentId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<?> approveDocument(
            @PathVariable String documentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userService.getUserByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            Document document = documentService.approveDocument(documentId, user.getUserId());
            return ResponseEntity.ok(Map.of(
                    "message", "Document approved",
                    "document", documentService.toDocumentResponse(document)));
        } catch (Exception e) {
            log.error("Failed to approve document", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Reject a document (Admin/Officer only).
     * POST /api/documents/{documentId}/reject
     */
    @PostMapping("/{documentId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<?> rejectDocument(
            @PathVariable String documentId,
            @RequestBody(required = false) RejectRequest request) {
        try {
            String reason = request != null ? request.reason() : "Not specified";
            Document document = documentService.rejectDocument(documentId, reason);
            return ResponseEntity.ok(Map.of(
                    "message", "Document rejected",
                    "reason", reason,
                    "document", documentService.toDocumentResponse(document)));
        } catch (Exception e) {
            log.error("Failed to reject document", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // DTOs
    public record RejectRequest(String reason) {
    }
}
