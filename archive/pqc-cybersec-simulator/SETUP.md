# 🛡️ PQC CyberSec Simulator - Setup & Manual Testing Guide

## 📋 Overview

This project demonstrates **Post-Quantum Cryptography (PQC)** security concepts through a simulated government portal system with:

- **Gov Portal** (8181): Citizens submit documents, Officers review and approve
- **Secure Messaging** (8182): Encrypted message service
- **Hacker Console** (8183): Demonstrates "Harvest Now, Decrypt Later" (HNDL) attacks
- **PostgreSQL** (5432): Database for gov services

## 🔧 Prerequisites

1. **Docker Desktop** - Running and healthy
2. **Java 17+** - For running Maven and Spring Boot
3. **Maven 3.8+** - Build tool
4. **Chrome Browser** - For Selenium tests

## 🚀 Quick Start (Automated Demo)

```bash
# Windows
.\run-demo.bat

# Linux/macOS
chmod +x run-demo.sh
./run-demo.sh
```

This will:
1. Start Docker services (postgres, gov-portal, secure-messaging)
2. Start the hacker-console in standalone mode
3. Run the 4-panel Selenium demo test

---

## 🔨 Manual Setup Steps

### Step 1: Start Database

```bash
docker-compose up -d postgres
```

Wait 10 seconds for PostgreSQL to initialize.

### Step 2: Start Government Services

```bash
docker-compose up -d gov-portal secure-messaging
```

Wait 30 seconds for Spring Boot applications to start.

**Verify services are running:**
```bash
curl http://localhost:8181/actuator/health
curl http://localhost:8182/actuator/health
```

### Step 3: Start Hacker Console (Standalone)

```bash
cd hacker-console
mvn spring-boot:run -Dspring-boot.run.profiles=standalone
```

This starts the hacker console with an embedded H2 database (no Docker dependency).

**Verify hacker console:**
```bash
curl http://localhost:8183/harvest
```

---

## 🧪 Manual Testing

### Test 1: Access Gov Portal as Citizen

1. Open browser: `http://localhost:8181`
2. Login with:
   - Username: `john.citizen`
   - Password: `Citizen@2024!`
3. Navigate to "Car License" or "Tax Filing" service
4. Fill in the form and select encryption:
   - **RSA-2048** (⚠️ Quantum Vulnerable)
   - **ML-KEM** (🛡️ Quantum Safe)
5. Submit the application

### Test 2: Access Gov Portal as Officer

1. Open another browser (incognito): `http://localhost:8181`
2. Login with:
   - Username: `officer`
   - Password: `Officer@2024!`
3. Go to Dashboard
4. Review and approve pending applications

### Test 3: Monitor Traffic (Hacker Harvest)

1. Open browser: `http://localhost:8183/harvest`
2. Watch as encrypted packets appear when citizens submit documents
3. Notice the stats bar shows:
   - **🔐 KEM RSA**: Key Encapsulation using RSA (VULNERABLE)
   - **🔐 KEM PQC**: Key Encapsulation using ML-KEM-768 (SAFE)
   - **✍️ Sig RSA**: Digital Signature using RSA (VULNERABLE)
   - **✍️ Sig PQC**: Digital Signature using ML-DSA-65 (SAFE)

### Test 4: Quantum Decryption Attack

1. Open browser: `http://localhost:8183/decrypt`
2. Click "Start Attack" to simulate quantum decryption
3. Observe:
   - RSA-encrypted data gets "decrypted" (simulated)
   - ML-KEM/ML-DSA protected data remains secure

---

## 📊 Understanding the Harvest Dashboard

The harvest dashboard (`/harvest`) shows intercepted network packets:

### Packet Display

Each intercepted packet shows:
- **Route**: `👤 User → 🏛️ Gov Portal → 🗄️ Database`
- **KEM Badge** (🔐): Encryption algorithm for data confidentiality
  - 🔴 `RSA-2048` - Vulnerable to Shor's algorithm
  - 🟢 `ML-KEM-768` - Quantum-resistant (lattice-based)
- **Signature Badge** (✍️): Digital signature algorithm for authenticity
  - 🔴 `RSA-2048` - Vulnerable to Shor's algorithm  
  - 🟢 `ML-DSA-65` - Quantum-resistant (Dilithium)
- **Encrypted Payload**: Hexadecimal representation of encrypted data
- **Digital Signature**: Hexadecimal representation of signature bytes

### Stats Bar

| Stat | Description |
|------|-------------|
| Packets | Total intercepted packets |
| 🔐 KEM RSA | Packets using RSA encryption (vulnerable) |
| 🔐 KEM PQC | Packets using ML-KEM encryption (safe) |
| ✍️ Sig RSA | Packets using RSA signatures (vulnerable) |
| ✍️ Sig PQC | Packets using ML-DSA signatures (safe) |
| Harvested | Packets stored for later decryption |

---

## 🔐 Cryptographic Algorithms

### Key Encapsulation Mechanisms (KEM)

| Algorithm | Type | Security | Quantum Status |
|-----------|------|----------|----------------|
| RSA-2048 | Classical | ~112-bit | ⚠️ VULNERABLE |
| RSA-4096 | Classical | ~140-bit | ⚠️ VULNERABLE |
| ML-KEM-768 | PQC (Lattice) | NIST Level 3 | 🛡️ RESISTANT |

### Digital Signature Algorithms

| Algorithm | Type | Security | Quantum Status |
|-----------|------|----------|----------------|
| RSA-2048 | Classical | ~112-bit | ⚠️ VULNERABLE |
| ECDSA-P256 | Classical | ~128-bit | ⚠️ VULNERABLE |
| ML-DSA-65 | PQC (Dilithium) | NIST Level 3 | 🛡️ RESISTANT |

---

## 🛑 Stop All Services

```bash
# Stop Docker services
docker-compose down

# Stop hacker-console (Ctrl+C in its terminal, or):
# Windows:
for /f "tokens=5" %a in ('netstat -ano ^| findstr ":8183.*LISTENING"') do taskkill /F /PID %a

# Linux/macOS:
kill $(lsof -ti:8183)
```

### Clean Start (Reset Database)

```bash
docker-compose down -v
```

The `-v` flag removes volumes, clearing all database data.

---

## 🔗 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Gov Portal | http://localhost:8181 | Government document portal |
| Secure Messaging | http://localhost:8182 | Encrypted messaging service |
| Hacker Harvest | http://localhost:8183/harvest | Network interception dashboard |
| Hacker Decrypt | http://localhost:8183/decrypt | Quantum decryption dashboard |
| Hacker API | http://localhost:8183/api/hacker | Attack simulation API |

---

## 🧑‍💻 User Credentials

| Role | Username | Password |
|------|----------|----------|
| Citizen | john.citizen | Citizen@2024! |
| Officer | officer | Officer@2024! |
| Admin | admin | Admin@2024! |

---

## 📁 Project Structure

```
PQC-CyberSec-Simulator/
├── gov-portal/           # Government portal (Spring Boot)
├── secure-messaging/     # Messaging service (Spring Boot)
├── hacker-console/       # Hacker simulation (Spring Boot)
├── crypto-lib/           # Shared crypto library
├── quantum-simulator/    # Python cuQuantum GPU service
├── ui-tests/             # Selenium 4-panel demo tests
├── docker-compose.yml    # Docker orchestration
├── run-demo.bat          # Windows demo launcher
├── run-demo.sh           # Linux/macOS demo launcher
└── SETUP.md              # This file
```

---

## ⚡ Troubleshooting

### Port Already in Use

```bash
# Windows - Find and kill process on port 8183
netstat -ano | findstr :8183
taskkill /F /PID <PID>

# Linux/macOS
lsof -ti:8183 | xargs kill -9
```

### Docker Issues

```bash
# Restart Docker services
docker-compose restart

# View logs
docker-compose logs -f gov-portal
docker-compose logs -f secure-messaging
```

### Database Connection Failed

```bash
# Ensure PostgreSQL is running
docker-compose ps

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

---

## 📚 Learn More

- **NIST PQC Standards**: https://csrc.nist.gov/projects/post-quantum-cryptography
- **ML-KEM (FIPS 203)**: Lattice-based key encapsulation
- **ML-DSA (FIPS 204)**: Lattice-based digital signatures (Dilithium)
- **Shor's Algorithm**: Quantum algorithm that breaks RSA/ECDSA
- **HNDL Attack**: Harvest Now, Decrypt Later threat model
