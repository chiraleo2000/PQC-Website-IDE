# =============================================================================
# PQC-CyberSec-Simulator Quantum Service Dockerfile
# =============================================================================
# 
# GPU-ONLY quantum simulation using NVIDIA CUDA 13.x + CuPy + cuQuantum.
# CPU fallback is allowed ONLY when GPU VRAM < 6 GB.
#
# Build:
#   docker build -t pqc-quantum-simulator ./quantum-simulator
#
# Run with GPU (required for full simulation):
#   docker run --gpus all -p 8184:8184 pqc-quantum-simulator
#
# Run without GPU (limited / CPU-fallback mode):
#   docker run -p 8184:8184 -e GPU_REQUIRED=false pqc-quantum-simulator
#
# =============================================================================

# NVIDIA CUDA 13.0 base image for GPU support
FROM nvidia/cuda:13.0.0-runtime-ubuntu24.04

# Install Python 3.12 and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.12 \
    python3-pip \
    python3.12-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.12 /usr/bin/python \
    && ln -sf /usr/bin/python3.12 /usr/bin/python3

WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .

# Install all Python dependencies including GPU packages
# GPU packages (cupy-cuda13x, cuquantum-python-cu13) will fail gracefully
# on CPU-only hosts; core deps always install.
RUN pip install --no-cache-dir --break-system-packages \
    numpy scipy sympy flask flask-cors requests \
    && pip install --no-cache-dir --break-system-packages \
    cupy-cuda13x cuquantum-python-cu13 \
    || echo "[WARN] GPU packages failed to install - CPU fallback will be used"

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 8184

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8184/api/quantum/status || exit 1

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV GPU_REQUIRED=true
ENV FLASK_ENV=production

# Run the service
CMD ["python", "quantum_service.py"]