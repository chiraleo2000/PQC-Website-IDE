//! AES-256-GCM envelope for local project files (passphrase → Argon2id key).

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

const ENVELOPE_VERSION: u8 = 1;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptedEnvelope {
    pub version: u8,
    pub kdf: String,
    pub salt: String,
    pub nonce: String,
    pub ciphertext: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_source: Option<String>,
}

#[derive(Clone, Copy)]
pub enum KeySource {
    Passphrase,
    /// Placeholder for PKCS#11 / TPM integration (`PQC_HSM_ENABLED=1`).
    Hardware,
}

impl KeySource {
    pub fn label(self) -> &'static str {
        match self {
            KeySource::Passphrase => "passphrase",
            KeySource::Hardware => "hardware",
        }
    }
}

pub fn hardware_key_enabled() -> bool {
    std::env::var("PQC_HSM_ENABLED")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn derive_key(passphrase: &[u8], salt: &[u8]) -> Result<[u8; KEY_LEN], String> {
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(passphrase, salt, &mut key)
        .map_err(|e| e.to_string())?;
    Ok(key)
}

pub fn encrypt_plaintext(
    plaintext: &[u8],
    passphrase: &[u8],
    source: KeySource,
) -> Result<String, String> {
    let mut salt = [0u8; SALT_LEN];
    rand::thread_rng().fill_bytes(&mut salt);

    let mut key = derive_key(passphrase, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| e.to_string())?;

    key.zeroize();

    let envelope = EncryptedEnvelope {
        version: ENVELOPE_VERSION,
        kdf: "argon2id".into(),
        salt: STANDARD.encode(salt),
        nonce: STANDARD.encode(nonce_bytes),
        ciphertext: STANDARD.encode(ciphertext),
        key_source: Some(source.label().into()),
    };

    serde_json::to_string(&envelope).map_err(|e| e.to_string())
}

pub fn decrypt_envelope(raw: &str, passphrase: &[u8]) -> Result<Vec<u8>, String> {
    let envelope: EncryptedEnvelope =
        serde_json::from_str(raw).map_err(|_| "invalid encrypted project file".to_string())?;

    if envelope.version != ENVELOPE_VERSION {
        return Err("unsupported envelope version".into());
    }

    let salt = STANDARD
        .decode(&envelope.salt)
        .map_err(|_| "invalid salt".to_string())?;
    let nonce_bytes = STANDARD
        .decode(&envelope.nonce)
        .map_err(|_| "invalid nonce".to_string())?;
    let ct = STANDARD
        .decode(&envelope.ciphertext)
        .map_err(|_| "invalid ciphertext".to_string())?;

    let mut key = derive_key(passphrase, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ct.as_ref())
        .map_err(|_| "decryption failed — wrong passphrase or corrupted file".to_string())?;

    key.zeroize();
    Ok(plaintext)
}

/// HSM path: requires `PQC_HSM_ENABLED` and `PQC_HSM_KEY_B64` (32-byte key, base64).
pub fn hardware_passphrase_material() -> Result<Vec<u8>, String> {
    if !hardware_key_enabled() {
        return Err("hardware key storage is not enabled".into());
    }
    let b64 = std::env::var("PQC_HSM_KEY_B64")
        .map_err(|_| "PQC_HSM_KEY_B64 is not set".to_string())?;
    STANDARD
        .decode(b64.trim())
        .map_err(|_| "invalid PQC_HSM_KEY_B64".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_encrypt_decrypt() {
        let plain = br#"{"version":1,"root":{"id":"x","type":"div","props":{},"children":[]}}"#;
        let pass = b"test-passphrase-32-chars-minimum!!";
        let enc = encrypt_plaintext(plain, pass, KeySource::Passphrase).unwrap();
        let dec = decrypt_envelope(&enc, pass).unwrap();
        assert_eq!(dec, plain);
    }

    #[test]
    fn wrong_passphrase_fails() {
        let enc = encrypt_plaintext(b"secret", b"correct-horse-battery-staple-pass", KeySource::Passphrase)
            .unwrap();
        assert!(decrypt_envelope(&enc, b"wrong").is_err());
    }
}
