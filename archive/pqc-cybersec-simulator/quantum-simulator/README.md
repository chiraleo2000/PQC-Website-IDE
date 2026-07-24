# Python cuQuantum Quantum Simulator

A real GPU-accelerated quantum circuit simulator for the PQC CyberSec demonstration.
This service uses NVIDIA cuQuantum SDK and CuPy to perform **actual quantum simulation** on your GPU.

## Features

- **Shor's Algorithm**: Simulates quantum factorization attack on RSA
- **Grover's Algorithm**: Simulates quantum search speedup on AES
- **Lattice Attack**: Demonstrates quantum resistance of ML-KEM (Kyber)
- **State Vector Simulation**: Full quantum state simulation up to 28 qubits
- **GPU Acceleration**: Uses NVIDIA CUDA for massive parallelization

## Requirements

### Hardware
- NVIDIA GPU with Compute Capability 7.0+ (RTX 20 series or newer)
- 8GB+ VRAM recommended for larger simulations

### Software
- Python 3.10 or newer
- CUDA Toolkit 12.x
- cuQuantum SDK 24.03.0 or newer

## Installation

### Option 1: Automatic (Recommended)
```batch
# Windows
start-quantum.bat

# Linux/Mac
./start-quantum.sh
```

### Option 2: Manual Installation
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install CPU dependencies (always works)
pip install numpy scipy sympy flask flask-cors requests

# Install GPU dependencies (requires CUDA 12.x)
pip install cupy-cuda12x
pip install cuquantum-python-cu12
```

## API Endpoints

### GET /api/quantum/status
Returns quantum simulator status including GPU info and capabilities.

```json
{
  "service": "cuQuantum GPU Quantum Simulator",
  "cuquantum_available": true,
  "cupy_available": true,
  "gpu": {
    "name": "NVIDIA GeForce RTX 4060 Laptop GPU",
    "compute_capability": "8.9",
    "total_memory_mb": 8188
  },
  "capabilities": {
    "shors_algorithm": true,
    "grovers_algorithm": true,
    "max_qubits": 28
  }
}
```

### POST /api/quantum/shor
Execute Shor's algorithm for RSA factorization.

**Request:**
```json
{
  "modulus": 15,
  "key_bits": 2048
}
```

**Response:**
```json
{
  "algorithm": "Shor's Algorithm",
  "purpose": "RSA Factorization",
  "result": {
    "success": true,
    "factor_p": 3,
    "factor_q": 5,
    "qubits_used": 11,
    "execution_time_ms": 523.4
  },
  "vulnerability": "RSA is BROKEN by quantum computers"
}
```

### POST /api/quantum/grover
Execute Grover's algorithm for symmetric key search.

**Request:**
```json
{
  "key_bits": 128
}
```

**Response:**
```json
{
  "algorithm": "Grover's Algorithm",
  "purpose": "Symmetric Key Search",
  "result": {
    "speedup_factor": 16777216,
    "iterations": 16384
  },
  "security_analysis": {
    "original_security_bits": 128,
    "post_quantum_security_bits": 64
  }
}
```

### POST /api/quantum/attack/rsa
Simulate complete RSA attack.

### POST /api/quantum/attack/lattice
Attempt attack on ML-KEM (always fails - demonstrates quantum resistance).

## Integration with Java Hacker Console

The Java hacker-console service automatically connects to this Python service when available:

```java
// PythonQuantumClient.java automatically calls:
// GET  http://localhost:8184/api/quantum/status
// POST http://localhost:8184/api/quantum/shor
// POST http://localhost:8184/api/quantum/attack/rsa
// POST http://localhost:8184/api/quantum/attack/lattice
```

If the Python service is not running, the Java service falls back to CPU-based simulation.

## Educational Notes

### Shor's Algorithm
- **Classical Factorization**: O(exp(n^(1/3))) - billions of years for RSA-2048
- **Quantum Factorization**: O(n³) - hours to days with sufficient qubits
- **Impact**: All RSA-encrypted data can be decrypted retroactively

### Grover's Algorithm
- **Classical Search**: O(N) - must check each element
- **Quantum Search**: O(√N) - quadratic speedup
- **Impact**: AES-128 reduced to 64-bit security, AES-256 remains secure at 128-bit

### Lattice-Based Crypto (ML-KEM)
- **Best Quantum Attack**: BKZ with Grover enhancement
- **Speedup**: Polynomial only (not exponential)
- **Impact**: ML-KEM remains secure against quantum computers

## GPU Memory Usage

The state vector simulation requires memory proportional to 2^n qubits:

| Qubits | State Vector Size | GPU Memory |
|--------|------------------|------------|
| 20     | 2^20 = 1M        | 16 MB      |
| 25     | 2^25 = 33M       | 512 MB     |
| 28     | 2^28 = 268M      | 4 GB       |
| 30     | 2^30 = 1B        | 16 GB      |

Your RTX 4060 (8GB VRAM) can simulate up to ~28 qubits efficiently.

## Running in Docker

```bash
docker build -t quantum-simulator ./quantum-simulator
docker run -p 8184:8184 quantum-simulator
```

Note: Docker container uses CPU-only mode. For GPU support, use NVIDIA Container Toolkit.
