package com.pqc.document.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for login request.
 */
@Data
public class LoginRequest {

    @NotBlank(message = "Username or email is required")
    private String usernameOrEmail;

    @NotBlank(message = "Password is required")
    private String password;
}
