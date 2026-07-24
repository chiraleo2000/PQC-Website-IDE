package com.pqc.document.controller;

import com.pqc.document.dto.UserResponse;
import com.pqc.document.entity.User;
import com.pqc.document.entity.User.UserRole;
import com.pqc.document.service.UserService;
import com.pqc.model.CryptoAlgorithm;
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
 * User management controller.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    /**
     * Get current authenticated user.
     * GET /api/users/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        return userService.getUserByUsername(userDetails.getUsername())
                .map(user -> ResponseEntity.ok(userService.toUserResponse(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all users (Admin only).
     * GET /api/users
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers().stream()
                .map(userService::toUserResponse)
                .toList();
        return ResponseEntity.ok(users);
    }

    /**
     * Get user by ID.
     * GET /api/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable String userId) {
        return userService.getUserById(userId)
                .map(user -> ResponseEntity.ok(userService.toUserResponse(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get users by role (Admin only).
     * GET /api/users/role/{role}
     */
    @GetMapping("/role/{role}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getUsersByRole(@PathVariable UserRole role) {
        List<UserResponse> users = userService.getUsersByRole(role).stream()
                .map(userService::toUserResponse)
                .toList();
        return ResponseEntity.ok(users);
    }

    /**
     * Update user's algorithm preferences.
     * PUT /api/users/{userId}/algorithm
     */
    @PutMapping("/{userId}/algorithm")
    public ResponseEntity<?> updateAlgorithmPreferences(
            @PathVariable String userId,
            @RequestBody AlgorithmUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Check if user is updating their own preferences or is admin
        User currentUser = userService.getUserByUsername(userDetails.getUsername()).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.notFound().build();
        }

        if (!currentUser.getUserId().equals(userId) && currentUser.getRole() != UserRole.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }

        try {
            User updatedUser = userService.updateAlgorithmPreferences(
                    userId, request.signatureAlgorithm(), request.encryptionAlgorithm());
            return ResponseEntity.ok(userService.toUserResponse(updatedUser));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Regenerate user's cryptographic keys.
     * POST /api/users/{userId}/regenerate-keys
     */
    @PostMapping("/{userId}/regenerate-keys")
    public ResponseEntity<?> regenerateKeys(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = userService.getUserByUsername(userDetails.getUsername()).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.notFound().build();
        }

        if (!currentUser.getUserId().equals(userId) && currentUser.getRole() != UserRole.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }

        try {
            User updatedUser = userService.regenerateKeys(userId);
            return ResponseEntity.ok(Map.of(
                    "message", "Keys regenerated successfully",
                    "user", userService.toUserResponse(updatedUser)));
        } catch (Exception e) {
            log.error("Failed to regenerate keys", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // DTOs
    public record AlgorithmUpdateRequest(
            CryptoAlgorithm signatureAlgorithm,
            CryptoAlgorithm encryptionAlgorithm) {
    }
}
