@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM  PQC CYBERSEC SIMULATOR - FULLY AUTOMATED DEMO
REM ═══════════════════════════════════════════════════════════════════════════════
REM  Starts all services, runs automated Selenium test first, then allows interaction
REM  USER CAN CONTINUE MANUAL TESTING AFTER AUTOMATED RUN
REM
REM  HYBRID ENCRYPTION MODEL (Industry Standard - Like TLS/Signal/WhatsApp):
REM    - KEM: RSA-2048 or ML-KEM-768 (key encapsulation for AES key)
REM    - Bulk: AES-256-GCM (fast symmetric encryption for data)
REM    - Signature: RSA-2048 or ML-DSA-65 (authentication)
REM
REM  AUTHENTICATION:
REM    - Form-based login (demo accounts)
REM    - OAuth 2.0 ready (Google, GitHub) when configured
REM ═══════════════════════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion
cd /d %~dp0
set "DEMO_DIR=%~dp0"
set "DEMO_MODE=EXE"

echo.
echo =============================================================================================
echo        PQC CYBERSEC - FULLY AUTOMATED DEMO
echo        Quantum-Resistant vs Classical Cryptography
echo =============================================================================================
echo.
echo   This demo runs tests automatically, then stays interactive.
echo   AUTO-SHUTDOWN: Services stop after 10 minutes of no interaction.
echo.
echo   HYBRID ENCRYPTION (Industry Standard):
echo     - KEM: RSA-2048 or ML-KEM-768 (key encapsulation)
echo     - Bulk: AES-256-GCM (fast symmetric encryption)
echo     - Signature: RSA-2048 or ML-DSA-65 (authentication)
echo.
echo =============================================================================================
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM Mode Selection: Docker or EXE (native)
REM ═══════════════════════════════════════════════════════════════════════════════
echo   Select demo mode:
echo     [1] EXE  - Run natively (Maven + Python)
echo     [2] Docker - Run via docker-compose (requires Docker Desktop)
echo.
choice /C 12 /T 15 /D 1 /N /M "Choose 1 or 2 (default: EXE in 15s): "
if !errorlevel! equ 2 (
    set "DEMO_MODE=DOCKER"
    echo.
    echo   [MODE] Docker selected - using docker-compose
    goto DOCKER_MODE
)
echo.
echo   [MODE] EXE selected - running natively
echo.
echo   WORKFLOW:
echo     1. Start Quantum Simulator (GPU)
echo     2. Start Gov-Portal
echo     3. Start Hacker Console
echo     4. Run Selenium automated test
echo     5. Open browser panels for manual interaction
echo     6. Keep running until user chooses cleanup (auto-quit 10 min)
echo.
echo =============================================================================================
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM Step 0: Detect JDK, check GPU, and prepare Maven libraries
REM ═══════════════════════════════════════════════════════════════════════════════
echo [0/6] Checking prerequisites...

REM --- JDK Auto-Detection (require javac, not just java) ---
where javac >nul 2>&1
if !errorlevel! neq 0 (
    echo       [WARN] javac not on PATH - searching for a JDK...
    set "FOUND_JDK="
    for /d %%D in ("C:\Program Files\Java\jdk-*") do (
        if exist "%%D\bin\javac.exe" set "FOUND_JDK=%%D"
    )
    if defined FOUND_JDK (
        echo       [OK] Found JDK at !FOUND_JDK!
        set "JAVA_HOME=!FOUND_JDK!"
        set "PATH=!FOUND_JDK!\bin;!PATH!"
    ) else (
        echo       [ERROR] No JDK found! Install JDK 21+ and set JAVA_HOME.
        exit /b 1
    )
) else (
    REM Verify JAVA_HOME points to a JDK, not a JRE
    if defined JAVA_HOME (
        if not exist "%JAVA_HOME%\bin\javac.exe" (
            echo       [WARN] JAVA_HOME points to a JRE, not a JDK. Auto-fixing...
            set "FOUND_JDK="
            for /d %%D in ("C:\Program Files\Java\jdk-*") do (
                if exist "%%D\bin\javac.exe" set "FOUND_JDK=%%D"
            )
            if defined FOUND_JDK (
                set "JAVA_HOME=!FOUND_JDK!"
                set "PATH=!FOUND_JDK!\bin;!PATH!"
                echo       [OK] JAVA_HOME set to !FOUND_JDK!
            )
        )
    )
)
echo       [OK] JDK ready: javac found
javac -version 2>&1 | findstr /C:"javac" >nul && echo       [OK] Compiler verified

REM --- GPU + VRAM Check (6 GB minimum) ---
set "GPU_OK=0"
set "GPU_VRAM_MB=0"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=1,2 delims=," %%A in ('nvidia-smi --query-gpu^=name^,memory.total --format^=csv^,noheader^,nounits') do (
        set "GPU_NAME=%%A"
        set "GPU_VRAM_MB=%%B"
    )
    set "GPU_VRAM_MB=!GPU_VRAM_MB: =!"
    echo       [OK] GPU detected: !GPU_NAME! ^(!GPU_VRAM_MB! MB VRAM^)
    if !GPU_VRAM_MB! GEQ 6144 (
        set "GPU_OK=1"
        echo       [OK] GPU VRAM sufficient ^(!GPU_VRAM_MB! MB ^>= 6144 MB^) - GPU mode enabled
    ) else (
        echo       [WARN] GPU VRAM insufficient ^(!GPU_VRAM_MB! MB ^< 6144 MB^) - CPU fallback will be used
    )
) else (
    echo       [WARN] No NVIDIA GPU detected - quantum simulator will run in limited mode
)

REM --- Python + Quantum Simulator Dependencies ---
where python >nul 2>&1
if !errorlevel! equ 0 (
    echo       [OK] Python found
    python -c "import flask, flask_cors, numpy, scipy, sympy, requests" >nul 2>&1
    if !errorlevel! neq 0 (
        echo       [INFO] Installing missing Python packages for Quantum Simulator...
        pip install -r "%DEMO_DIR%quantum-simulator\requirements.txt" --quiet 2>&1
        if !errorlevel! equ 0 (
            echo       [OK] Python packages installed
        ) else (
            echo       [WARN] Some Python packages failed to install - continuing anyway
        )
    ) else (
        echo       [OK] Python packages verified
    )
) else (
    echo       [WARN] Python not found - Quantum Simulator may not start
)

REM --- Maven Libraries Pre-Build (build crypto-lib + all modules if missing) ---
if not exist "%USERPROFILE%\.m2\repository\com\pqc\crypto-lib\1.0.0\crypto-lib-1.0.0.jar" (
    echo       [INFO] crypto-lib not found in local Maven repo - building all modules...
    cd /d "%DEMO_DIR%"
    call mvn clean install -DskipTests -q
    if !errorlevel! equ 0 (
        echo       [OK] All Maven modules built and installed
    ) else (
        echo       [ERROR] Maven build failed! Check Java/Maven setup.
        exit /b 1
    )
) else (
    echo       [OK] Maven libraries already installed
)
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM Step 1: Kill any existing processes and clean GPU
REM ═══════════════════════════════════════════════════════════════════════════════
echo [1/6] Cleaning up existing processes...
taskkill /F /IM java.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8181.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8183.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8184.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1

if exist "%DEMO_DIR%Clear_GPU.py" (
    python "%DEMO_DIR%Clear_GPU.py" >nul 2>&1
    echo       [OK] GPU memory cleared
)
timeout /t 2 /nobreak >nul
echo       [OK] Cleanup complete

REM ═══════════════════════════════════════════════════════════════════════════════
REM Step 2: Start Quantum Simulator
REM ═══════════════════════════════════════════════════════════════════════════════
echo [2/6] Starting Quantum Simulator (GPU-accelerated)...
start "Quantum Simulator" /min cmd /c "cd /d %DEMO_DIR%quantum-simulator && python quantum_service.py"

set QS_RETRY=0
:WAIT_QS
timeout /t 3 /nobreak >nul
set /a QS_RETRY+=1
curl -s http://localhost:8184/api/quantum/status >nul 2>&1
if !errorlevel! equ 0 goto QS_OK
if !QS_RETRY! lss 15 (
    echo       Waiting for Quantum Simulator... [!QS_RETRY!/15]
    goto WAIT_QS
)
echo       [WARN] Quantum Simulator slow - continuing...
goto QS_DONE
:QS_OK
echo       [OK] Quantum Simulator running on http://localhost:8184
:QS_DONE

REM ═══════════════════════════════════════════════════════════════════════════════
REM Step 3: Start Gov-Portal
REM ═══════════════════════════════════════════════════════════════════════════════
echo [3/6] Starting Gov-Portal...
start "Gov-Portal" /min cmd /c "cd /d %DEMO_DIR%gov-portal && mvn spring-boot:run -Dspring-boot.run.profiles=h2 -q"

set GOV_RETRY=0
:WAIT_GOV
timeout /t 5 /nobreak >nul
set /a GOV_RETRY+=1
curl -s http://localhost:8181/ >nul 2>&1
if !errorlevel! equ 0 goto GOV_OK
if !GOV_RETRY! lss 24 (
    echo       Waiting for Gov-Portal... [!GOV_RETRY!/24]
    goto WAIT_GOV
)
echo       [ERROR] Gov-Portal failed to start!
goto CLEANUP
:GOV_OK
echo       [OK] Gov-Portal running on http://localhost:8181

REM ═══════════════════════════════════════════════════════════════════════════════
REM Step 4: Start Hacker Console
REM ═══════════════════════════════════════════════════════════════════════════════
echo [4/6] Starting Hacker Console...
if exist "%DEMO_DIR%hacker-console\hacker-data" rmdir /s /q "%DEMO_DIR%hacker-console\hacker-data" >nul 2>&1
start "Hacker Console" /min cmd /c "cd /d %DEMO_DIR%hacker-console && mvn spring-boot:run -Dspring-boot.run.profiles=standalone -q"

set HACKER_RETRY=0
:WAIT_HACKER
timeout /t 5 /nobreak >nul
set /a HACKER_RETRY+=1
curl -s http://localhost:8183/harvest >nul 2>&1
if !errorlevel! equ 0 goto HACKER_OK
if !HACKER_RETRY! lss 24 (
    echo       Waiting for Hacker Console... [!HACKER_RETRY!/24]
    goto WAIT_HACKER
)
echo       [ERROR] Hacker Console failed to start!
goto CLEANUP
:HACKER_OK
echo       [OK] Hacker Console running on http://localhost:8183

REM ═══════════════════════════════════════════════════════════════════════════════
REM Step 5: Run Automated Selenium Demo
REM ═══════════════════════════════════════════════════════════════════════════════
echo [5/6] Running automated Selenium demo...
echo.
echo   This demonstrates all 4 crypto scenarios automatically:
echo     1. RSA-KEM + AES-256 + RSA-Sig (FULLY VULNERABLE)
echo     2. ML-KEM + AES-256 + ML-DSA (FULLY QUANTUM-SAFE)
echo     3. RSA-KEM + AES-256 + ML-DSA (ENCRYPTION VULNERABLE)
echo     4. ML-KEM + AES-256 + RSA-Sig (SIGNATURE VULNERABLE)
echo.
echo   Watch the browser panels!
echo.

timeout /t 3 /nobreak >nul

cd /d "%DEMO_DIR%ui-tests"
call mvn test -Dtest=com.pqc.selenium.ComprehensiveCryptoTest
set TEST_RESULT=!errorlevel!
cd /d "%DEMO_DIR%"

echo.
if !TEST_RESULT! equ 0 (
    echo =============================================================================================
    echo   AUTOMATED TESTING COMPLETED SUCCESSFULLY!
    echo =============================================================================================
) else (
    echo =============================================================================================
    echo   AUTOMATED TESTING COMPLETED WITH SOME ISSUES (check test output above)
    echo =============================================================================================
)
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM Step 6: Open Browser Panels and Allow Manual Interaction
REM ═══════════════════════════════════════════════════════════════════════════════
echo [6/6] Opening browser panels for manual interaction...
timeout /t 2 /nobreak >nul

start "" "http://localhost:8181"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8181/officer/review"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8183/dashboard"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8183/decrypt"

echo       [OK] Browser panels opened (User Portal, Officer Review, Hacker Dashboard, Hacker Decrypt)
echo.

echo =============================================================================================
echo   SERVICES ARE RUNNING - READY FOR INTERACTION
echo =============================================================================================
echo.
echo   Gov-Portal:        http://localhost:8181
echo   Hacker Dashboard:  http://localhost:8183/dashboard
echo   Quantum Decrypt:   http://localhost:8183/decrypt
echo   Quantum API:       http://localhost:8184
echo.
echo   HYBRID ENCRYPTION MODEL:
echo     - KEM: RSA-2048 (vulnerable) or ML-KEM-768 (quantum-safe)
echo     - Bulk: AES-256-GCM (symmetric, fast for data)
echo     - Sig: RSA-2048 (vulnerable) or ML-DSA-65 (quantum-safe)
echo.
echo   AUTHENTICATION:
echo     - Form Login: john.citizen / Citizen@2024!
echo     - Form Login: officer / Officer@2024!
echo     - OAuth 2.0: Configure in application.properties
echo.

:MENU_LOOP
echo =============================================================================================
echo   MENU OPTIONS:
echo     [O] Open browser panels again
echo     [T] Re-run Selenium automated test
echo     [Q] Quit and cleanup all services
echo.
echo   AUTO-SHUTDOWN: Services will stop after 10 minutes of inactivity.
echo =============================================================================================

REM --- 10-minute inactivity auto-shutdown ---
REM   choice /T 600 waits 600s (10 min) for a keypress; on timeout picks default D (quit)
choice /C OTQD /T 600 /D D /N /M "Choose O, T, or Q (auto-quit in 10 min): "
set CHOICE_ERR=!errorlevel!

if !CHOICE_ERR! equ 1 goto OPEN_PANELS
if !CHOICE_ERR! equ 2 goto RERUN_TEST
if !CHOICE_ERR! equ 3 goto CLEANUP
if !CHOICE_ERR! equ 4 (
    echo.
    echo   [AUTO-SHUTDOWN] No interaction for 10 minutes - shutting down services...
    goto CLEANUP
)

echo   Invalid option. Please choose O, T, or Q.
goto MENU_LOOP

:OPEN_PANELS
echo.
echo   Opening browser panels...
start "" "http://localhost:8181"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8181/officer/review"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8183/dashboard"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8183/decrypt"
echo   [OK] Browser panels opened (User Portal, Officer Review, Hacker Dashboard, Hacker Decrypt).
goto MENU_LOOP

:RERUN_TEST
echo.
echo   Re-running Selenium automated test...
cd /d "%DEMO_DIR%ui-tests"
call mvn test -Dtest=com.pqc.selenium.ComprehensiveCryptoTest
set TEST_RESULT=!errorlevel!
cd /d "%DEMO_DIR%"

if !TEST_RESULT! equ 0 (
    echo   [OK] Selenium test completed successfully.
) else (
    echo   [WARN] Selenium test completed with issues.
)
goto MENU_LOOP

REM ═══════════════════════════════════════════════════════════════════════════════
REM DOCKER MODE
REM ═══════════════════════════════════════════════════════════════════════════════
:DOCKER_MODE
echo.
echo =============================================================================================
echo   DOCKER MODE - Starting all services via docker-compose
echo =============================================================================================
echo.

REM Check docker is available
where docker >nul 2>&1
if !errorlevel! neq 0 (
    echo   [ERROR] Docker not found on PATH! Install Docker Desktop first.
    exit /b 1
)
docker info >nul 2>&1
if !errorlevel! neq 0 (
    echo   [ERROR] Docker daemon not running! Start Docker Desktop first.
    exit /b 1
)
echo   [OK] Docker is available

echo   [1/3] Building and starting Docker containers...
docker-compose up --build -d
if !errorlevel! neq 0 (
    echo   [ERROR] docker-compose up failed!
    exit /b 1
)
echo   [OK] Containers started

echo   [2/3] Waiting for services to be healthy...
set DOCKER_RETRY=0
:WAIT_DOCKER
timeout /t 5 /nobreak >nul
set /a DOCKER_RETRY+=1
curl -s http://localhost:8181/ >nul 2>&1
if !errorlevel! equ 0 (
    curl -s http://localhost:8183/harvest >nul 2>&1
    if !errorlevel! equ 0 goto DOCKER_READY
)
if !DOCKER_RETRY! lss 30 (
    echo       Waiting for Docker services... [!DOCKER_RETRY!/30]
    goto WAIT_DOCKER
)
echo   [WARN] Some services may still be starting...
:DOCKER_READY
echo   [OK] All Docker services ready

echo   [3/3] Opening browser panels...
timeout /t 2 /nobreak >nul
start "" "http://localhost:8181"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8181/officer/review"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8183/dashboard"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8183/decrypt"
echo   [OK] Browser panels opened (User Portal, Officer Review, Hacker Dashboard, Hacker Decrypt)
echo.

echo =============================================================================================
echo   DOCKER SERVICES RUNNING - READY FOR INTERACTION
echo =============================================================================================
echo.
echo   Gov-Portal:        http://localhost:8181
echo   Hacker Dashboard:  http://localhost:8183/dashboard
echo   Quantum Decrypt:   http://localhost:8183/decrypt
echo   Quantum API:       http://localhost:8184
echo.
echo   Login: john.citizen / Citizen@2024!   or   officer / Officer@2024!
echo.

:DOCKER_MENU
echo =============================================================================================
echo   DOCKER MENU:
echo     [O] Open browser panels again
echo     [L] Show container logs
echo     [Q] Quit and stop all containers
echo.
echo   AUTO-SHUTDOWN: Containers will stop after 10 minutes of inactivity.
echo =============================================================================================

choice /C OLQD /T 600 /D D /N /M "Choose O, L, or Q (auto-quit in 10 min): "
set CHOICE_ERR=!errorlevel!

if !CHOICE_ERR! equ 1 (
    start "" "http://localhost:8181"
    timeout /t 1 /nobreak >nul
    start "" "http://localhost:8183/dashboard"
    timeout /t 1 /nobreak >nul
    start "" "http://localhost:8183/decrypt"
    echo   [OK] Browser panels opened.
    goto DOCKER_MENU
)
if !CHOICE_ERR! equ 2 (
    echo.
    echo --- Recent container logs ---
    docker-compose logs --tail=30
    echo.
    goto DOCKER_MENU
)
if !CHOICE_ERR! equ 3 goto DOCKER_CLEANUP
if !CHOICE_ERR! equ 4 (
    echo.
    echo   [AUTO-SHUTDOWN] No interaction for 10 minutes - stopping containers...
    goto DOCKER_CLEANUP
)
goto DOCKER_MENU

:DOCKER_CLEANUP
echo.
echo =============================================================================================
echo   STOPPING DOCKER CONTAINERS...
echo =============================================================================================
docker-compose down
echo   [OK] All containers stopped and removed.
echo.
echo =============================================================================================
echo   DOCKER CLEANUP COMPLETE!
echo =============================================================================================
echo.
exit /b 0

:CLEANUP
echo.
echo =============================================================================================
echo   CLEANING UP...
echo =============================================================================================

echo   [1/4] Stopping service windows...
taskkill /FI "WINDOWTITLE eq Gov-Portal*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Hacker Console*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Quantum Simulator*" /F >nul 2>&1

echo   [2/4] Releasing network ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8181.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8183.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8184.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo   [3/4] Stopping Java processes...
taskkill /F /IM java.exe >nul 2>&1
for /f "tokens=2" %%a in ('wmic process where "commandline like '%%quantum_service%%'" get processid 2^>nul ^| findstr /r "[0-9]"') do taskkill /F /PID %%a >nul 2>&1

echo   [4/4] Releasing GPU VRAM...
if exist "%DEMO_DIR%Clear_GPU.py" (
    python "%DEMO_DIR%Clear_GPU.py" >nul 2>&1
    echo       [OK] GPU VRAM released
)

timeout /t 2 /nobreak >nul

echo.
echo =============================================================================================
echo   ALL CLEANED UP!
echo =============================================================================================
echo.
exit /b 0
