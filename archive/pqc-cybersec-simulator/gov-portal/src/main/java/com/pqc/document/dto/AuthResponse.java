package com.pqc.document.dto;

import com.pqc.document.entity.User.UserRole;
import com.pqc.model.CryptoAlgorithm;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for authentication response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String tokenType;
    private long expiresIn;
    private UserInfo user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private String userId;
        private String username;
        private String email;
        private String fullName;
        private UserRole role;
        private CryptoAlgorithm signatureAlgorithm;
        private CryptoAlgorithm encryptionAlgorithm;
        private boolean hasKeys;
    }
}
