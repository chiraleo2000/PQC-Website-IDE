//! Tightly scoped IPC commands — the only way the webview touches the filesystem.

use crate::crypto::{self, hardware_key_enabled, hardware_passphrase_material, KeySource};
use crate::paths::{list_project_ids, project_file_path, storage_path_display};
use std::fs;
use tauri::AppHandle;
use zeroize::Zeroize;

fn key_material(passphrase: &str, use_hardware: bool) -> Result<Vec<u8>, String> {
    if use_hardware {
        hardware_passphrase_material()
    } else if passphrase.is_empty() {
        Err("passphrase is required".into())
    } else {
        Ok(passphrase.as_bytes().to_vec())
    }
}

/// Write verified AST JSON to disk as AES-256-GCM ciphertext (Argon2id KDF).
#[tauri::command]
pub fn write_encrypted_project(
    app: AppHandle,
    project_id: String,
    plaintext: String,
    passphrase: String,
    use_hardware_key: Option<bool>,
) -> Result<String, String> {
    let path = project_file_path(&app, &project_id)?;
    let use_hw = use_hardware_key.unwrap_or(false);
    let source = if use_hw {
        KeySource::Hardware
    } else {
        KeySource::Passphrase
    };
    let mut key = key_material(&passphrase, use_hw)?;
    let envelope = crypto::encrypt_plaintext(plaintext.as_bytes(), &key, source)?;
    key.zeroize();
    fs::write(&path, envelope).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

/// Read and decrypt a local project file. Passphrase or HSM key material required.
#[tauri::command]
pub fn read_encrypted_project(
    app: AppHandle,
    project_id: String,
    passphrase: String,
    use_hardware_key: Option<bool>,
) -> Result<String, String> {
    let path = project_file_path(&app, &project_id)?;
    let raw = fs::read_to_string(&path).map_err(|_| "project file not found".to_string())?;
    let use_hw = use_hardware_key.unwrap_or(false);
    let mut key = key_material(&passphrase, use_hw)?;
    let bytes = crypto::decrypt_envelope(&raw, &key)?;
    key.zeroize();
    String::from_utf8(bytes).map_err(|_| "project plaintext is not valid UTF-8".into())
}

/// List project ids that have encrypted files on disk.
#[tauri::command]
pub fn list_encrypted_projects(app: AppHandle) -> Result<Vec<String>, String> {
    list_project_ids(&app)
}

/// Remove an encrypted project file from local storage.
#[tauri::command]
pub fn delete_encrypted_project(app: AppHandle, project_id: String) -> Result<(), String> {
    let path = project_file_path(&app, &project_id)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Return the app-local storage directory (no secrets).
#[tauri::command]
pub fn get_projects_storage_path(app: AppHandle) -> Result<String, String> {
    storage_path_display(&app)
}

/// Whether hardware key mode is configured on this host.
#[tauri::command]
pub fn hardware_key_available() -> bool {
    hardware_key_enabled() && hardware_passphrase_material().is_ok()
}
