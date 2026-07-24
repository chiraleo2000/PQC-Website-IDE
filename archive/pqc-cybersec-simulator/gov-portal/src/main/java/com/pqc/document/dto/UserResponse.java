package com.pqc.document.dto;

import com.pqc.document.entity.User.UserRole;
import com.pqc.model.CryptoAlgorithm;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for user response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private String userId;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private UserRole role;
    private String roleName;

    // Algorithm preferences
    private CryptoAlgorithm signatureAlgorithm;
    private CryptoAlgorithm encryptionAlgorithm;
    private String signatureThreatLevel;
    private String encryptionThreatLevel;

    // Key info
    private boolean hasKeys;
    private int mlDsaKeySize;
    private int mlKemKeySize;
    private int rsaKeySize;

    // Status
    private boolean active;
    private boolean verified;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}
