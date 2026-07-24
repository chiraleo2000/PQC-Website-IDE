-- PQC CyberSec Simulator - Database Initialization
-- PostgreSQL Schema

-- Users table with authentication
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(128) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'CITIZEN',
    full_name VARCHAR(200),
    phone VARCHAR(20),
    
    -- PQC Keys (ML-DSA for signatures)
    ml_dsa_public_key BYTEA,
    ml_dsa_private_key BYTEA,
    
    -- PQC Keys (ML-KEM for encryption)
    ml_kem_public_key BYTEA,
    ml_kem_private_key BYTEA,
    
    -- Classical Keys (RSA - for demo/fallback)
    rsa_public_key BYTEA,
    rsa_private_key BYTEA,
    
    -- Preferences
    preferred_signature_algorithm VARCHAR(50) DEFAULT 'ML_DSA',
    preferred_encryption_algorithm VARCHAR(50) DEFAULT 'ML_KEM',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    key_generated_at TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    document_id VARCHAR(128) UNIQUE NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    
    -- Relationships
    applicant_id BIGINT REFERENCES users(id),
    signer_id BIGINT REFERENCES users(id),
    
    -- Encryption
    encryption_algorithm VARCHAR(50),
    
    -- Signature
    signature BYTEA,
    signature_algorithm VARCHAR(50),
    signed_at TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'PENDING',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Encrypted Messages table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(128) UNIQUE NOT NULL,
    
    -- Relationships
    sender_id BIGINT REFERENCES users(id),
    recipient_id BIGINT REFERENCES users(id),
    
    -- Content
    subject VARCHAR(255),
    encrypted_content BYTEA NOT NULL,
    encapsulated_key BYTEA,
    iv BYTEA,
    
    -- Encryption details
    encryption_algorithm VARCHAR(50) NOT NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_decrypted BOOLEAN DEFAULT FALSE,
    
    -- Harvest tracking (for HNDL demo)
    is_harvested BOOLEAN DEFAULT FALSE,
    harvested_at TIMESTAMP,
    harvested_by VARCHAR(128),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Attack Attempts table (for simulation tracking)
CREATE TABLE IF NOT EXISTS attack_attempts (
    id BIGSERIAL PRIMARY KEY,
    attempt_id VARCHAR(128) UNIQUE NOT NULL,
    
    -- Target
    target_message_id VARCHAR(128),
    target_user_id VARCHAR(128),
    
    -- Attack details
    attack_type VARCHAR(50) NOT NULL,
    target_algorithm VARCHAR(50),
    
    -- Results
    status VARCHAR(50) NOT NULL,
    execution_time_ms BIGINT,
    estimated_qubits INTEGER,
    estimated_quantum_gates BIGINT,
    estimated_classical_time_years BIGINT,
    estimated_quantum_time_hours BIGINT,
    
    -- Output
    result_description TEXT,
    educational_lesson TEXT,
    recovered_plaintext TEXT,
    
    -- Timestamps
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(128),
    details JSONB,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_documents_applicant ON documents(applicant_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_harvested ON messages(is_harvested);
CREATE INDEX idx_attacks_type ON attack_attempts(attack_type);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
