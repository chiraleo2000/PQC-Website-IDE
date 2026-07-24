# 🔐 PQC CyberSec Simulator

**A Post-Quantum Cryptography Security Simulation Suite** demonstrating quantum computing threats and the importance of PQC migration. This educational platform shows the "**Harvest Now, Decrypt Later**" (HNDL) attack in real-time with interactive government services.

---

## � Encryption Model (Industry Standard)

This simulator uses **realistic hybrid encryption** following industry best practices (like TLS, Signal, WhatsApp):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HYBRID ENCRYPTION FLOW                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. KEY ENCAPSULATION (KEM)                                                  │
│     ├── RSA-2048 (Classical - VULNERABLE to Shor's Algorithm)               │
│     └── ML-KEM-768 (Post-Quantum - QUANTUM SAFE)                            │
│         └── Encapsulates random AES-256 key                                 │
│                                                                              │
│  2. BULK DATA ENCRYPTION                                                     │
│     └── AES-256-GCM (Symmetric - Fast for large data)                       │
│         └── Encrypts documents, files, messages                             │
│                                                                              │
│  3. DIGITAL SIGNATURE (Authentication)                                       │
│     ├── RSA-2048 (Classical - VULNERABLE to Shor's Algorithm)               │
│     └── ML-DSA-65 (Post-Quantum - QUANTUM SAFE)                             │
│         └── Signs the encrypted package                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Matters

| Component | Classical | Post-Quantum | Purpose |
|-----------|-----------|--------------|---------|
| **KEM** | RSA-2048 ❌ | ML-KEM-768 ✅ | Securely exchange AES key |
| **Bulk Encryption** | AES-256-GCM | AES-256-GCM | Fast encryption for data |
| **Signature** | RSA-2048 ❌ | ML-DSA-65 ✅ | Verify authenticity |

❌ = Vulnerable to quantum attacks (Shor's Algorithm)
✅ = Quantum-resistant (Lattice-based)

---

## 🔑 Authentication

### Supported Methods

| Method | Status | Use Case |
|--------|--------|----------|
| **Form-based Login** | ✅ Active | Traditional username/password |
| **OAuth 2.0** | 🔧 Ready | Google, GitHub social login |
| **JWT Tokens** | ✅ Active | API authentication |

### OAuth 2.0 Setup (Optional)

To enable social login with Google or GitHub:

1. **Get OAuth 2.0 Credentials:**
   - Google: [Google Cloud Console](https://console.cloud.google.com/)
   - GitHub: [GitHub Developer Settings](https://github.com/settings/developers)

2. **Configure in `gov-portal/src/main/resources/application.properties`:**

```properties
oauth2.enabled=true

# Google OAuth 2.0
spring.security.oauth2.client.registration.google.client-id=YOUR_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_SECRET
spring.security.oauth2.client.registration.google.scope=email,profile

# GitHub OAuth 2.0
spring.security.oauth2.client.registration.github.client-id=YOUR_CLIENT_ID
spring.security.oauth2.client.registration.github.client-secret=YOUR_SECRET
spring.security.oauth2.client.registration.github.scope=user:email,read:user
```

---

## 📁 Project Structure

```
PQC-CyberSec-Simulator/
├── crypto-lib/           # Cryptography Library (ML-DSA, ML-KEM, RSA, AES)
├── gov-portal/           # Government Portal with Web UI (Port 8181)
├── secure-messaging/     # Encrypted Messaging Service (Port 8182)
├── hacker-console/       # Hacker Attack Simulation (Port 8183)
├── quantum-simulator/    # Python cuQuantum GPU Quantum Simulator (Port 8184)
├── ui-tests/             # Selenium UI Tests (Four-Panel Demo)
├── docker-compose.yml    # Docker deployment configuration
└── pom.xml               # Parent Maven configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites

| Requirement | Version | Required | Notes |
|-------------|---------|----------|-------|
| **Java JDK** | 21+ | ✅ Required | For all Java services |
| **Maven** | 3.9+ | ✅ Required | Build tool |
| **Chrome Browser** | Latest | ✅ Required | For Selenium UI tests |
| **Python** | 3.10+ | ⚠️ Optional | For quantum simulator with GPU |
| **Docker Desktop** | Latest | ⚠️ Optional | For containerized deployment |
| **NVIDIA GPU** | RTX 20 series+ | ⚠️ Optional | For GPU quantum simulation |

**Note:** The fully automated demo (`run-demo.bat`/`run-demo.sh`) runs everything **without Docker** for simplicity. Docker is only needed if you prefer containerized deployment.

---

## 📦 Installation & Setup

### Quick Start (Fastest - No Docker Required!)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/PQC-CyberSec-Simulator.git
cd PQC-CyberSec-Simulator

# 2. Build all modules
mvn clean install -DskipTests

# 3. Run the fully automated demo!
.\run-demo.bat          # Windows
./run-demo.sh           # Linux/Mac
```

That's it! The demo will automatically:
- ✅ Start all required services (Quantum Simulator, Gov-Portal, Hacker Console)
- ✅ Execute all 4 cryptographic scenarios first (automated Selenium)
- ✅ Open browser panels for manual interaction after tests
- ✅ Show real-time quantum attacks
- ✅ Keep services running so you can interact, re-test, and inspect logs

**⏱️ Total time:** 6-8 minutes (fully automated, zero interaction)

---

### Advanced Setup Options

#### Option 1: With GPU Quantum Simulation (Recommended)

For **real GPU-accelerated quantum circuit simulation**:

```bash
cd quantum-simulator

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# For GPU support (requires CUDA 12)
pip install cupy-cuda12x cuquantum-python-cu12
```

Then run the demo as usual - it will automatically detect and use your GPU!

**GPU Status Check:**
```bash
cd quantum-simulator
python -c "import cupy as cp; print(f'GPU: {cp.cuda.Device().name}')"
```

#### Option 2: With Docker (For PostgreSQL Production Setup)

If you need persistent database storage:

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for database to be ready
docker-compose logs postgres

# Build and start all services in Docker
docker-compose up -d
```

**Services in Docker:**

| Service | URL | Description |
|---------|-----|-------------|
| **Government Portal** | http://localhost:8181 | Web UI for citizens & officers |
| **Secure Messaging** | http://localhost:8182 | Encrypted communications API |
| **PostgreSQL** | localhost:5432 | Persistent database |

---

### Step-by-Step Manual Setup

For development or troubleshooting:

---

## 👥 Demo User Accounts

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| 👤 **Citizen** | `john.citizen` | `Citizen@2024!` | Regular citizen account |
| 👤 **Citizen** | `emily.chen` | `Citizen@2024!` | Another citizen account |
| 👮 **Officer** | `officer` | `Officer@2024!` | Government officer |
| ⚙️ **Admin** | `admin` | `Admin@PQC2024!` | System administrator |

---

## 🎮 Running the Demo

### 🚀 **FULLY AUTOMATED DEMO** (Recommended - Zero User Input!)

The easiest way to run the complete demo is with our **fully automated script** that handles everything:

**Windows:**
```bash
.\run-demo.bat
```

**Linux/Mac:**
```bash
./run-demo.sh
```

**What happens automatically:**
1. ✅ Cleans up any existing processes
2. ✅ Starts Quantum Simulator (GPU-accelerated)
3. ✅ Starts Government Portal (port 8181)
4. ✅ Starts Hacker Console (port 8183)
5. ✅ Runs automated Selenium test demonstrating all 4 crypto scenarios
6. ✅ Opens 4 browser panels in 2x2 grid for manual interaction:
   - **TOP-LEFT**: Citizen Portal
   - **TOP-RIGHT**: Officer Portal
   - **BOTTOM-LEFT**: Hacker Harvest Dashboard
   - **BOTTOM-RIGHT**: Hacker Decrypt Panel
7. ✅ Keeps services running so you can continue interacting manually

**⏱️ Total Duration:** ~6-8 minutes (fully automated)  
**🎯 User Action Required:** NONE - Just watch!

---

### 🎯 Four-Panel Visual Demo

The automated demo shows **four Chrome browser panels simultaneously** in a 2×2 grid demonstrating realistic HNDL (Harvest Now, Decrypt Later) attacks with **4 different cryptographic scenarios**:

| Panel | User/View | Description |
|-------|-----------|-------------|
| **TOP-LEFT** | 👤 Citizen | Regular citizen using government services |
| **TOP-RIGHT** | 👮 Officer | Government officer reviewing applications |
| **BOTTOM-LEFT** | 🕵️ Hacker Harvest | Threat actor intercepting encrypted traffic |
| **BOTTOM-RIGHT** | ⚛️ Hacker Decrypt | Real-time quantum attack execution & results |

**4 Crypto Scenarios Tested (Hybrid Encryption):**

| # | KEM (Key Exchange) | Bulk Data | Signature | Result |
|---|-------------------|-----------|-----------|--------|
| 1 | RSA-2048 ❌ | AES-256-GCM | RSA-2048 ❌ | 🔴 FULLY VULNERABLE |
| 2 | ML-KEM-768 ✅ | AES-256-GCM | ML-DSA-65 ✅ | 🟢 FULLY QUANTUM-SAFE |
| 3 | RSA-2048 ❌ | AES-256-GCM | ML-DSA-65 ✅ | 🟡 ENCRYPTION VULNERABLE |
| 4 | ML-KEM-768 ✅ | AES-256-GCM | RSA-2048 ❌ | 🟡 SIGNATURE VULNERABLE |

**Note:** All scenarios use AES-256-GCM for bulk data encryption (industry standard). The quantum vulnerability comes from the **KEM** (key exchange) and **Signature** algorithms.

---

### 📋 Manual Setup (Alternative)

If you prefer manual control or need to troubleshoot, follow these steps:

**Prerequisites:** Ensure ALL services are running:

```bash
# 1. Start Docker services (gov-portal, secure-messaging, postgres)
docker-compose up -d

# 2. Start Quantum Simulator (Terminal 1)
cd quantum-simulator
python quantum_service.py

# 3. Start Hacker Console (Terminal 2)
cd hacker-console
mvn spring-boot:run -Dspring-boot.run.profiles=standalone

# 4. Verify all services are running
# - Gov Portal: http://localhost:8181 
# - Hacker Console: http://localhost:8183
# - Quantum Sim: http://localhost:8184
```

**Run the Four-Panel Selenium Demo:**

```bash
cd ui-tests
mvn test -Dtest=ComprehensiveCryptoTest
```

**⏱️ Test Duration:** ~5-6 minutes  
**📺 Display:** Four Chrome windows will appear in 2x2 grid

### What the Demo Shows

The automated demo executes **4 complete cryptographic scenarios** using **industry-standard hybrid encryption** showing all combinations of classical and quantum-safe algorithms:

#### **Scenario 1: RSA-KEM + AES-256 + RSA-Sig** 🔴 FULLY VULNERABLE
- **Citizen** submits Car License with RSA-2048 key encapsulation + AES-256-GCM bulk encryption + RSA-2048 signature
- **Hacker** intercepts ENCRYPTED packets (cannot read AES-encrypted data directly)
- **Quantum Attack** breaks RSA-KEM, recovers AES key → decrypts data; breaks RSA signature
- **Result:** Complete data breach - all information exposed

#### **Scenario 2: ML-KEM + AES-256 + ML-DSA** 🟢 FULLY QUANTUM-SAFE
- **Citizen** submits Passport Application with ML-KEM-768 key encapsulation + AES-256-GCM bulk encryption + ML-DSA-65 signature
- **Hacker** intercepts quantum-resistant packets
- **Quantum Attack** FAILS on both KEM and signature → AES key unrecoverable
- **Result:** Data remains fully protected - no breach possible

#### **Scenario 3: RSA-KEM + AES-256 + ML-DSA** 🟡 ENCRYPTION VULNERABLE
- **Citizen** submits Birth Certificate with RSA-2048 key encapsulation + AES-256-GCM bulk encryption + ML-DSA-65 signature
- **Hacker** intercepts mixed-security packets
- **Quantum Attack** breaks RSA-KEM → recovers AES key → decrypts data; signature remains valid
- **Result:** Partial breach - data exposed but authenticity verified

#### **Scenario 4: ML-KEM + AES-256 + RSA-Sig** 🟡 SIGNATURE VULNERABLE
- **Citizen** submits Medical Records with ML-KEM-768 key encapsulation + AES-256-GCM bulk encryption + RSA-2048 signature
- **Hacker** intercepts mixed-security packets
- **Quantum Attack** breaks RSA signature; ML-KEM holds → AES key unrecoverable
- **Result:** Partial breach - data protected but authenticity compromised

---

### Real-Time Visual Demonstration

**BOTTOM-LEFT Panel (Hacker Harvest)** shows intercepted packets:
```
🔒 ENCRYPTED PAYLOAD CAPTURED:
   Document: Car License
   KEM: RSA-2048 ⚠️ QUANTUM VULNERABLE
   Symmetric: AES-256-GCM ✅ (key at risk via KEM)
   Signature: RSA-2048 ⚠️ QUANTUM VULNERABLE
   
   Raw Hex: 3F8CD0C0D3BC1822 BDDC9DB950F71F4D...
```

**BOTTOM-RIGHT Panel (Hacker Decrypt)** shows quantum attack results:
```
╔═══════════════════════════════════════════════════════╗
║  ⚛️ QUANTUM ATTACK RESULT - SCENARIO 1                   ║
╠═══════════════════════════════════════════════════════════╣
║  💔 RSA-2048 KEM BROKEN BY SHOR'S ALGORITHM              ║
║  🔓 AES-256 KEY RECOVERED → BULK DATA DECRYPTED          ║
║                                                           ║
║  📋 DECRYPTED DATA:                                       ║
║  👤 Name: John Michael Citizen                            ║
║  📅 DOB: 1985-06-15                                       ║
║  🏠 Address: 1247 Oak Street, Springfield, IL             ║
║  🚗 License: DL-8472619                                   ║
╚═══════════════════════════════════════════════════════╝
```

### Demo Summary Output

After completing all 4 scenarios (using hybrid encryption), the demo shows:

```
╔════════════════════════════════════════════════════════════════════════════════╗
║              PQC COMPREHENSIVE CRYPTOGRAPHY TEST COMPLETE                      ║
║                  (Hybrid Encryption: KEM + AES-256 + Signature)                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  SCENARIO 1: RSA-KEM + AES-256 + RSA-Sig (All Classical)                      ║
║     KEM:        💔 BROKEN (RSA-2048 factored by Shor's Algorithm)             ║
║     AES Key:    🔓 RECOVERED (via broken KEM)                                 ║
║     Signature:  💔 BROKEN (RSA-2048 signature forged)                         ║
║     Result:     🔴 FULLY VULNERABLE - Complete data breach                    ║
║                                                                                ║
║  SCENARIO 2: ML-KEM + AES-256 + ML-DSA (All Post-Quantum)                     ║
║     KEM:        🛡️ PROTECTED (Lattice problem resistant)                      ║
║     AES Key:    🔐 SECURE (KEM unbroken)                                      ║
║     Signature:  🛡️ PROTECTED (No known quantum attack)                        ║
║     Result:     🟢 FULLY QUANTUM-SAFE - Data fully protected                  ║
║                                                                                ║
║  SCENARIO 3: RSA-KEM + AES-256 + ML-DSA (Mixed - PQC Signature)               ║
║     KEM:        💔 BROKEN (RSA-2048 factored)                                 ║
║     AES Key:    🔓 RECOVERED (via broken KEM)                                 ║
║     Signature:  🛡️ PROTECTED (ML-DSA quantum-resistant)                       ║
║     Result:     🟡 MIXED SECURITY - Encryption compromised                    ║
║                                                                                ║
║  SCENARIO 4: ML-KEM + AES-256 + RSA-Sig (Mixed - PQC Encryption)              ║
║     KEM:        🛡️ PROTECTED (ML-KEM quantum-resistant)                       ║
║     AES Key:    🔐 SECURE (KEM unbroken)                                      ║
║     Signature:  💔 BROKEN (RSA-2048 signature forged)                         ║
║     Result:     🟡 MIXED SECURITY - Signature compromised                     ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  ✅ ALL TESTS PASSED                                                           ║
║  ⚛️ Total Quantum Attacks: 8 (4 KEM + 4 signature)                            ║
║  🔐 Quantum-Safe Algorithms: 100% protection rate                             ║
║  💔 Classical Algorithms: 0% protection rate                                  ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔐 Cryptographic Algorithms

### ✅ Quantum-Safe (NIST FIPS 203/204)

| Algorithm | Type | Security Level |
|-----------|------|----------------|
| **ML-KEM** (Kyber768) | Key Encapsulation | 192-bit quantum |
| **ML-DSA** (Dilithium3) | Digital Signature | 128-bit quantum |

### ⚠️ Classical (Vulnerable to Quantum)

| Algorithm | Type | Quantum Threat |
|-----------|------|----------------|
| **RSA-2048** | Key Encapsulation/Signature | ❌ Broken by Shor's Algorithm |
| **AES-256** | Symmetric Bulk Encryption | ✅ Safe (key secured by KEM) |

**Note:** AES-256 itself is quantum-resistant (Grover's only halves effective key bits to 128-bit). The vulnerability comes from how the AES key is exchanged (the KEM algorithm).

---

## 🧪 Running Tests

### Quick Test Commands

| Test Type | Command | Description |
|-----------|---------|-------------|
| **All Tests** | `mvn test` | Run all unit tests |
| **UI Demo** | `cd ui-tests && mvn test -Dtest=PqcSecurityDemoTest` | Run 3-panel demo |
| **Single Module** | `mvn test -pl gov-portal` | Test specific module |
| **Skip Tests** | `mvn install -DskipTests` | Build without tests |

### Full Three-Panel UI Demo Test

```bash
# Step 1: Ensure services are running
docker-compose up -d
cd quantum-simulator && python quantum_service.py &
cd hacker-console && mvn spring-boot:run -Dspring-boot.run.profiles=standalone &

# Step 2: Run UI test (wait for services ~30 seconds)
cd ui-tests
mvn test -Dtest=PqcSecurityDemoTest
```

**Expected Output:**
```
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  04:19 min
```

### Test Descriptions

| Test # | Name | What It Tests |
|--------|------|---------------|
| 1 | Initialize Panels | Opens 3 Chrome windows, connects to services |
| 2 | Authentication | Citizen & Officer login |
| 3 | RSA Submission | Car license with RSA-2048 (vulnerable) |
| 4 | Officer Review | Officer reviews pending applications |
| 5 | ML-KEM Submission | Tax filing with ML-KEM-768 (quantum-safe) |
| 6 | Quantum Attack | Shor's & Grover's algorithms execution |
| 7 | Tax Processing | Officer processes quantum-safe document |
| 8 | Summary | Final security demonstration report |

### All Unit Tests

```bash
mvn test
```

### UI Demo Test Only

```bash
cd ui-tests
mvn test -Dtest=PqcSecurityDemoTest
```

### Test with Specific Browser

```bash
cd ui-tests
mvn test -Dtest=PqcSecurityDemoTest -Dwebdriver.chrome.driver=/path/to/chromedriver
```

---

## 📡 API Endpoints

### Government Portal (8181)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/login` | Login page |
| GET | `/dashboard` | User dashboard |
| GET | `/services/car-license` | Car license form |
| POST | `/services/car-license` | Submit application |
| GET | `/services/tax-filing` | Tax filing form |
| POST | `/services/tax-filing` | Submit tax return |
| GET | `/officer/review/{id}` | Review document |
| POST | `/officer/approve/{id}` | Approve document |

### Hacker Console (8183)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hacker/gpu` | GPU information |
| POST | `/api/hacker/harvest/transactions` | Intercept data |
| POST | `/api/hacker/quantum-attack` | Execute attack |
| GET | `/api/hacker/harvested` | List captured data |

### Quantum Simulator (8184)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quantum/status` | Service status |
| POST | `/api/quantum/attack/rsa` | Shor's algorithm |
| POST | `/api/quantum/attack/lattice` | Lattice attack |

---

## 🗄️ Database Configuration

| Setting | Value |
|---------|-------|
| **Host** | localhost |
| **Port** | 5432 |
| **Database** | pqc_cybersec |
| **Username** | pqc_admin |
| **Password** | PqcSecure2024! |

---

## ⚠️ Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| **Port already in use** | Stop conflicting service or check Docker containers |
| **Services not starting** | Check `docker-compose logs` for errors |
| **Database connection refused** | Ensure PostgreSQL is running: `docker-compose up -d postgres` |
| **Chrome not found** | Install Chrome or update WebDriver |
| **Hacker console can't connect** | Verify services are running on correct ports |
| **Quantum service unavailable** | Run `python quantum_service.py` manually |

### UI Test Issues

| Problem | Solution |
|---------|----------|
| **Browsers don't appear** | Test runs in headed mode by default - check display |
| **Test fails at login** | Verify gov-portal is running: `curl http://localhost:8181` |
| **Quantum attack shows simulation** | Start Python quantum service on port 8184 |
| **"No such element" error** | Services may not be ready - increase sleep times |
| **ChromeDriver version mismatch** | Update Chrome or let WebDriverManager auto-download |

### Verify Services Are Running

```bash
# Check all ports are listening
# Windows PowerShell:
Get-NetTCPConnection -LocalPort 8181,8182,8183,8184 -ErrorAction SilentlyContinue | Format-Table LocalPort,State

# Linux/Mac:
netstat -tlnp | grep -E '8181|8182|8183|8184'

# Expected output: All ports should show "Listen" state
```

### Check Service Health

```bash
# Gov Portal
curl http://localhost:8181/login

# Hacker Console
curl http://localhost:8183/api/hacker/gpu

# Quantum Simulator
curl http://localhost:8184/api/quantum/status
```

### Viewing Logs

```bash
# Docker service logs
docker-compose logs -f gov-portal
docker-compose logs -f secure-messaging

# Hacker console logs (if running via Maven)
# Logs appear in terminal
```

### Resetting the Demo

```bash
# Stop all services
docker-compose down

# Remove database volume (fresh start)
docker-compose down -v

# Restart everything
docker-compose up -d
```

---

## 🏗️ Building for Production

### Build JAR Files

```bash
mvn clean package -DskipTests

# JARs created:
# - gov-portal/target/gov-portal-1.0.0.jar
# - secure-messaging/target/secure-messaging-1.0.0.jar
# - hacker-console/target/hacker-console-1.0.0.jar
```

### Build Docker Images

```bash
docker-compose build
```

---

## 📚 Educational Purpose

This simulator demonstrates:

1. **Shor's Algorithm** - How quantum computers break RSA encryption
2. **Grover's Algorithm** - How quantum computers reduce symmetric key security
3. **HNDL Attack** - Why "Harvest Now, Decrypt Later" is a real threat
4. **PQC Migration** - Why organizations must migrate to quantum-safe cryptography NOW

### Realistic HNDL Attack Simulation

The demo shows a **realistic** Harvest Now, Decrypt Later attack flow:

| Phase | Action | Data Shown |
|-------|--------|------------|
| **1. Harvest** | Intercept encrypted packets | Raw hex encrypted data (unreadable) |
| **2. Store** | Save for future attack | Encrypted payload + cipher metadata |
| **3. Attack** | Run quantum algorithms | Shor's algorithm progress (4099 qubits) |
| **4. Decrypt** | Extract plaintext (RSA only) | Decrypted personal information |
| **5. Fail** | Attack ML-KEM | "CANNOT DECRYPT" message |

### GPU Quantum Simulation

When running with NVIDIA GPU:
- **Detected GPU:** NVIDIA GeForce RTX 4060 Laptop GPU (8GB VRAM)
- **Max Qubits:** 28 (limited by GPU memory)
- **Shor's Algorithm:** Requires ~4099 qubits for RSA-2048 (simulated)

### NIST Post-Quantum Standards

- **FIPS 203** - ML-KEM (Kyber) - Key Encapsulation
- **FIPS 204** - ML-DSA (Dilithium) - Digital Signatures
- **FIPS 205** - SLH-DSA (SPHINCS+) - Stateless Hash Signatures

---

## 📜 License

Open Source - Educational Use Only

**⚠️ Disclaimer:** This simulation is for educational purposes only. The "hacker" functionality demonstrates real security threats but should never be used maliciously.

---

## 🙏 Credits

- **Bouncy Castle** - PQC cryptography library (v1.79)
- **NIST** - Post-Quantum Cryptography standards
- **Spring Boot 3.5** - Microservices framework
- **Selenium** - UI testing framework
- **cuQuantum** - NVIDIA quantum simulation SDK
