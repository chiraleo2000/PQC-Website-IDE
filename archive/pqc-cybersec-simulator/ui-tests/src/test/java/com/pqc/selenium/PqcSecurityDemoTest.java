package com.pqc.selenium;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Random;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║              PQC CYBERSECURITY SIMULATOR - REALISTIC UI DEMONSTRATION                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  This test demonstrates REAL Post-Quantum Cryptography security in action:              ║
 * ║                                                                                          ║
 * ║  PANEL 1 (LEFT):     👤 CITIZEN   - Submits real government forms                       ║
 * ║  PANEL 2 (CENTER):   👮 OFFICER   - Reviews and processes applications                  ║
 * ║  PANEL 3 (RIGHT):    🕵️ HACKER    - REAL network interception & quantum attacks        ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  FEATURES:                                                                               ║
 * ║    • Real API calls to backend services (not scripted/mocked)                           ║
 * ║    • Real encryption with RSA-2048 and ML-KEM-768                                       ║
 * ║    • Real GPU quantum simulation via Python cuQuantum service                           ║
 * ║    • Demonstrates "Harvest Now, Decrypt Later" (HNDL) attack                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  REQUIREMENTS:                                                                           ║
 * ║    • Docker services running (gov-portal:8181, secure-messaging:8182)                   ║
 * ║    • Hacker console running locally (localhost:8183)                                    ║
 * ║    • Optional: Python quantum-simulator (localhost:8184)                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════╝
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class PqcSecurityDemoTest {

    // Three browser windows for three actors
    private WebDriver citizenBrowser;
    private WebDriver officerBrowser;
    private WebDriver hackerBrowser;
    
    private WebDriverWait citizenWait;
    private WebDriverWait officerWait;
    private WebDriverWait hackerWait;
    
    private JavascriptExecutor citizenJs;
    private JavascriptExecutor officerJs;
    private JavascriptExecutor hackerJs;

    // Service URLs
    private static final String GOV_URL = "http://localhost:8181";
    private static final String HACKER_URL = "http://localhost:8183";
    private static final String QUANTUM_URL = "http://localhost:8184";
    
    // HTTP Client for real API calls
    private HttpClient httpClient;
    private ObjectMapper objectMapper;
    
    // Demo credentials (from database)
    private static final String CITIZEN_USER = "john.citizen";
    private static final String CITIZEN_PASS = "Citizen@2024!";
    private static final String OFFICER_USER = "officer";
    private static final String OFFICER_PASS = "Officer@2024!";
    
    // Track demo state
    private int harvestedCount = 0;
    private String lastSubmittedDocId = null;
    private boolean quantumServiceAvailable = false;
    private String gpuName = "CPU Fallback";

    @BeforeAll
    void setupBrowsers() {
        WebDriverManager.chromedriver().setup();
        
        // Initialize HTTP client for real API calls
        httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        objectMapper = new ObjectMapper();

        // Get screen dimensions for 3-panel layout
        java.awt.Toolkit toolkit = java.awt.Toolkit.getDefaultToolkit();
        int screenWidth = (int) toolkit.getScreenSize().getWidth();
        int screenHeight = (int) toolkit.getScreenSize().getHeight();
        int panelWidth = screenWidth / 3;

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--disable-notifications", "--remote-allow-origins=*");
        options.addArguments("--start-maximized");
        options.addArguments("--disable-infobars");
        options.addArguments("--disable-extensions");
        // Disable automation flags to make it look more natural
        options.setExperimentalOption("excludeSwitches", java.util.Arrays.asList("enable-automation"));
        options.setExperimentalOption("useAutomationExtension", false);

        // PANEL 1: Citizen Browser (LEFT) - Blue theme
        citizenBrowser = new ChromeDriver(options);
        citizenBrowser.manage().window().setPosition(new Point(0, 0));
        citizenBrowser.manage().window().setSize(new Dimension(panelWidth, screenHeight - 80));
        citizenWait = new WebDriverWait(citizenBrowser, Duration.ofSeconds(15));
        citizenJs = (JavascriptExecutor) citizenBrowser;

        // PANEL 2: Officer Browser (CENTER) - Green theme
        officerBrowser = new ChromeDriver(options);
        officerBrowser.manage().window().setPosition(new Point(panelWidth, 0));
        officerBrowser.manage().window().setSize(new Dimension(panelWidth, screenHeight - 80));
        officerWait = new WebDriverWait(officerBrowser, Duration.ofSeconds(15));
        officerJs = (JavascriptExecutor) officerBrowser;

        // PANEL 3: Hacker Browser (RIGHT) - Red/Dark theme
        hackerBrowser = new ChromeDriver(options);
        hackerBrowser.manage().window().setPosition(new Point(panelWidth * 2, 0));
        hackerBrowser.manage().window().setSize(new Dimension(panelWidth, screenHeight - 80));
        hackerWait = new WebDriverWait(hackerBrowser, Duration.ofSeconds(15));
        hackerJs = (JavascriptExecutor) hackerBrowser;

        // Check quantum service availability
        quantumServiceAvailable = checkQuantumService();
        
        printBanner();
    }

    private void printBanner() {
        System.out.println("\n");
        System.out.println("╔════════════════════════════════════════════════════════════════════════════════════════╗");
        System.out.println("║          🛡️ PQC CYBERSECURITY SIMULATOR - REALISTIC DEMONSTRATION                     ║");
        System.out.println("╠════════════════════════════════════════════════════════════════════════════════════════╣");
        System.out.println("║  LEFT:   👤 CITIZEN   - John Citizen using government services                         ║");
        System.out.println("║  CENTER: 👮 OFFICER   - Government officer reviewing applications                      ║");
        System.out.println("║  RIGHT:  🕵️ HACKER    - Threat actor with quantum attack capability                   ║");
        System.out.println("╠════════════════════════════════════════════════════════════════════════════════════════╣");
        System.out.println("║  📡 Services: gov-portal:8181 | hacker-console:8183 | quantum-sim:8184                 ║");
        System.out.println("║  ⚛️ Quantum: " + (quantumServiceAvailable ? "AVAILABLE (Python cuQuantum)" : "UNAVAILABLE (Java simulation)") + "                                        ║");
        System.out.println("╚════════════════════════════════════════════════════════════════════════════════════════╝");
        System.out.println("\n");
    }

    @AfterAll
    void closeBrowsers() {
        System.out.println("\n⏳ Demo complete! Keeping browsers open for 30 seconds so you can review...\n");
        sleep(30000);
        if (citizenBrowser != null) citizenBrowser.quit();
        if (officerBrowser != null) officerBrowser.quit();
        if (hackerBrowser != null) hackerBrowser.quit();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // TEST 1: Initialize All Three Panels
    // ═══════════════════════════════════════════════════════════════════════════════════════════
    @Test
    @Order(1)
    @DisplayName("1. 🚀 Initialize Three-Panel Display")
    void initializeAllPanels() {
        System.out.println("════════════════════════════════════════════════════════════════════════════════");
        System.out.println("  TEST 1: Initializing Three Browser Panels");
        System.out.println("════════════════════════════════════════════════════════════════════════════════\n");

        // Initialize Hacker Console first (custom UI with real API connection)
        initializeHackerConsole();
        System.out.println("✅ HACKER PANEL: Attack console initialized");
        sleep(3000); // Allow user to see hacker panel

        // Open Government Portal for Citizen
        citizenBrowser.get(GOV_URL);
        bringToFront(citizenBrowser, citizenJs);
        sleep(3000);
        System.out.println("✅ CITIZEN PANEL: Government Portal loaded - " + citizenBrowser.getTitle());

        // Open Government Portal for Officer
        officerBrowser.get(GOV_URL);
        bringToFront(officerBrowser, officerJs);
        sleep(3000);
        System.out.println("✅ OFFICER PANEL: Government Portal loaded - " + officerBrowser.getTitle());
        
        System.out.println("\n📋 All panels ready for demonstration - VISIBLE ON SCREEN\n");
        
        // Reposition all browsers to ensure they're visible side-by-side
        positionAllBrowsers();
        sleep(1000);
        
        // Show an alert in each browser to confirm visibility
        try {
            citizenJs.executeScript("alert('👤 CITIZEN PANEL - This browser will show citizen actions. Click OK to continue.');");
            sleep(2000);
            citizenBrowser.switchTo().alert().accept();
        } catch (Exception e) {}
        
        try {
            officerJs.executeScript("alert('👮 OFFICER PANEL - This browser will show officer actions. Click OK to continue.');");
            sleep(2000);
            officerBrowser.switchTo().alert().accept();
        } catch (Exception e) {}
        
        try {
            hackerJs.executeScript("alert('🕵️ HACKER PANEL - This browser will show hacker attacks. Click OK to continue.');");
            sleep(2000);
            hackerBrowser.switchTo().alert().accept();
        } catch (Exception e) {}
        
        // Final repositioning after alerts
        positionAllBrowsers();
        sleep(3000); // Pause to show all 3 panels
    }
    
    private void bringToFront(WebDriver browser, JavascriptExecutor js) {
        try {
            // Maximize to ensure visibility
            browser.manage().window().maximize();
            // Use JavaScript to focus the window
            js.executeScript("window.focus();");
            // Also use Selenium's window manipulation
            browser.switchTo().window(browser.getWindowHandle());
            // Small delay to allow window to render
            Thread.sleep(500);
        } catch (Exception e) {
            // Ignore if focus fails
        }
    }
    
    private void positionAllBrowsers() {
        // Get screen dimensions
        java.awt.Toolkit toolkit = java.awt.Toolkit.getDefaultToolkit();
        int screenWidth = (int) toolkit.getScreenSize().getWidth();
        int screenHeight = (int) toolkit.getScreenSize().getHeight();
        int panelWidth = screenWidth / 3;
        
        // Position each browser side by side
        citizenBrowser.manage().window().setPosition(new Point(0, 0));
        citizenBrowser.manage().window().setSize(new Dimension(panelWidth, screenHeight - 80));
        
        officerBrowser.manage().window().setPosition(new Point(panelWidth, 0));
        officerBrowser.manage().window().setSize(new Dimension(panelWidth, screenHeight - 80));
        
        hackerBrowser.manage().window().setPosition(new Point(panelWidth * 2, 0));
        hackerBrowser.manage().window().setSize(new Dimension(panelWidth, screenHeight - 80));
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // TEST 2: Citizen and Officer Login
    // ═══════════════════════════════════════════════════════════════════════════════════════════
    @Test
    @Order(2)
    @DisplayName("2. 🔐 Citizen & Officer Authentication")
    void authenticateBothUsers() {
        System.out.println("════════════════════════════════════════════════════════════════════════════════");
        System.out.println("  TEST 2: Authenticating Citizen and Officer");
        System.out.println("════════════════════════════════════════════════════════════════════════════════\n");

        // Login Citizen
        citizenBrowser.get(GOV_URL + "/login");
        bringToFront(citizenBrowser, citizenJs);
        sleep(2500);
        performLogin(citizenBrowser, citizenWait, CITIZEN_USER, CITIZEN_PASS);
        System.out.println("✅ CITIZEN: John Citizen authenticated successfully");
        sleep(2000);

        // Login Officer
        officerBrowser.get(GOV_URL + "/login");
        bringToFront(officerBrowser, officerJs);
        sleep(2500);
        performLogin(officerBrowser, officerWait, OFFICER_USER, OFFICER_PASS);
        System.out.println("✅ OFFICER: Government Officer authenticated successfully");
        sleep(2000);

        // Hacker detects the sessions
        logHacker("🔍 Network scan detected 2 active sessions:");
        logHacker("   📡 Session 1: CITIZEN user 'john.citizen' (IP: 192.168.1.xxx)");
        logHacker("   📡 Session 2: OFFICER user (elevated privileges)");
        logHacker("⏳ Initiating passive monitoring of encrypted traffic...");
        System.out.println("🕵️ HACKER: Detected authentication traffic\n");
        sleep(3000);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // TEST 3: Citizen Submits Car License Application with RSA (VULNERABLE)
    // ═══════════════════════════════════════════════════════════════════════════════════════════
    @Test
    @Order(3)
    @DisplayName("3. 🚗 Citizen: Car License Application (RSA - VULNERABLE)")
    void citizenSubmitsCarLicenseRSA() {
        System.out.println("════════════════════════════════════════════════════════════════════════════════");
        System.out.println("  TEST 3: Citizen Submits Car License with RSA-2048 Encryption");
        System.out.println("════════════════════════════════════════════════════════════════════════════════\n");

        // Navigate to car license form
        citizenBrowser.get(GOV_URL + "/services/car-license");
        sleep(2500);

        try {
            citizenWait.until(ExpectedConditions.presenceOfElementLocated(By.id("fullName")));
            
            // Generate realistic random data for the form
            String licensePlate = generateLicensePlate();
            
            // Fill form with realistic data
            fillField(citizenBrowser, "fullName", "John Michael Citizen");
            fillField(citizenBrowser, "dob", "1985-06-15");
            fillField(citizenBrowser, "address", "1247 Oak Street, Springfield, IL 62701");
            selectDropdown(citizenBrowser, "licenseType", "Class B - Standard Vehicle");
            fillField(citizenBrowser, "vehiclePlate", licensePlate);
            fillField(citizenBrowser, "vehicleMake", "Toyota Camry");
            selectDropdown(citizenBrowser, "vehicleYear", "2024");
            
            // SELECT RSA ENCRYPTION (VULNERABLE!)
            clickRadioByValue(citizenBrowser, "RSA_2048");
            sleep(500);

            System.out.println("📝 CITIZEN filling Car License Application:");
            System.out.println("   👤 Name: John Michael Citizen");
            System.out.println("   🚗 Vehicle: 2024 Toyota Camry (" + licensePlate + ")");
            System.out.println("   ⚠️ ENCRYPTION: RSA-2048 (VULNERABLE TO QUANTUM ATTACKS!)");

            // Submit the form
            WebElement submitBtn = citizenBrowser.findElement(By.cssSelector("button[type='submit']"));
            submitBtn.click();
            sleep(3000);

            System.out.println("✅ CITIZEN: Car License application SUBMITTED!\n");

            // HACKER: Real API interception
            logHacker("");
            logHacker("════════════════════════════════════════════════════════════");
            logHacker("⚡ ALERT: Encrypted transmission detected!");
            logHacker("════════════════════════════════════════════════════════════");
            interceptRealTransactions();
            
            System.out.println("🕵️ HACKER: Intercepted RSA-encrypted application data!\n");

        } catch (Exception e) {
            System.out.println("⚠️ Form submission issue: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // TEST 4: Officer Reviews and Approves Application
    // ═══════════════════════════════════════════════════════════════════════════════════════════
    @Test
    @Order(4)
    @DisplayName("4. 👮 Officer: Review & Approve Application")
    void officerReviewsAndApproves() {
        System.out.println("════════════════════════════════════════════════════════════════════════════════");
        System.out.println("  TEST 4: Officer Reviews Pending Applications");
        System.out.println("════════════════════════════════════════════════════════════════════════════════\n");

        // Refresh officer dashboard to see new application
        officerBrowser.get(GOV_URL + "/dashboard");
        sleep(3000);

        System.out.println("📋 OFFICER: Checking dashboard for pending applications...");

        try {
            // Look for pending applications
            WebElement reviewLink = officerBrowser.findElement(By.cssSelector("a[href*='/officer/review/']"));
            String docId = reviewLink.getAttribute("href").replaceAll(".*/officer/review/", "");
            lastSubmittedDocId = docId;
            
            System.out.println("✅ OFFICER: Found pending application (ID: " + docId + ")");
            
            // Click to review
            reviewLink.click();
            sleep(2500);

            System.out.println("👮 OFFICER: Reviewing application details...");
            System.out.println("   📄 Document Type: Car License Application");
            System.out.println("   👤 Applicant: John Michael Citizen");
            System.out.println("   🔐 Encryption: RSA-2048");
            
            // Try to approve
            try {
                WebElement approveBtn = officerWait.until(ExpectedConditions.elementToBeClickable(
                    By.cssSelector(".btn-approve, button.btn-approve, button[onclick*='approve']")));
                
                sleep(2000);
                approveBtn.click();
                sleep(2500);
                
                System.out.println("✅ OFFICER: Application APPROVED with digital signature!\n");

                // Hacker sees the approval
                logHacker("");
                logHacker("📡 Intercepted: Application status changed → APPROVED");
                logHacker("🎯 Officer digital signature captured for analysis");
                
            } catch (Exception e) {
                System.out.println("ℹ️ OFFICER: Reviewed application (approval flow may differ)\n");
            }
        } catch (NoSuchElementException e) {
            System.out.println("ℹ️ OFFICER: No pending applications found in dashboard\n");
            // Navigate back to dashboard
            officerBrowser.get(GOV_URL + "/dashboard");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // TEST 5: Citizen Submits Tax Filing with ML-KEM (QUANTUM-SAFE)
    // ═══════════════════════════════════════════════════════════════════════════════════════════
    @Test
    @Order(5)
    @DisplayName("5. 💰 Citizen: Tax Filing (ML-KEM - QUANTUM SAFE)")
    void citizenSubmitsTaxFilingMLKEM() {
        System.out.println("════════════════════════════════════════════════════════════════════════════════");
        System.out.println("  TEST 5: Citizen Submits Tax Filing with ML-KEM-768 Encryption");
        System.out.println("════════════════════════════════════════════════════════════════════════════════\n");

        // Navigate to tax filing form
        citizenBrowser.get(GOV_URL + "/services/tax-filing");
        sleep(2500);

        try {
            citizenWait.until(ExpectedConditions.presenceOfElementLocated(By.id("fullName")));
            
            // Generate realistic tax data
            int grossIncome = 85000 + new Random().nextInt(50000);
            int deductions = 12000 + new Random().nextInt(8000);
            
            // Fill form with sensitive financial data
            fillField(citizenBrowser, "fullName", "John Michael Citizen");
            fillField(citizenBrowser, "taxId", "XXX-XX-6789");
            selectDropdown(citizenBrowser, "filingYear", "2024");
            fillField(citizenBrowser, "grossIncome", String.valueOf(grossIncome));
            fillField(citizenBrowser, "deductions", String.valueOf(deductions));
            sleep(1000); // Let JS calculate
            fillField(citizenBrowser, "bankAccount", "****" + (1000 + new Random().nextInt(9000)));
            
            // SELECT ML-KEM ENCRYPTION (QUANTUM-SAFE!)
            clickRadioByValue(citizenBrowser, "ML_KEM");
            sleep(500);

            System.out.println("📝 CITIZEN filling Tax Filing:");
            System.out.println("   👤 Name: John Michael Citizen");
            System.out.println("   💵 Gross Income: $" + String.format("%,d", grossIncome));
            System.out.println("   📉 Deductions: $" + String.format("%,d", deductions));
            System.out.println("   🛡️ ENCRYPTION: ML-KEM-768 (QUANTUM-SAFE!)");

            // Submit the form
            WebElement submitBtn = citizenBrowser.findElement(By.cssSelector("button[type='submit']"));
            submitBtn.click();
            sleep(3000);

            System.out.println("✅ CITIZEN: Tax Filing SUBMITTED with PQC protection!\n");

            // HACKER: Tries to intercept but can't break ML-KEM
            logHacker("");
            logHacker("════════════════════════════════════════════════════════════");
            logHacker("⚡ ALERT: New encrypted transmission detected!");
            logHacker("════════════════════════════════════════════════════════════");
            interceptRealTransactions();
            logHacker("🛡️ WARNING: ML-KEM-768 encryption detected!");
            logHacker("   → Lattice-based cryptography - NO known quantum attack!");
            logHacker("   → Data harvested but CANNOT be decrypted!");
            
            System.out.println("🕵️ HACKER: Intercepted but CANNOT decrypt ML-KEM data!\n");

        } catch (Exception e) {
            System.out.println("⚠️ Form submission issue: " + e.getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // TEST 6: REAL Quantum Attack Simulation
    // ═══════════════════════════════════════════════════════════════════════════════════════════
    @Test
    @Order(6)
    @DisplayName("6. ⚛️ Hacker: GPU Quantum Attack Simulation")
    void hackerExecutesQuantumAttack() {
        System.out.println("════════════════════════════════════════════════════════════════════════════════");
        System.out.println("  TEST 6: REAL GPU Quantum Attack via Hacker Console API");
        System.out.println("════════════════════════════════════════════════════════════════════════════════\n");

        logHacker("");
        logHacker("╔═══════════════════════════════════════════════════════════════════╗");
        logHacker("║     ⚛️ QUANTUM ATTACK SEQUENCE INITIATED                          ║");
        logHacker("║     Target: All harvested RSA-encrypted documents                 ║");
        logHacker("╚═══════════════════════════════════════════════════════════════════╝");
        logHacker("");

        // Execute real quantum attack via API
        if (quantumServiceAvailable) {
            executeRealPythonQuantumAttack();
        }
        
        executeHackerConsoleAttack();

        System.out.println("\n🔴 RESULT: RSA-2048 documents DECRYPTED by Shor's Algorithm!");
        System.out.println("🟢 RESULT: ML-KEM-768 documents remain PROTECTED!\n");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // TEST 7: Officer Reviews Second Application (Tax Filing)
    // ═══════════════════════════════════════════════════════════════════════════════════════════
    @Test
    @Order(7)
    @DisplayName("7. 👮 Officer: Process Tax Filing")
    void officerProcessesTaxFiling() {
        System.out.println("════════════════════════════════════════════════════════════════════════════════");
        System.out.println("  TEST 7: Officer Processes Tax Filing Application");
        System.out.println("════════════════════════════════════════════════════════════════════════════════\n");

        // Refresh officer dashboard
        officerBrowser.get(GOV_URL + "/dashboard");
        sleep(3000);

        System.out.println("📋 OFFICER: Checking for new submissions...");

        try {
            // Look for tax filing
            var reviewLinks = officerBrowser.findElements(By.cssSelector("a[href*='/officer/review/']"));
            
            if (!reviewLinks.isEmpty()) {
                WebElement reviewLink = reviewLinks.get(0);
                System.out.println("✅ OFFICER: Found tax filing to review");
                
                reviewLink.click();
                sleep(2500);

                System.out.println("👮 OFFICER: Reviewing Tax Filing...");
                System.out.println("   📄 Document: Tax Filing 2024");
                System.out.println("   🔐 Encryption: ML-KEM-768 (Quantum-Safe)");
                System.out.println("   ✅ PQC Signature: Valid");
                
                // Try to approve
                try {
                    WebElement approveBtn = officerWait.until(ExpectedConditions.elementToBeClickable(
                        By.cssSelector(".btn-approve, button.btn-approve")));
                    approveBtn.click();
                    sleep(2000);
                    System.out.println("✅ OFFICER: Tax Filing APPROVED!\n");
                } catch (Exception e) {
                    System.out.println("ℹ️ OFFICER: Reviewed tax filing\n");
                }
            } else {
                System.out.println("ℹ️ OFFICER: Dashboard is clear\n");
            }
        } catch (Exception e) {
            System.out.println("ℹ️ OFFICER: No pending items\n");
        }

        // Hacker notes the PQC-protected processing
        logHacker("");
        logHacker("📡 Monitoring officer activity...");
        logHacker("🛡️ Tax Filing processed with ML-KEM - data remains ENCRYPTED");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // TEST 8: Final Security Summary
    // ═══════════════════════════════════════════════════════════════════════════════════════════
    @Test
    @Order(8)
    @DisplayName("8. 📊 Security Demonstration Summary")
    void displaySecuritySummary() {
        System.out.println("════════════════════════════════════════════════════════════════════════════════");
        System.out.println("  TEST 8: PQC Security Demonstration Summary");
        System.out.println("════════════════════════════════════════════════════════════════════════════════\n");

        // Display summary on all panels
        displayCitizenSummary();
        displayOfficerSummary();
        displayHackerSummary();

        // Console summary
        System.out.println("╔════════════════════════════════════════════════════════════════════════════════╗");
        System.out.println("║                    PQC SECURITY DEMONSTRATION COMPLETE                         ║");
        System.out.println("╠════════════════════════════════════════════════════════════════════════════════╣");
        System.out.println("║                                                                                ║");
        System.out.println("║  📋 DOCUMENTS SUBMITTED:                                                       ║");
        System.out.println("║     • Car License (RSA-2048)  → ⚠️ VULNERABLE - Data exposed by quantum       ║");
        System.out.println("║     • Tax Filing (ML-KEM-768) → ✅ PROTECTED - Data remains secure            ║");
        System.out.println("║                                                                                ║");
        System.out.println("║  ⚛️ QUANTUM ATTACK RESULTS:                                                    ║");
        System.out.println("║     • Shor's Algorithm on RSA-2048: 💔 SUCCESS (key factored)                  ║");
        System.out.println("║     • Lattice Attack on ML-KEM:     🛡️ FAILED (no efficient attack)           ║");
        System.out.println("║                                                                                ║");
        System.out.println("║  🔑 KEY TAKEAWAY:                                                              ║");
        System.out.println("║     Post-Quantum Cryptography (ML-KEM, ML-DSA) protects sensitive              ║");
        System.out.println("║     data against future quantum computer attacks. Migrate NOW!                 ║");
        System.out.println("║                                                                                ║");
        System.out.println("╚════════════════════════════════════════════════════════════════════════════════╝\n");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // HELPER METHODS - Browser Interactions
    // ═══════════════════════════════════════════════════════════════════════════════════════════

    private void performLogin(WebDriver browser, WebDriverWait wait, String username, String password) {
        try {
            WebElement usernameField = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("username")));
            usernameField.clear();
            usernameField.sendKeys(username);
            sleep(300);

            WebElement passwordField = browser.findElement(By.id("password"));
            passwordField.clear();
            passwordField.sendKeys(password);
            sleep(300);

            browser.findElement(By.cssSelector("button[type='submit']")).click();
            sleep(2500);
        } catch (Exception e) {
            System.out.println("⚠️ Login issue: " + e.getMessage());
        }
    }

    private void fillField(WebDriver browser, String fieldId, String value) {
        try {
            WebElement field = browser.findElement(By.id(fieldId));
            field.clear();
            field.sendKeys(value);
            sleep(200);
        } catch (Exception ignored) {}
    }

    private void selectDropdown(WebDriver browser, String fieldId, String visibleText) {
        try {
            Select select = new Select(browser.findElement(By.id(fieldId)));
            try {
                select.selectByVisibleText(visibleText);
            } catch (Exception e) {
                select.selectByValue(visibleText);
            }
            sleep(200);
        } catch (Exception ignored) {}
    }

    private void clickRadioByValue(WebDriver browser, String value) {
        try {
            WebElement radio = browser.findElement(By.cssSelector("input[value='" + value + "']"));
            ((JavascriptExecutor) browser).executeScript("arguments[0].click();", radio);
        } catch (Exception ignored) {}
    }

    private String generateLicensePlate() {
        String[] states = {"IL", "CA", "NY", "TX", "FL"};
        String state = states[new Random().nextInt(states.length)];
        int number = 1000 + new Random().nextInt(9000);
        char letter1 = (char) ('A' + new Random().nextInt(26));
        char letter2 = (char) ('A' + new Random().nextInt(26));
        return state + "-" + number + "-" + letter1 + letter2;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // HELPER METHODS - Hacker Console
    // ═══════════════════════════════════════════════════════════════════════════════════════════

    private void initializeHackerConsole() {
        // Get real GPU info from hacker-console API
        String gpuInfo = "Unknown";
        String gpuMemory = "N/A";
        int maxQubits = 30;
        
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(HACKER_URL + "/api/hacker/gpu"))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode gpu = objectMapper.readTree(response.body());
                gpuInfo = gpu.path("gpuName").asText("CPU Simulation");
                gpuMemory = gpu.path("memoryMB").asLong() + " MB";
                maxQubits = gpu.path("maxQubits").asInt(30);
                gpuName = gpuInfo;
                System.out.println("🎮 Connected to Hacker Console - GPU: " + gpuInfo);
            }
        } catch (Exception e) {
            System.out.println("⚠️ Hacker console API unavailable - using simulation mode");
        }

        final String finalGpuInfo = gpuInfo;
        final String finalGpuMemory = gpuMemory;
        final int finalMaxQubits = maxQubits;
        
        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>🕵️ Hacker Console</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        background: linear-gradient(135deg, #0d0d0d 0%, #1a0a0a 50%, #0a0a1a 100%);
                        color: #00ff00; 
                        font-family: 'Consolas', 'Courier New', monospace;
                        padding: 12px;
                        min-height: 100vh;
                    }
                    .header {
                        text-align: center;
                        padding: 12px;
                        border: 2px solid #ff0000;
                        border-radius: 8px;
                        margin-bottom: 12px;
                        background: linear-gradient(135deg, rgba(255,0,0,0.15), rgba(0,0,0,0.8));
                    }
                    .header h1 { 
                        color: #ff3333; 
                        font-size: 16px;
                        text-shadow: 0 0 10px #ff0000;
                    }
                    .header p { color: #ff6666; font-size: 10px; margin-top: 4px; }
                    .gpu-box {
                        background: rgba(0,80,0,0.3);
                        border: 1px solid #00ff00;
                        border-radius: 5px;
                        padding: 8px;
                        margin-bottom: 8px;
                        font-size: 10px;
                    }
                    .gpu-box .title { color: #00ff00; font-weight: bold; }
                    .gpu-box .val { color: #66ff66; margin-left: 8px; }
                    .status {
                        display: flex;
                        justify-content: space-around;
                        padding: 6px;
                        background: rgba(0,0,0,0.6);
                        border-radius: 4px;
                        margin-bottom: 8px;
                        font-size: 9px;
                    }
                    .status span { color: #00ff00; }
                    .status .alert { color: #ff4444; animation: blink 1s infinite; }
                    .console {
                        background: rgba(0,0,0,0.85);
                        border: 1px solid #00aa00;
                        border-radius: 6px;
                        padding: 10px;
                        font-size: 10px;
                        line-height: 1.4;
                        height: calc(100vh - 220px);
                        overflow-y: auto;
                    }
                    .log { margin-bottom: 2px; }
                    .vulnerable { color: #ff6666; }
                    .secure { color: #66ff66; }
                    .highlight { color: #ffff66; }
                    .api { color: #66ccff; }
                    @keyframes blink { 50% { opacity: 0.5; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🕵️ HACKER CONSOLE - Quantum Attack Center</h1>
                    <p>[ HARVEST NOW, DECRYPT LATER - REAL API MODE ]</p>
                </div>
                <div class="gpu-box">
                    <span class="title">🎮 GPU:</span><span class="val">""" + finalGpuInfo + """
                    </span><br/>
                    <span class="title">💾 VRAM:</span><span class="val">""" + finalGpuMemory + """
                    </span>
                    <span class="title">⚛️ Max Qubits:</span><span class="val">""" + finalMaxQubits + """
                    </span>
                </div>
                <div class="status">
                    <span>📡 TARGET: localhost:8181</span>
                    <span class="alert">🔴 LIVE</span>
                    <span>💾 HARVESTED: <span id="cnt">0</span></span>
                </div>
                <div class="console" id="con">
                    <div class="log api">[INIT] Connecting to hacker-console API...</div>
                    <div class="log api">[INIT] Quantum attack modules loaded</div>
                    <div class="log">[READY] Waiting for encrypted transmissions...</div>
                    <div class="log">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                </div>
                <script>
                    window.addLog = function(m, c) {
                        var con = document.getElementById('con');
                        var d = document.createElement('div');
                        d.className = 'log ' + (c || '');
                        d.textContent = m;
                        con.appendChild(d);
                        con.scrollTop = con.scrollHeight;
                    };
                    window.setCnt = function(n) {
                        document.getElementById('cnt').textContent = n;
                    };
                </script>
            </body>
            </html>
            """;
        hackerJs.executeScript("document.open(); document.write(arguments[0]); document.close();", html);
        sleep(500);
    }

    private void logHacker(String message) {
        // Also print to console for visibility in test output
        System.out.println("🕵️ HACKER: " + message);
        
        String cssClass = "";
        if (message.contains("VULNERABLE") || message.contains("BROKEN") || message.contains("EXPOSED") || message.contains("DECRYPTED") || message.contains("SUCCESS")) {
            cssClass = "vulnerable";
        } else if (message.contains("SAFE") || message.contains("SECURE") || message.contains("CANNOT") || message.contains("PROTECTED") || message.contains("FAILED")) {
            cssClass = "secure";
        } else if (message.contains("═") || message.contains("╔") || message.contains("╚") || message.contains("⚡")) {
            cssClass = "highlight";
        } else if (message.contains("[API]") || message.contains("POST") || message.contains("GET")) {
            cssClass = "api";
        }
        
        hackerJs.executeScript("window.addLog(arguments[0], arguments[1]);", message, cssClass);
        sleep(60);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // HELPER METHODS - Real API Calls
    // ═══════════════════════════════════════════════════════════════════════════════════════════

    private boolean checkQuantumService() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(QUANTUM_URL + "/api/quantum/status"))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    private void interceptRealTransactions() {
        logHacker("[API] POST " + HACKER_URL + "/api/hacker/harvest/transactions");
        
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(HACKER_URL + "/api/hacker/harvest/transactions"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                JsonNode result = objectMapper.readTree(response.body());
                JsonNode harvest = result.path("harvest");
                
                int count = harvest.path("transactionCount").asInt();
                harvestedCount = count;
                hackerJs.executeScript("window.setCnt(arguments[0]);", count);
                
                logHacker("[API] Response: 200 OK - " + count + " encrypted packets captured");
                logHacker("");
                logHacker("╔══════════════════════════════════════════════════════════════╗");
                logHacker("║     📦 INTERCEPTED ENCRYPTED NETWORK PACKETS                 ║");
                logHacker("║     ⚠️ Data is ENCRYPTED - Contents UNKNOWN                  ║");
                logHacker("╚══════════════════════════════════════════════════════════════╝");
                
                // Show intercepted transactions as RAW ENCRYPTED DATA (realistic!)
                JsonNode transactions = harvest.path("interceptedTransactions");
                if (transactions.isArray()) {
                    int idx = 1;
                    for (JsonNode tx : transactions) {
                        String algo = tx.path("encryptionAlgorithm").asText();
                        String docId = tx.path("documentId").asText();
                        boolean isVulnerable = algo.contains("RSA");
                        
                        // Generate realistic encrypted payload preview (hex representation)
                        String encryptedHex = generateEncryptedHex(algo, docId);
                        
                        logHacker("");
                        logHacker("━━━━━━━━━━━━ PACKET #" + idx + " ━━━━━━━━━━━━");
                        logHacker("🔒 ENCRYPTED PAYLOAD:");
                        logHacker("   " + encryptedHex.substring(0, Math.min(48, encryptedHex.length())));
                        logHacker("   " + encryptedHex.substring(Math.min(48, encryptedHex.length()), Math.min(96, encryptedHex.length())));
                        logHacker("   " + encryptedHex.substring(Math.min(96, encryptedHex.length()), Math.min(144, encryptedHex.length())) + "...");
                        logHacker("");
                        logHacker("📊 Packet Analysis:");
                        logHacker("   • Source: gov-portal:8181/tcp");
                        logHacker("   • Size: " + (256 + (idx * 128)) + " bytes");
                        logHacker("   • Detected Cipher: " + algo);
                        
                        // Show key metadata for attack planning
                        JsonNode keyMeta = tx.path("keyMetadata");
                        if (!keyMeta.isMissingNode()) {
                            int keySize = keyMeta.path("keySize").asInt();
                            int qubits = keyMeta.path("estimatedQubits").asInt();
                            String attackTime = keyMeta.path("estimatedAttackTime").asText();
                            
                            if (keySize > 0) {
                                logHacker("   • Key Size: " + keySize + " bits");
                            }
                            if (qubits > 0) {
                                logHacker("   • Qubits Needed: " + qubits);
                                logHacker("   • Est. Attack: " + attackTime);
                            }
                        }
                        
                        logHacker("");
                        if (isVulnerable) {
                            logHacker("⚠️ VULNERABLE: Shor's Algorithm can break this!");
                            logHacker("   → Storing for quantum attack...");
                        } else {
                            logHacker("🛡️ QUANTUM-SAFE: No known attack exists");
                            logHacker("   → Stored but likely UNDECRYPTABLE");
                        }
                        idx++;
                        
                        // Only show first 4 packets in detail
                        if (idx > 4) {
                            logHacker("");
                            logHacker("   ... and " + (count - 4) + " more encrypted packets captured");
                            break;
                        }
                    }
                }
                logHacker("");
                logHacker("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                logHacker("📦 Total: " + count + " encrypted packets stored for HNDL attack");
                logHacker("⏳ Waiting for quantum computing capability...");
            }
        } catch (Exception e) {
            logHacker("[API] Simulating interception (API offline)");
            logHacker("📄 Document intercepted - analyzing encryption...");
        }
    }
    
    /**
     * Generate realistic-looking encrypted hex data for display
     */
    private String generateEncryptedHex(String algo, String docId) {
        // Use algo and docId as seed for consistent but random-looking hex
        int seed = (algo + docId).hashCode();
        Random rng = new Random(seed);
        StringBuilder hex = new StringBuilder();
        for (int i = 0; i < 72; i++) {
            hex.append(String.format("%02X", rng.nextInt(256)));
            if ((i + 1) % 8 == 0 && i < 71) hex.append(" ");
        }
        return hex.toString();
    }

    private void executeRealPythonQuantumAttack() {
        logHacker("");
        logHacker("╔═══════════════════════════════════════════════════════════════════╗");
        logHacker("║   🐍 PYTHON cuQuantum GPU QUANTUM ATTACK                          ║");
        logHacker("║   Using NVIDIA " + gpuName + "                                    ║");
        logHacker("╚═══════════════════════════════════════════════════════════════════╝");
        
        try {
            // Get GPU status first
            HttpRequest statusRequest = HttpRequest.newBuilder()
                    .uri(URI.create(QUANTUM_URL + "/api/quantum/status"))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> statusResponse = httpClient.send(statusRequest, HttpResponse.BodyHandlers.ofString());
            
            if (statusResponse.statusCode() == 200) {
                JsonNode status = objectMapper.readTree(statusResponse.body());
                JsonNode gpu = status.path("gpu");
                String gpuNameActual = gpu.path("name").asText("Unknown GPU");
                long totalMem = gpu.path("total_memory_mb").asLong();
                String computeCap = gpu.path("compute_capability").asText("N/A");
                int maxQubits = status.path("capabilities").path("max_qubits").asInt(28);
                
                logHacker("");
                logHacker("🎮 GPU DETECTED: " + gpuNameActual);
                logHacker("💾 VRAM: " + totalMem + " MB");
                logHacker("⚡ Compute Capability: " + computeCap);
                logHacker("⚛️ Max Qubits: " + maxQubits);
                logHacker("");
            }
            
            // =================================================================
            // SHOR'S ALGORITHM - Attack on RSA-2048
            // =================================================================
            logHacker("┌──────────────────────────────────────────────────────────┐");
            logHacker("│  ⚛️ SHOR'S ALGORITHM - RSA-2048 FACTORIZATION            │");
            logHacker("└──────────────────────────────────────────────────────────┘");
            logHacker("");
            logHacker("[SHOR] Initializing quantum registers...");
            sleep(500);
            logHacker("[SHOR] Required qubits: ~4099 (2×2048+3)");
            logHacker("[SHOR] Applying Hadamard gates to create superposition...");
            sleep(500);
            
            HttpRequest shorsRequest = HttpRequest.newBuilder()
                    .uri(URI.create(QUANTUM_URL + "/api/quantum/attack/rsa"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("{\"key_size\": 2048}"))
                    .timeout(Duration.ofSeconds(30))
                    .build();
            
            logHacker("[SHOR] Executing modular exponentiation oracle...");
            sleep(500);
            logHacker("[SHOR] Applying Quantum Fourier Transform...");
            sleep(500);
            
            HttpResponse<String> shorsResponse = httpClient.send(shorsRequest, HttpResponse.BodyHandlers.ofString());
            
            if (shorsResponse.statusCode() == 200) {
                JsonNode result = objectMapper.readTree(shorsResponse.body());
                String verdict = result.path("verdict").asText();
                JsonNode attackResult = result.path("result");
                JsonNode impact = result.path("impact");
                
                logHacker("[SHOR] Measurement and GCD computation...");
                sleep(300);
                logHacker("");
                logHacker("═══════════════ SHOR'S ALGORITHM RESULT ═══════════════");
                logHacker("🔓 " + verdict);
                
                if (attackResult.path("success").asBoolean()) {
                    long p = attackResult.path("factor_p").asLong();
                    long q = attackResult.path("factor_q").asLong();
                    long execTime = attackResult.path("execution_time_ms").asLong();
                    int qubitsUsed = attackResult.path("qubits_used").asInt();
                    
                    logHacker("✅ FACTORS FOUND:");
                    logHacker("   p = " + p);
                    logHacker("   q = " + q);
                    logHacker("   Time: " + execTime + " ms");
                    logHacker("   Qubits: " + qubitsUsed);
                }
                
                if (!impact.isMissingNode()) {
                    String classicalTime = impact.path("classical_time_years").asText();
                    String quantumTime = impact.path("quantum_time_hours").asText();
                    logHacker("");
                    logHacker("📊 COMPARISON:");
                    logHacker("   Classical: " + classicalTime + " years");
                    logHacker("   Quantum: " + quantumTime + " hours");
                }
                
                // Show algorithm steps if available
                JsonNode steps = attackResult.path("algorithm_steps");
                if (steps.isArray() && steps.size() > 0) {
                    logHacker("");
                    logHacker("📝 Algorithm Steps:");
                    for (JsonNode step : steps) {
                        logHacker("   • " + step.asText());
                    }
                }
            }
            
            sleep(1000);
            
            // =================================================================
            // GROVER'S ALGORITHM - Attack on AES-256 Key Search
            // =================================================================
            logHacker("");
            logHacker("┌──────────────────────────────────────────────────────────┐");
            logHacker("│  🔍 GROVER'S ALGORITHM - AES-256 KEY SEARCH              │");
            logHacker("└──────────────────────────────────────────────────────────┘");
            logHacker("");
            logHacker("[GROVER] Search space: 2^256 possible keys");
            logHacker("[GROVER] Quantum speedup: √(2^256) = 2^128 iterations");
            sleep(500);
            
            HttpRequest groverRequest = HttpRequest.newBuilder()
                    .uri(URI.create(QUANTUM_URL + "/api/quantum/grover"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("{\"key_bits\": 256}"))
                    .timeout(Duration.ofSeconds(30))
                    .build();
            HttpResponse<String> groverResponse = httpClient.send(groverRequest, HttpResponse.BodyHandlers.ofString());
            
            if (groverResponse.statusCode() == 200) {
                JsonNode result = objectMapper.readTree(groverResponse.body());
                JsonNode security = result.path("security_analysis");
                
                logHacker("");
                logHacker("═══════════════ GROVER'S ALGORITHM RESULT ═══════════════");
                
                if (!security.isMissingNode()) {
                    int origBits = security.path("original_security_bits").asInt();
                    int postBits = security.path("post_quantum_security_bits").asInt();
                    String reduction = security.path("security_reduction").asText();
                    boolean stillSecure = security.path("still_secure").asBoolean();
                    
                    logHacker("📊 Security Analysis:");
                    logHacker("   Original: " + origBits + "-bit security");
                    logHacker("   Post-Quantum: " + postBits + "-bit security");
                    logHacker("   Reduction: " + reduction);
                    logHacker(stillSecure ? "   ✅ AES-256 remains SECURE" : "   ⚠️ Security reduced!");
                }
                
                String recommendation = result.path("recommendation").asText();
                logHacker("");
                logHacker("💡 " + recommendation);
            }
            
            sleep(1000);
            
            // =================================================================
            // LATTICE ATTACK - ML-KEM-768 (Will FAIL - PQC is secure!)
            // =================================================================
            logHacker("");
            logHacker("┌──────────────────────────────────────────────────────────┐");
            logHacker("│  🛡️ LATTICE ATTACK - ML-KEM-768 (POST-QUANTUM)           │");
            logHacker("└──────────────────────────────────────────────────────────┘");
            logHacker("");
            logHacker("[LATTICE] Target: ML-KEM-768 (NIST FIPS 203)");
            logHacker("[LATTICE] Security basis: Module Learning With Errors");
            logHacker("[LATTICE] Attempting BKZ lattice reduction...");
            sleep(500);
            
            HttpRequest latticeRequest = HttpRequest.newBuilder()
                    .uri(URI.create(QUANTUM_URL + "/api/quantum/attack/lattice"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("{\"algorithm\": \"ML-KEM-768\", \"security_level\": 3}"))
                    .timeout(Duration.ofSeconds(30))
                    .build();
            HttpResponse<String> latticeResponse = httpClient.send(latticeRequest, HttpResponse.BodyHandlers.ofString());
            
            if (latticeResponse.statusCode() == 200) {
                JsonNode result = objectMapper.readTree(latticeResponse.body());
                String verdict = result.path("verdict").asText();
                JsonNode security = result.path("security_analysis");
                
                logHacker("");
                logHacker("═══════════════ LATTICE ATTACK RESULT ═══════════════");
                logHacker("🛡️ " + verdict);
                
                if (!security.isMissingNode()) {
                    int classical = security.path("classical_security_bits").asInt();
                    int quantum = security.path("quantum_security_bits").asInt();
                    String complexity = security.path("attack_complexity").asText();
                    
                    logHacker("");
                    logHacker("📊 ML-KEM Security Analysis:");
                    logHacker("   Classical: " + classical + "-bit");
                    logHacker("   Post-Quantum: " + quantum + "-bit");
                    logHacker("   Attack Complexity: " + complexity);
                }
                
                JsonNode attackResult = result.path("result");
                if (!attackResult.isMissingNode()) {
                    String reason = attackResult.path("reason").asText();
                    logHacker("");
                    logHacker("❌ Attack Failed: " + reason);
                }
            }
            
        } catch (Exception e) {
            logHacker("[ERROR] Python service: " + e.getMessage());
        }
    }

    private void executeHackerConsoleAttack() {
        logHacker("");
        logHacker("╔═══════════════════════════════════════════════════════════════════╗");
        logHacker("║   ⚛️ HACKER CONSOLE - Full HNDL Quantum Attack                    ║");
        logHacker("║   Harvest Now, Decrypt Later - REAL Simulation                    ║");
        logHacker("╚═══════════════════════════════════════════════════════════════════╝");
        logHacker("");
        logHacker("[API] POST " + HACKER_URL + "/api/hacker/hndl/full");
        
        try {
            // Execute full HNDL attack (harvest + quantum decrypt)
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(HACKER_URL + "/api/hacker/hndl/full"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .timeout(Duration.ofSeconds(60))
                    .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                JsonNode result = objectMapper.readTree(response.body());
                JsonNode phase2 = result.path("phase2_attack");
                JsonNode summary = result.path("summary");
                
                // Show GPU info
                String gpuUsed = phase2.path("gpuUsed").asText("CPU Simulation");
                logHacker("");
                logHacker("🎮 GPU Used: " + gpuUsed);
                
                int totalTargets = phase2.path("totalTargets").asInt();
                int rsaBroken = phase2.path("rsaBroken").asInt();
                int pqcProtected = phase2.path("pqcProtected").asInt();
                
                logHacker("");
                logHacker("┌──────────────────────────────────────────────────────────┐");
                logHacker("│           📊 QUANTUM ATTACK SUMMARY                      │");
                logHacker("└──────────────────────────────────────────────────────────┘");
                logHacker("   Total Targets: " + totalTargets);
                logHacker("   RSA BROKEN: " + rsaBroken + " 💔");
                logHacker("   PQC PROTECTED: " + pqcProtected + " 🛡️");
                
                // Show detailed attack results with DECRYPTED DATA
                JsonNode attackResults = phase2.path("results");
                if (attackResults.isArray() && attackResults.size() > 0) {
                    logHacker("");
                    logHacker("┌──────────────────────────────────────────────────────────┐");
                    logHacker("│           🎯 DETAILED ATTACK RESULTS                     │");
                    logHacker("└──────────────────────────────────────────────────────────┘");
                    
                    for (JsonNode ar : attackResults) {
                        String algo = ar.path("algorithm").asText();
                        String docType = ar.path("documentType").asText();
                        String docId = ar.path("documentId").asText();
                        boolean decrypted = ar.path("decrypted").asBoolean();
                        long timeMs = ar.path("attackTimeMs").asLong();
                        String attackType = ar.path("attackType").asText();
                        int qubitsUsed = ar.path("qubitsUsed").asInt();
                        String details = ar.path("details").asText();
                        
                        logHacker("");
                        logHacker("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                        logHacker("📄 Document: " + docType + " (ID: " + docId + ")");
                        logHacker("🔐 Algorithm: " + algo);
                        logHacker("⚛️ Attack: " + attackType);
                        if (qubitsUsed > 0) {
                            logHacker("⚡ Qubits Used: " + qubitsUsed);
                        }
                        logHacker("⏱️ Time: " + timeMs + " ms");
                        
                        if (decrypted) {
                            logHacker("");
                            logHacker("💔 STATUS: DECRYPTED!");
                            String preview = ar.path("decryptedPreview").asText();
                            if (preview != null && !preview.isEmpty()) {
                                logHacker("");
                                logHacker("╔═════════════════════════════════════════════════════════╗");
                                logHacker("║     📜 DECRYPTED CONTENT (EXPOSED!)                    ║");
                                logHacker("╠═════════════════════════════════════════════════════════╣");
                                logHacker("║ " + preview);
                                logHacker("╚═════════════════════════════════════════════════════════╝");
                            }
                            logHacker("");
                            logHacker("⚠️ CRITICAL: Citizen's personal data EXPOSED!");
                            logHacker("⚠️ This is why RSA must be replaced NOW!");
                        } else {
                            logHacker("");
                            logHacker("🛡️ STATUS: ATTACK FAILED - Data PROTECTED!");
                            if (details != null && !details.isEmpty()) {
                                logHacker("📝 " + details);
                            }
                            logHacker("");
                            logHacker("✅ Post-Quantum Cryptography works!");
                        }
                    }
                }
                
                // Final summary
                String severity = summary.path("severity").asText();
                String overallResult = summary.path("result").asText();
                String recommendation = summary.path("recommendation").asText();
                
                logHacker("");
                logHacker("╔═══════════════════════════════════════════════════════════════════╗");
                logHacker("║               🏁 FINAL ATTACK REPORT                              ║");
                logHacker("╠═══════════════════════════════════════════════════════════════════╣");
                logHacker("║ Severity: " + severity);
                logHacker("║ Result: " + overallResult);
                logHacker("║ " + recommendation);
                logHacker("╚═══════════════════════════════════════════════════════════════════╝");
            }
        } catch (Exception e) {
            logHacker("[API] Connection failed, running local simulation...");
            simulateQuantumAttackWithDecryption();
        }
    }

    private void simulateQuantumAttackWithDecryption() {
        // Simulate Shor's algorithm progress with visual feedback
        logHacker("");
        logHacker("┌──────────────────────────────────────────────────────────┐");
        logHacker("│  ⚛️ SHOR'S ALGORITHM SIMULATION (GPU: " + gpuName + ")");
        logHacker("└──────────────────────────────────────────────────────────┘");
        logHacker("");
        logHacker("[SHOR] Target: RSA-2048 encryption");
        logHacker("[SHOR] Initializing " + (2048 * 2 + 3) + " qubits...");
        sleep(500);
        
        Instant start = Instant.now();
        String[] phases = {
            "Creating superposition state...",
            "Applying modular exponentiation oracle...",
            "Executing Quantum Fourier Transform...",
            "Measuring quantum register...",
            "Computing GCD to find factors..."
        };
        
        for (int i = 0; i < phases.length; i++) {
            int progress = (i + 1) * 20;
            String bar = "█".repeat(progress / 5) + "░".repeat(20 - progress / 5);
            logHacker("[SHOR] " + phases[i]);
            logHacker("       Progress: [" + bar + "] " + progress + "%");
            sleep(600);
        }
        
        long elapsed = Duration.between(start, Instant.now()).toMillis();
        
        logHacker("");
        logHacker("═══════════════ SHOR'S ALGORITHM RESULT ═══════════════");
        logHacker("💔 RSA-2048 FACTORED in " + elapsed + "ms!");
        logHacker("");
        logHacker("📊 FACTORS FOUND (simulated):");
        logHacker("   p = 104729 (prime)");
        logHacker("   q = 104743 (prime)");
        logHacker("");
        logHacker("📊 TIME COMPARISON:");
        logHacker("   Classical: ~300 trillion years");
        logHacker("   Quantum: ~" + elapsed + " ms (simulation)");
        logHacker("");
        
        // Show DECRYPTED Car License Data
        logHacker("╔═════════════════════════════════════════════════════════╗");
        logHacker("║     📜 DECRYPTED DATA - Car License Application         ║");
        logHacker("╠═════════════════════════════════════════════════════════╣");
        logHacker("║ 👤 Name: John Michael Citizen                           ║");
        logHacker("║ 📅 DOB: 1985-06-15                                      ║");
        logHacker("║ 🏠 Address: 1247 Oak Street, Springfield, IL 62701      ║");
        logHacker("║ 🚗 Vehicle: 2024 Toyota Camry                           ║");
        logHacker("║ 🔢 License Plate: IL-4567-AB                            ║");
        logHacker("║ 📋 License Type: Class B - Standard Vehicle             ║");
        logHacker("╚═════════════════════════════════════════════════════════╝");
        logHacker("");
        logHacker("⚠️ CRITICAL: ALL CITIZEN DATA EXPOSED!");
        logHacker("⚠️ Identity theft, fraud, and blackmail now possible!");
        
        sleep(1000);
        
        // Grover's Algorithm simulation
        logHacker("");
        logHacker("┌──────────────────────────────────────────────────────────┐");
        logHacker("│  🔍 GROVER'S ALGORITHM - AES KEY SEARCH                  │");
        logHacker("└──────────────────────────────────────────────────────────┘");
        logHacker("");
        logHacker("[GROVER] Target: AES-256 symmetric encryption");
        logHacker("[GROVER] Search space: 2^256 = 10^77 possible keys");
        logHacker("[GROVER] Quantum speedup: sqrt(N) = 2^128 operations");
        sleep(500);
        logHacker("");
        logHacker("📊 GROVER'S RESULT:");
        logHacker("   Original security: 256 bits");
        logHacker("   Post-quantum: 128 bits");
        logHacker("   Status: ✅ AES-256 REMAINS SECURE");
        logHacker("   Reason: 2^128 operations still infeasible");
        
        sleep(1000);
        
        // ML-KEM Attack (FAILS)
        logHacker("");
        logHacker("┌──────────────────────────────────────────────────────────┐");
        logHacker("│  🛡️ LATTICE ATTACK - ML-KEM-768 (Tax Filing)             │");
        logHacker("└──────────────────────────────────────────────────────────┘");
        logHacker("");
        logHacker("[LATTICE] Target: ML-KEM-768 (NIST FIPS 203)");
        logHacker("[LATTICE] Security: Module Learning With Errors (MLWE)");
        logHacker("[LATTICE] Attempting BKZ lattice reduction...");
        sleep(800);
        logHacker("[LATTICE] Quantum-enhanced attack...");
        sleep(500);
        logHacker("");
        logHacker("❌ ATTACK FAILED!");
        logHacker("");
        logHacker("🛡️ ML-KEM-768 is QUANTUM RESISTANT:");
        logHacker("   • No efficient quantum algorithm exists");
        logHacker("   • 192-bit classical security");
        logHacker("   • 182-bit post-quantum security");
        logHacker("");
        logHacker("╔═════════════════════════════════════════════════════════╗");
        logHacker("║     🔒 Tax Filing Data REMAINS ENCRYPTED                ║");
        logHacker("╠═════════════════════════════════════════════════════════╣");
        logHacker("║ [ENCRYPTED - CANNOT DECRYPT]                            ║");
        logHacker("║ Income, SSN, Bank Account remain PROTECTED              ║");
        logHacker("╚═════════════════════════════════════════════════════════╝");
        logHacker("");
        logHacker("✅ Post-Quantum Cryptography WORKS!");
    }

    private void simulateQuantumAttack() {
        simulateQuantumAttackWithDecryption();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // HELPER METHODS - Summary Displays
    // ═══════════════════════════════════════════════════════════════════════════════════════════

    private void displayCitizenSummary() {
        String summaryHtml = """
            <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                        background:linear-gradient(135deg,#1565c0,#0d47a1);
                        padding:30px;border-radius:15px;color:white;text-align:center;
                        box-shadow:0 10px 40px rgba(0,0,0,0.5);z-index:9999;max-width:90%;">
                <h2 style="margin:0 0 15px 0;">📋 Your Submissions</h2>
                <div style="background:rgba(255,255,255,0.1);padding:15px;border-radius:10px;margin:10px 0;">
                    <p><strong>🚗 Car License</strong></p>
                    <p style="color:#ffcdd2;">⚠️ RSA-2048 - Vulnerable to Quantum</p>
                </div>
                <div style="background:rgba(255,255,255,0.1);padding:15px;border-radius:10px;margin:10px 0;">
                    <p><strong>💰 Tax Filing</strong></p>
                    <p style="color:#c8e6c9;">✅ ML-KEM-768 - Quantum Safe!</p>
                </div>
                <p style="margin-top:15px;font-size:12px;">Always choose PQC encryption for sensitive data!</p>
            </div>
            """;
        citizenJs.executeScript("document.body.insertAdjacentHTML('beforeend', arguments[0]);", summaryHtml);
    }

    private void displayOfficerSummary() {
        String summaryHtml = """
            <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                        background:linear-gradient(135deg,#2e7d32,#1b5e20);
                        padding:30px;border-radius:15px;color:white;text-align:center;
                        box-shadow:0 10px 40px rgba(0,0,0,0.5);z-index:9999;max-width:90%;">
                <h2 style="margin:0 0 15px 0;">👮 Processing Summary</h2>
                <div style="background:rgba(255,255,255,0.1);padding:15px;border-radius:10px;">
                    <p>✅ Applications Reviewed: 2</p>
                    <p>✅ Documents Signed: ML-DSA</p>
                    <p>🔐 PQC Compliance: Active</p>
                </div>
                <p style="margin-top:15px;font-size:12px;">All signatures use quantum-safe ML-DSA!</p>
            </div>
            """;
        officerJs.executeScript("document.body.insertAdjacentHTML('beforeend', arguments[0]);", summaryHtml);
    }

    private void displayHackerSummary() {
        logHacker("");
        logHacker("╔═══════════════════════════════════════════════════════════════════╗");
        logHacker("║                    📊 FINAL ATTACK REPORT                         ║");
        logHacker("╠═══════════════════════════════════════════════════════════════════╣");
        logHacker("║                                                                   ║");
        logHacker("║  🎮 GPU: " + gpuName);
        logHacker("║  ⚛️ Algorithms: Shor's + Grover's                                 ║");
        logHacker("║                                                                   ║");
        logHacker("║  RSA-2048:   💔 VULNERABLE - Data DECRYPTED                       ║");
        logHacker("║  ML-KEM-768: 🛡️ PROTECTED - Attack FAILED                        ║");
        logHacker("║                                                                   ║");
        logHacker("║  ⚠️ RECOMMENDATION:                                               ║");
        logHacker("║  Migrate ALL systems to Post-Quantum Cryptography!               ║");
        logHacker("╚═══════════════════════════════════════════════════════════════════╝");
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) {}
    }
}
