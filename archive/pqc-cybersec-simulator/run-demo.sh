#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  PQC CYBERSEC SIMULATOR - COMPREHENSIVE 4-PANEL DEMO
# ═══════════════════════════════════════════════════════════════════════════════
#  Usage:
#    ./run-demo.sh                    - Auto-detect mode, run automated tests
#    ./run-demo.sh --local            - Force local mode (no Docker), run tests
#    ./run-demo.sh --docker           - Force Docker mode, run tests
#    ./run-demo.sh --local --manual   - Force local mode, skip tests (manual play)
#    ./run-demo.sh --docker --manual  - Force Docker mode, skip tests (manual play)
#    ./run-demo.sh --manual           - Auto-detect mode, skip tests (manual play)
#
#  HYBRID ENCRYPTION MODEL (Industry Standard - Like TLS/Signal/WhatsApp):
#    • KEM: RSA-2048 or ML-KEM-768 (key encapsulation for AES key)
#    • Bulk: AES-256-GCM (fast symmetric encryption for data)
#    • Signature: RSA-2048 or ML-DSA-65 (authentication)
#
#  AUTHENTICATION:
#    • Form-based login (demo accounts)
#    • OAuth 2.0 ready (Google, GitHub) when configured
#
#  Runs ALL 4 scenarios comparing Classical vs PQC cryptography
# ═══════════════════════════════════════════════════════════════════════════════

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments
FORCE_LOCAL=false
FORCE_DOCKER=false
MANUAL_MODE=false

for arg in "$@"; do
    case "$arg" in
        --local|-l|--onprem)
            FORCE_LOCAL=true
            ;;
        --docker|-d)
            FORCE_DOCKER=true
            ;;
        --manual|-m|--play|--skip-tests)
            MANUAL_MODE=true
            ;;
    esac
done

# Global variables to track PIDs
GOV_PID=""
HACKER_PID=""
QS_PID=""
USE_DOCKER=false

# Auto-shutdown timeout in seconds (10 minutes = 600 seconds)
AUTO_SHUTDOWN_TIMEOUT=600
LAST_ACTIVITY_TIME=$(date +%s)

# Function to clean GPU VRAM
clean_gpu() {
    echo -e "  ${CYAN}Releasing GPU VRAM...${NC}"
    if [ -f "$SCRIPT_DIR/Clear_GPU.py" ]; then
        if command -v python3 &> /dev/null; then
            python3 "$SCRIPT_DIR/Clear_GPU.py" 2>/dev/null && echo -e "  ${GREEN}[OK] GPU VRAM released${NC}" || true
        elif command -v python &> /dev/null; then
            python "$SCRIPT_DIR/Clear_GPU.py" 2>/dev/null && echo -e "  ${GREEN}[OK] GPU VRAM released${NC}" || true
        fi
    fi
    # Also try to release via CuPy if available
    if command -v python3 &> /dev/null; then
        python3 -c "
try:
    import cupy as cp
    mempool = cp.get_default_memory_pool()
    mempool.free_all_blocks()
    print('  CuPy memory pool cleared')
except:
    pass
" 2>/dev/null || true
    fi
}

# Cleanup function with GPU VRAM release
cleanup() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  SHUTTING DOWN ALL SERVICES AND CLEANING UP RESOURCES...${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════════════════${NC}"
    
    echo -e "  ${CYAN}[1/5] Stopping Java services...${NC}"
    pkill -f "spring-boot:run" 2>/dev/null || true
    [ -n "$GOV_PID" ] && kill $GOV_PID 2>/dev/null || true
    [ -n "$HACKER_PID" ] && kill $HACKER_PID 2>/dev/null || true
    
    echo -e "  ${CYAN}[2/5] Stopping Quantum Simulator...${NC}"
    pkill -f "quantum_service.py" 2>/dev/null || true
    [ -n "$QS_PID" ] && kill $QS_PID 2>/dev/null || true
    
    echo -e "  ${CYAN}[3/5] Releasing network ports...${NC}"
    # Kill any remaining processes on our ports
    for port in 8181 8183 8184; do
        pid=$(lsof -ti:$port 2>/dev/null)
        [ -n "$pid" ] && kill -9 $pid 2>/dev/null || true
    done
    
    if $USE_DOCKER; then
        echo -e "  ${CYAN}[4/5] Stopping Docker containers...${NC}"
        docker-compose down 2>/dev/null || true
    else
        echo -e "  ${CYAN}[4/5] Docker not in use - skipping${NC}"
    fi
    
    echo -e "  ${CYAN}[5/5] Releasing GPU VRAM...${NC}"
    clean_gpu
    
    # Wait a moment for cleanup
    sleep 2
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ALL RESOURCES CLEANED UP!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "  - All services stopped"
    echo -e "  - Network ports released (8181, 8183, 8184)"
    echo -e "  - GPU VRAM released"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    exit 0
}

# Function to reset activity timer
reset_activity_timer() {
    LAST_ACTIVITY_TIME=$(date +%s)
}

# Function to check if auto-shutdown should trigger
check_auto_shutdown() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - LAST_ACTIVITY_TIME))
    if [ $elapsed -ge $AUTO_SHUTDOWN_TIMEOUT ]; then
        echo ""
        echo -e "${YELLOW}[AUTO-SHUTDOWN] 5 minutes of inactivity detected - cleaning up resources...${NC}"
        cleanup
    fi
    return $elapsed
}

# Function to open browser (cross-platform)
open_browser() {
    local url="$1"
    if command -v xdg-open &> /dev/null; then
        xdg-open "$url" 2>/dev/null &
    elif command -v open &> /dev/null; then
        open "$url" 2>/dev/null &
    elif command -v start &> /dev/null; then
        start "$url" 2>/dev/null &
    fi
}

echo ""
echo "============================================================================================="
echo -e "       ${MAGENTA}PQC CYBERSEC - COMPREHENSIVE 4-PANEL DEMO${NC}"
echo -e "       ${CYAN}Demonstrating Quantum-Resistant vs Classical Cryptography${NC}"
echo "============================================================================================="
echo "  ALL 4 SCENARIOS AVAILABLE:"
echo "    1. RSA KEM + RSA Sig     - FULLY VULNERABLE (Both broken by quantum)"
echo "    2. ML-KEM + ML-DSA       - FULLY QUANTUM-SAFE (Both protected)"
echo "    3. RSA KEM + ML-DSA      - MIXED (Encryption vulnerable, Signature safe)"
echo "    4. ML-KEM + RSA Sig      - MIXED (Encryption safe, Signature vulnerable)"
echo "============================================================================================="
echo "  Usage: ./run-demo.sh [OPTIONS]"
echo "    --local, -l, --onprem : Force local on-premise mode (H2 database, no Docker)"
echo "    --docker, -d          : Force Docker mode (PostgreSQL in container)"
echo "    --manual, -m, --play  : Skip automated tests, start services for manual testing"
echo "    --skip-tests          : Same as --manual"
echo "    (no flag)             : Auto-detect infrastructure, run automated tests"
echo "============================================================================================="
if $MANUAL_MODE; then
    echo -e "  MODE: ${GREEN}MANUAL TESTING${NC} - Services will start, you can test manually!"
else
    echo -e "  MODE: ${BLUE}AUTOMATED TESTING${NC} - Selenium tests will run automatically"
fi
echo -e "  ${YELLOW}AUTO-CLEANUP: Services will auto-shutdown after 10 minutes of inactivity${NC}"
echo -e "  ${YELLOW}GPU CLEANUP: GPU VRAM will be released when services stop${NC}"
echo "============================================================================================="
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Step 1: Check Prerequisites and Determine Infrastructure
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[1/6] Checking Prerequisites and Determining Infrastructure...${NC}"

# --- JDK detection (require javac, not just java) ---
if ! command -v javac &> /dev/null; then
    echo -e "${RED}   [ERROR] javac not found! You are running a JRE, not a JDK.${NC}"
    echo -e "${RED}   Please install JDK 21+ and set JAVA_HOME to the JDK directory.${NC}"
    exit 1
fi
if ! command -v java &> /dev/null; then
    echo -e "${RED}   [ERROR] Java is not installed! Please install JDK 21+.${NC}"
    exit 1
fi
echo -e "   ${GREEN}[OK] JDK found ($(javac -version 2>&1))${NC}"

# Check Maven
if ! command -v mvn &> /dev/null; then
    echo -e "${RED}   [ERROR] Maven is not installed! Please install Apache Maven.${NC}"
    exit 1
fi
echo -e "   ${GREEN}[OK] Maven found${NC}"

# --- GPU + VRAM check (6 GB minimum for GPU mode, CPU fallback if < 6 GB) ---
GPU_OK=false
GPU_VRAM_MB=0
if command -v nvidia-smi &> /dev/null; then
    GPU_LINE=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
    if [ -n "$GPU_LINE" ]; then
        GPU_NAME=$(echo "$GPU_LINE" | cut -d',' -f1 | xargs)
        GPU_VRAM_MB=$(echo "$GPU_LINE" | cut -d',' -f2 | xargs)
        echo -e "   ${GREEN}[OK] GPU detected: $GPU_NAME ($GPU_VRAM_MB MB VRAM)${NC}"
        if [ "$GPU_VRAM_MB" -ge 6144 ] 2>/dev/null; then
            GPU_OK=true
            echo -e "   ${GREEN}[OK] GPU VRAM sufficient ($GPU_VRAM_MB MB >= 6144 MB) - GPU mode enabled${NC}"
        else
            echo -e "   ${YELLOW}[WARN] GPU VRAM insufficient ($GPU_VRAM_MB MB < 6144 MB) - CPU fallback will be used${NC}"
        fi
    else
        echo -e "   ${YELLOW}[WARN] nvidia-smi found but no GPU detected${NC}"
    fi
else
    echo -e "   ${YELLOW}[WARN] No NVIDIA GPU detected - quantum simulator will run in limited mode${NC}"
fi

# Check Python for quantum simulator
PYTHON_AVAILABLE=false
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    echo -e "   ${GREEN}[OK] Python3 found${NC}"
    PYTHON_AVAILABLE=true
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    echo -e "   ${GREEN}[OK] Python found${NC}"
    PYTHON_AVAILABLE=true
    PYTHON_CMD="python"
else
    echo -e "   ${YELLOW}[WARN] Python not found - Quantum simulator will use simulation mode${NC}"
fi

# --- Python package auto-install for quantum simulator ---
if $PYTHON_AVAILABLE; then
    $PYTHON_CMD -c "import flask, flask_cors, numpy, scipy, sympy, requests" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo -e "   ${CYAN}[INFO] Installing missing Python packages for Quantum Simulator...${NC}"
        pip install -r "$SCRIPT_DIR/quantum-simulator/requirements.txt" --quiet 2>/dev/null \
            || pip3 install -r "$SCRIPT_DIR/quantum-simulator/requirements.txt" --quiet 2>/dev/null \
            || echo -e "   ${YELLOW}[WARN] Some Python packages failed to install${NC}"
        echo -e "   ${GREEN}[OK] Python packages installed${NC}"
    else
        echo -e "   ${GREEN}[OK] Python packages verified${NC}"
    fi
fi

# --- Maven libraries pre-build (ensure all modules are compiled/installed) ---
CRYPTO_LIB_JAR="$HOME/.m2/repository/com/pqc/crypto-lib/1.0.0/crypto-lib-1.0.0.jar"
if [ ! -f "$CRYPTO_LIB_JAR" ]; then
    echo -e "   ${CYAN}[INFO] crypto-lib not found in local Maven repo - building all modules...${NC}"
    cd "$SCRIPT_DIR"
    mvn clean install -DskipTests -q
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}[OK] All Maven modules built and installed${NC}"
    else
        echo -e "${RED}   [ERROR] Maven build failed! Check Java/Maven setup.${NC}"
        exit 1
    fi
else
    echo -e "   ${GREEN}[OK] Maven libraries already installed${NC}"
fi

# Clean up any existing processes and GPU memory before starting
echo -e "   ${CYAN}Cleaning up existing processes and GPU memory...${NC}"
pkill -f "spring-boot:run" 2>/dev/null || true
pkill -f "quantum_service.py" 2>/dev/null || true
for port in 8181 8183 8184; do
    pid=$(lsof -ti:$port 2>/dev/null)
    [ -n "$pid" ] && kill -9 $pid 2>/dev/null || true
done
# Clean GPU memory at startup
clean_gpu
echo -e "   ${GREEN}[OK] Cleanup complete${NC}"

# Determine deployment mode
if $FORCE_LOCAL; then
    echo -e "   ${CYAN}[INFO] Forced LOCAL mode via command line${NC}"
    USE_DOCKER=false
elif $FORCE_DOCKER; then
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        echo -e "   ${CYAN}[INFO] Forced DOCKER mode via command line${NC}"
        USE_DOCKER=true
    else
        echo -e "   ${YELLOW}[WARN] Docker requested but not available! Falling back to LOCAL mode.${NC}"
        USE_DOCKER=false
    fi
else
    # Auto-detect Docker availability
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        echo -e "   ${GREEN}[OK] Docker detected and running (auto-detected)${NC}"
        USE_DOCKER=true
    else
        echo -e "   ${CYAN}[INFO] Docker not available - using local on-premise mode${NC}"
        USE_DOCKER=false
    fi
fi

echo ""
if $USE_DOCKER; then
    echo -e "   ${CYAN}=== DEPLOYMENT MODE: DOCKER CONTAINERS ===${NC}"
    echo "   Database: PostgreSQL (containerized)"
    echo "   Gov-Portal: Docker container"
else
    echo -e "   ${CYAN}=== DEPLOYMENT MODE: LOCAL ON-PREMISE ===${NC}"
    echo "   Database: H2 In-Memory (local, lightweight)"
    echo "   Gov-Portal: Local Maven process"
fi
echo "   Hacker Console: Local Maven process (always on-premise)"
echo "   Quantum Simulator: Local Python process (GPU-accelerated if available)"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Step 2: Start Database
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[2/6] Starting Database...${NC}"

if $USE_DOCKER; then
    echo "   Starting PostgreSQL via Docker..."
    docker-compose down -v 2>/dev/null || true
    docker-compose up -d postgres
    echo "   [INFO] Waiting for PostgreSQL container..."
    sleep 10
    echo -e "   ${GREEN}[OK] PostgreSQL started (Docker)${NC}"
    DB_PROFILE="docker"
else
    echo -e "   ${GREEN}[OK] Using H2 in-memory database (local, fast startup)${NC}"
    DB_PROFILE="h2"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Step 3: Deploy Quantum Simulator FIRST (Python - needed by other services)
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[3/6] Deploying Quantum Simulator...${NC}"

# Kill existing processes on port 8184
lsof -ti:8184 | xargs kill -9 2>/dev/null || true
sleep 2

QUANTUM_AVAILABLE=false

if $PYTHON_AVAILABLE; then
    echo "   Starting Quantum Simulator locally (Python with GPU support)..."
    cd "$SCRIPT_DIR/quantum-simulator"
    $PYTHON_CMD quantum_service.py > /tmp/quantum-simulator.log 2>&1 &
    QS_PID=$!
    cd "$SCRIPT_DIR"
    
    for i in {1..10}; do
        if curl -s http://localhost:8184/health > /dev/null 2>&1; then
            QUANTUM_AVAILABLE=true
            break
        fi
        echo "   [INFO] Waiting for Quantum Simulator... [$i/10]"
        sleep 3
    done
    
    if $QUANTUM_AVAILABLE; then
        echo -e "   ${GREEN}[OK] Quantum Simulator running on http://localhost:8184${NC}"
    else
        echo -e "   ${YELLOW}[WARN] Quantum Simulator not responding - continuing anyway${NC}"
    fi
else
    echo -e "   ${YELLOW}[INFO] Python not available - Quantum simulator will run in simulation mode${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Step 4: Deploy Gov-Portal Service
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[4/6] Deploying Gov-Portal Service...${NC}"

# Kill existing processes on port 8181
lsof -ti:8181 | xargs kill -9 2>/dev/null || true
sleep 2

if $USE_DOCKER; then
    echo "   Starting Gov-Portal container..."
    docker-compose up -d gov-portal
    echo "   [INFO] Waiting for Gov-Portal container to be healthy..."
    for i in {1..12}; do
        if curl -s http://localhost:8181/ > /dev/null 2>&1; then
            break
        fi
        echo "   [INFO] Waiting for Gov-Portal... [$i/12]"
        sleep 5
    done
    if ! curl -s http://localhost:8181/ > /dev/null 2>&1; then
        echo -e "${RED}   [ERROR] Gov-Portal container failed to start!${NC}"
        docker-compose logs gov-portal
        exit 1
    fi
else
    echo "   Starting Gov-Portal locally with $DB_PROFILE profile..."
    cd "$SCRIPT_DIR/gov-portal"
    mvn spring-boot:run -Dspring-boot.run.profiles=$DB_PROFILE > /tmp/gov-portal.log 2>&1 &
    GOV_PID=$!
    cd "$SCRIPT_DIR"
    
    for i in {1..15}; do
        if curl -s http://localhost:8181/ > /dev/null 2>&1; then
            break
        fi
        echo "   [INFO] Waiting for Gov-Portal... [$i/15]"
        sleep 5
    done
    if ! curl -s http://localhost:8181/ > /dev/null 2>&1; then
        echo -e "${RED}   [ERROR] Gov-Portal failed to start!${NC}"
        exit 1
    fi
fi
echo -e "   ${GREEN}[OK] Gov-Portal running on http://localhost:8181${NC}"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 5: Deploy Hacker Console UI (ALWAYS LOCAL - simulates external attacker)
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[5/6] Deploying Hacker Console UI (Local On-Premise)...${NC}"

# Kill existing processes on port 8183
lsof -ti:8183 | xargs kill -9 2>/dev/null || true
rm -rf "$SCRIPT_DIR/hacker-console/hacker-data" 2>/dev/null || true
sleep 2

# Hacker Console ALWAYS runs locally to simulate external threat actor
echo "   Starting Hacker Console locally (standalone mode - external attacker)..."
cd "$SCRIPT_DIR/hacker-console"
mvn spring-boot:run -Dspring-boot.run.profiles=standalone > /tmp/hacker-console.log 2>&1 &
HACKER_PID=$!
cd "$SCRIPT_DIR"

for i in {1..12}; do
    if curl -s http://localhost:8183/harvest > /dev/null 2>&1; then
        break
    fi
    echo "   [INFO] Waiting for Hacker Console... [$i/12]"
    sleep 5
done
if ! curl -s http://localhost:8183/harvest > /dev/null 2>&1; then
    echo -e "${RED}   [ERROR] Hacker Console failed to start!${NC}"
    exit 1
fi
echo -e "   ${GREEN}[OK] Hacker Console UI running on http://localhost:8183 (Local)${NC}"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 6: Show Summary and Run Tests or Manual Mode
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[6/6] Setup Complete!${NC}"
echo ""
echo "============================================================================================="
echo -e "  ${CYAN}DEPLOYMENT SUMMARY:${NC}"
if $USE_DOCKER; then
    echo "    Infrastructure: Docker Containers + Local Services"
    echo "    Database:       PostgreSQL (containerized)"
    echo "    Gov-Portal:     Docker container (http://localhost:8181)"
else
    echo "    Infrastructure: Fully Local On-Premise (No Docker Required)"
    echo "    Database:       H2 In-Memory (lightweight, fast)"
    echo "    Gov-Portal:     Local Maven process (http://localhost:8181)"
fi
echo "    Hacker Console: Local Maven process (http://localhost:8183)"
echo "    Quantum Sim:    Local Python process (http://localhost:8184)"
echo ""
echo -e "  ${GREEN}ALL SERVICES ARE NOW RUNNING:${NC}"
echo "    [1] Gov-Portal:        http://localhost:8181"
echo "        - Register as citizen, submit documents"
echo "        - Login as officer to review applications"
echo ""
echo "    [2] Hacker Console:    http://localhost:8183"
echo "        - /harvest : Network traffic interception dashboard"
echo "        - /decrypt : Quantum decryption attack dashboard"
echo ""
echo "    [3] Quantum Simulator: http://localhost:8184"
echo "        - GPU-accelerated quantum attack simulation"
echo "        - Shor's Algorithm (RSA), Grover's (AES), Lattice (PQC)"
echo "============================================================================================="
echo ""

if $MANUAL_MODE; then
    # ═══════════════════════════════════════════════════════════════════════════════
    # MANUAL TESTING MODE
    # ═══════════════════════════════════════════════════════════════════════════════
    echo -e "  ${GREEN}MANUAL TESTING MODE${NC}"
    echo "============================================================================================="
    echo ""
    echo "  Opening browsers for manual testing..."
    echo ""
    
    # Open browsers automatically
    open_browser "http://localhost:8181"
    sleep 2
    open_browser "http://localhost:8183"
    sleep 2
    open_browser "http://localhost:8183/decrypt"
    
    echo "  Browsers opened:"
    echo "    - Gov-Portal:     http://localhost:8181"
    echo "    - Hacker Harvest: http://localhost:8183"
    echo "    - Hacker Decrypt: http://localhost:8183/decrypt"
    echo ""
    echo "============================================================================================="
    echo -e "  ${CYAN}HOW TO TEST MANUALLY:${NC}"
    echo ""
    echo "  [Step 1] GOV-PORTAL (http://localhost:8181)"
    echo "    1. Click \"Register\" to create a new citizen account"
    echo "    2. Login with your credentials"
    echo "    3. Click \"Submit Application\" and choose encryption:"
    echo "       - RSA-2048 + RSA-2048 (Vulnerable to quantum)"
    echo "       - ML-KEM + ML-DSA (Quantum-safe PQC)"
    echo "       - Mixed combinations to test hybrid scenarios"
    echo "    4. Submit a passport/visa/license application"
    echo ""
    echo "  [Step 2] HACKER CONSOLE - HARVEST (http://localhost:8183)"
    echo "    1. Watch the \"Intercepted Transactions\" panel"
    echo "    2. Documents you submit will appear here (HNDL attack)"
    echo "    3. Click \"Decrypt All\" or select individual items"
    echo ""
    echo "  [Step 3] HACKER CONSOLE - DECRYPT (http://localhost:8183/decrypt)"
    echo "    1. See real-time quantum attack progress"
    echo "    2. Watch Shor's Algorithm break RSA encryption"
    echo "    3. Watch Grover's Algorithm attack AES"
    echo "    4. See PQC (ML-KEM/ML-DSA) RESIST quantum attacks!"
    echo ""
    echo "  [Expected Results]"
    echo "    - RSA/AES encrypted documents: DECRYPTED (Quantum vulnerable)"
    echo "    - ML-KEM/ML-DSA documents: PROTECTED (Quantum-safe)"
    echo "============================================================================================="
else
    # ═══════════════════════════════════════════════════════════════════════════════
    # AUTOMATED TEST MODE
    # ═══════════════════════════════════════════════════════════════════════════════
    echo -e "  ${BLUE}AUTOMATED TESTING MODE${NC}"
    echo "  Running Selenium tests - Watch the 4 browser panels!"
    echo ""
    echo "  WATCH THE 4 BROWSER PANELS:"
    echo "    Top-Left:     Citizen submits documents with different algorithms"
    echo "    Top-Right:    Officer reviews applications"
    echo "    Bottom-Left:  Hacker intercepts encrypted traffic"
    echo "    Bottom-Right: Quantum decryption attack progress"
    echo ""
    echo "  RUNNING ALL 4 SCENARIOS:"
    echo "    Scenario 1: RSA + RSA       - FULLY VULNERABLE"
    echo "    Scenario 2: ML-KEM + ML-DSA - FULLY QUANTUM-SAFE"
    echo "    Scenario 3: RSA + ML-DSA    - MIXED"
    echo "    Scenario 4: ML-KEM + RSA    - MIXED"
    echo "============================================================================================="
    echo ""
    
    cd "$SCRIPT_DIR/ui-tests"
    mvn test -Dtest=com.pqc.selenium.ComprehensiveCryptoTest
    cd "$SCRIPT_DIR"
    
    echo ""
    echo "============================================================================================="
    echo -e "  ${GREEN}AUTOMATED TESTS COMPLETE!${NC}"
    echo ""
    echo "  All services remain running - you can now explore manually!"
    echo "============================================================================================="
fi

# ═══════════════════════════════════════════════════════════════════════════════
# KEEP RUNNING - Interactive Menu with Auto-Shutdown
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "============================================================================================="
echo -e "  ${GREEN}SERVICES ARE RUNNING - READY FOR TESTING${NC}"
echo ""
echo "  All services are running in background:"
echo "    - Gov-Portal (Port 8181)"
echo "    - Hacker Console (Port 8183)"
echo "    - Quantum Simulator (Port 8184)"
echo ""
echo "  Logs available at:"
echo "    - /tmp/gov-portal.log"
echo "    - /tmp/hacker-console.log"
echo "    - /tmp/quantum-simulator.log"
echo ""
echo -e "  ${YELLOW}AUTO-SHUTDOWN: Services will stop after 10 minutes of inactivity${NC}"
echo -e "  ${YELLOW}GPU CLEANUP: GPU VRAM will be released on shutdown${NC}"
echo "============================================================================================="
echo ""

# Reset activity timer
reset_activity_timer

while true; do
    # Calculate remaining time before auto-shutdown
    local current_time=$(date +%s)
    local elapsed=$((current_time - LAST_ACTIVITY_TIME))
    local remaining=$((AUTO_SHUTDOWN_TIMEOUT - elapsed))
    
    if [ $remaining -le 0 ]; then
        echo ""
        echo -e "${YELLOW}[AUTO-SHUTDOWN] 10 minutes of inactivity - cleaning up resources...${NC}"
        cleanup
    fi
    
    local mins=$((remaining / 60))
    local secs=$((remaining % 60))
    
    echo ""
    echo -e "  ${YELLOW}Auto-shutdown in: ${mins}m ${secs}s${NC}"
    echo -e "  ${CYAN}[O]${NC} Open browsers (resets timer)"
    echo -e "  ${CYAN}[T]${NC} Run automated tests (resets timer)"
    echo -e "  ${CYAN}[L]${NC} View logs (resets timer)"
    echo -e "  ${CYAN}[R]${NC} Reset timer (keep services running)"
    echo -e "  ${RED}[Q]${NC} Quit and cleanup resources"
    echo -e "  ${GREEN}[Enter]${NC} Exit menu (services keep running, NO auto-shutdown)"
    echo ""
    
    # Read with 30-second timeout
    read -t 30 -p "  Enter your choice: " USER_CHOICE
    READ_STATUS=$?
    
    # If read timed out, continue loop to check auto-shutdown
    if [ $READ_STATUS -ne 0 ]; then
        continue
    fi
    
    case "$USER_CHOICE" in
        [Oo])
            reset_activity_timer
            echo "  Opening browsers..."
            open_browser "http://localhost:8181"
            open_browser "http://localhost:8183"
            open_browser "http://localhost:8183/decrypt"
            echo "  Browsers opened! Timer reset."
            ;;
        [Tt])
            reset_activity_timer
            echo "  Running automated tests..."
            cd "$SCRIPT_DIR/ui-tests"
            mvn test -Dtest=com.pqc.selenium.ComprehensiveCryptoTest
            cd "$SCRIPT_DIR"
            echo "  Tests complete! Timer reset."
            ;;
        [Ll])
            reset_activity_timer
            echo ""
            echo "  Select log to view:"
            echo "    [1] Gov-Portal"
            echo "    [2] Hacker Console"
            echo "    [3] Quantum Simulator"
            read -p "  Choice: " LOG_CHOICE
            case "$LOG_CHOICE" in
                1) tail -50 /tmp/gov-portal.log 2>/dev/null || echo "Log not available" ;;
                2) tail -50 /tmp/hacker-console.log 2>/dev/null || echo "Log not available" ;;
                3) tail -50 /tmp/quantum-simulator.log 2>/dev/null || echo "Log not available" ;;
            esac
            ;;
        [Rr])
            reset_activity_timer
            echo "  Timer reset! Auto-shutdown postponed."
            ;;
        [Qq])
            cleanup
            ;;
        "")
            echo ""
            echo -e "  ${GREEN}Services continue running in background.${NC}"
            echo -e "  ${YELLOW}Auto-shutdown DISABLED - services will run until manually stopped.${NC}"
            echo "  You can close this terminal safely."
            echo "  To stop services later, run:"
            echo "    pkill -f spring-boot:run && pkill -f quantum_service.py"
            echo "  Or run this script again and choose [Q] to quit."
            echo ""
            exit 0
            ;;
        *)
            echo "  Invalid choice. Please try again."
            ;;
    esac
done
