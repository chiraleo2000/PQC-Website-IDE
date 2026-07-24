package com.pqc.document.service;

import com.pqc.crypto.PqcCryptoService;
import com.pqc.document.dto.*;
import com.pqc.document.entity.User;
import com.pqc.document.entity.User.UserRole;
import com.pqc.document.repository.UserRepository;
import com.pqc.document.security.JwtTokenProvider;
import com.pqc.model.CryptoAlgorithm;
import com.pqc.model.KeyPairResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * User service with authentication and PQC key management.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final PqcCryptoService cryptoService = new PqcCryptoService();

    /**
     * Register a new user with PQC keys.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) throws GeneralSecurityException {
        log.info("Registering new user: {}", request.getUsername());

        // Check if username or email already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }

        // Generate user ID
        String userId = cryptoService.hashSHA384AsString(
                request.getUsername() + request.getEmail() + System.currentTimeMillis());

        // Generate PQC key pairs
        KeyPairResult mlDsaKeys = cryptoService.generateMLDSAKeyPair();
        KeyPairResult mlKemKeys = cryptoService.generateMLKEMKeyPair();
        KeyPairResult rsaKeys = cryptoService.generateRSAKeyPair();

        // Create user
        User user = User.builder()
                .userId(userId)
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(request.getRole() != null ? request.getRole() : UserRole.CITIZEN)
                .mlDsaPublicKey(mlDsaKeys.getPublicKey())
                .mlDsaPrivateKey(mlDsaKeys.getPrivateKey())
                .mlKemPublicKey(mlKemKeys.getPublicKey())
                .mlKemPrivateKey(mlKemKeys.getPrivateKey())
                .rsaPublicKey(rsaKeys.getPublicKey())
                .rsaPrivateKey(rsaKeys.getPrivateKey())
                .preferredSignatureAlgorithm(CryptoAlgorithm.ML_DSA)
                .preferredEncryptionAlgorithm(CryptoAlgorithm.ML_KEM)
                .keyGeneratedAt(LocalDateTime.now())
                .verified(false)
                .active(true)
                .build();

        user = userRepository.save(user);
        log.info("User registered successfully: {} ({})", user.getUsername(), user.getRole());

        // Generate token
        String token = jwtTokenProvider.generateToken(user.getUsername());

        return buildAuthResponse(user, token);
    }

    /**
     * Login user and return JWT token.
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for: {}", request.getUsernameOrEmail());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsernameOrEmail(),
                        request.getPassword()));

        User user = userRepository.findByUsername(request.getUsernameOrEmail())
                .orElseGet(() -> userRepository.findByEmail(request.getUsernameOrEmail())
                        .orElseThrow(() -> new IllegalArgumentException("User not found")));

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(authentication);

        log.info("User logged in: {}", user.getUsername());
        return buildAuthResponse(user, token);
    }

    /**
     * Get user by ID.
     */
    public Optional<User> getUserById(String userId) {
        return userRepository.findByUserId(userId);
    }

    /**
     * Get user by username.
     */
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Get all users.
     */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Get users by role.
     */
    public List<User> getUsersByRole(UserRole role) {
        return userRepository.findByRole(role);
    }

    /**
     * Update user algorithm preferences.
     */
    @Transactional
    public User updateAlgorithmPreferences(String userId,
            CryptoAlgorithm signatureAlgo,
            CryptoAlgorithm encryptionAlgo) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        user.setPreferredSignatureAlgorithm(signatureAlgo);
        user.setPreferredEncryptionAlgorithm(encryptionAlgo);

        log.info("Updated algorithm preferences for {}: sig={}, enc={}",
                user.getUsername(), signatureAlgo, encryptionAlgo);

        return userRepository.save(user);
    }

    /**
     * Regenerate user keys.
     */
    @Transactional
    public User regenerateKeys(String userId) throws GeneralSecurityException {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        KeyPairResult mlDsaKeys = cryptoService.generateMLDSAKeyPair();
        KeyPairResult mlKemKeys = cryptoService.generateMLKEMKeyPair();
        KeyPairResult rsaKeys = cryptoService.generateRSAKeyPair();

        user.setMlDsaPublicKey(mlDsaKeys.getPublicKey());
        user.setMlDsaPrivateKey(mlDsaKeys.getPrivateKey());
        user.setMlKemPublicKey(mlKemKeys.getPublicKey());
        user.setMlKemPrivateKey(mlKemKeys.getPrivateKey());
        user.setRsaPublicKey(rsaKeys.getPublicKey());
        user.setRsaPrivateKey(rsaKeys.getPrivateKey());
        user.setKeyGeneratedAt(LocalDateTime.now());

        log.info("Regenerated keys for user: {}", user.getUsername());
        return userRepository.save(user);
    }

    /**
     * Convert user to response DTO.
     */
    public UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .roleName(user.getRole().getDisplayName())
                .signatureAlgorithm(user.getPreferredSignatureAlgorithm())
                .encryptionAlgorithm(user.getPreferredEncryptionAlgorithm())
                .signatureThreatLevel(user.getPreferredSignatureAlgorithm().getQuantumThreatLevel())
                .encryptionThreatLevel(user.getPreferredEncryptionAlgorithm().getQuantumThreatLevel())
                .hasKeys(user.getMlDsaPublicKey() != null)
                .mlDsaKeySize(user.getMlDsaPublicKey() != null ? user.getMlDsaPublicKey().length : 0)
                .mlKemKeySize(user.getMlKemPublicKey() != null ? user.getMlKemPublicKey().length : 0)
                .rsaKeySize(user.getRsaPublicKey() != null ? user.getRsaPublicKey().length : 0)
                .active(user.isActive())
                .verified(user.isVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationInSeconds())
                .user(AuthResponse.UserInfo.builder()
                        .userId(user.getUserId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .role(user.getRole())
                        .signatureAlgorithm(user.getPreferredSignatureAlgorithm())
                        .encryptionAlgorithm(user.getPreferredEncryptionAlgorithm())
                        .hasKeys(user.getMlDsaPublicKey() != null)
                        .build())
                .build();
    }
}
