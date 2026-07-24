package com.pqc.document.dto;

import com.pqc.document.entity.Document.DocumentStatus;
import com.pqc.document.entity.Document.DocumentType;
import com.pqc.model.CryptoAlgorithm;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for document response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {
    private String documentId;
    private DocumentType documentType;
    private String documentTypeName;
    private String title;
    private String content;

    // Status
    private DocumentStatus status;
    private String statusName;

    // Applicant
    private String applicantUserId;
    private String applicantName;

    // Signature
    private boolean isSigned;
    private String signerUserId;
    private String signerName;
    private CryptoAlgorithm signatureAlgorithm;
    private String signatureAlgorithmName;
    private String quantumThreatLevel;
    private int signatureSize;
    private LocalDateTime signedAt;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime expiresAt;
}
