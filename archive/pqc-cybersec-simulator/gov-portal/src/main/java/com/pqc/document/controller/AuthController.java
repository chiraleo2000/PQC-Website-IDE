package com.pqc.document.controller;

import com.pqc.document.dto.*;
import com.pqc.document.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentication controller for login and registration.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;

    /**
     * Register a new user.
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = userService.register(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Registration failed",
                    "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Registration error", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Registration failed",
                    "message", "An unexpected error occurred"));
        }
    }

    /**
     * Login with username/email and password.
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = userService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Login error", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Login failed",
                    "message", "Invalid username or password"));
        }
    }
}
