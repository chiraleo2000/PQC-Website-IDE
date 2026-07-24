package com.pqc.hacker.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Web Controller for Hacker Console UI
 * 
 * Serves the manual interactive demo interfaces:
 * - Harvest Dashboard: Real-time encrypted traffic interception
 * - Decrypt Dashboard: Quantum decryption with progress visualization
 * 
 * ⚠️ EDUCATIONAL PURPOSES ONLY
 */
@Controller
public class HackerWebController {

    /**
     * Main hacker dashboard - redirects to harvest.
     * GET /
     */
    @GetMapping("/")
    public String index() {
        return "redirect:/harvest";
    }

    /**
     * Harvest Dashboard - Intercept encrypted network traffic.
     * GET /harvest
     */
    @GetMapping("/harvest")
    public String harvestDashboard() {
        return "harvest-dashboard";
    }

    /**
     * Decrypt Dashboard - Quantum decryption progress.
     * GET /decrypt
     */
    @GetMapping("/decrypt")
    public String decryptDashboard() {
        return "decrypt-dashboard";
    }

    /**
     * Legacy dashboard path.
     * GET /dashboard
     */
    @GetMapping("/dashboard")
    public String legacyDashboard() {
        return "hacker-dashboard";
    }
}
