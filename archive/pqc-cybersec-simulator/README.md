# PQC CyberSec Simulator (Archived)

This folder contains the original **Post-Quantum Cryptography cyber-attack education simulator** (Java/Spring Boot). It is preserved as a frozen reference and for HNDL demo scenarios used by security tests.

## Run from this directory

```bash
# Build all modules
mvn clean install -DskipTests

# Government portal (port 8181)
cd gov-portal && mvn spring-boot:run

# Hacker console (port 8183, run outside Docker)
cd hacker-console && mvn spring-boot:run -Dspring-boot.run.profiles=standalone

# Docker stack (gov-portal + messaging + postgres)
docker compose up -d
```

See [README-SIMULATOR.md](./README-SIMULATOR.md) for the full original documentation.
