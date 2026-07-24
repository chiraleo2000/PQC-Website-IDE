package com.pqc.document.controller;

import com.pqc.model.CryptoAlgorithm;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Health and information controller.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    /**
     * Health check.
     * GET /api/health
     */
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "PQC User & Document Service",
                "version", "1.0.0",
                "features", List.of(
                        "User Registration with PQC Keys",
                        "Document Signing with ML-DSA",
                        "JWT Authentication",
                        "Role-based Access Control")));
    }

    /**
     * Get available algorithms.
     * GET /api/algorithms
     */
    @GetMapping("/algorithms")
    public ResponseEntity<?> getAlgorithms() {
        List<Map<String, Object>> algorithms = Arrays.stream(CryptoAlgorithm.values())
                .map(algo -> Map.<String, Object>of(
                        "name", algo.name(),
                        "displayName", algo.getDisplayName(),
                        "purpose", algo.getPurpose(),
                        "quantumResistant", algo.isQuantumResistant(),
                        "threatLevel", algo.getQuantumThreatLevel()))
                .toList();

        return ResponseEntity.ok(Map.of(
                "pqcAlgorithms", algorithms.stream()
                        .filter(a -> (Boolean) a.get("quantumResistant"))
                        .toList(),
                "classicalAlgorithms", algorithms.stream()
                        .filter(a -> !(Boolean) a.get("quantumResistant"))
                        .toList()));
    }
}
