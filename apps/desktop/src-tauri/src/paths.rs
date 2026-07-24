//! Resolve and validate project paths under the app data directory (no arbitrary paths from IPC).

use std::path::{Path, PathBuf};
use tauri::Manager;

const PROJECT_FILE_SUFFIX: &str = ".pqc.enc";

pub fn projects_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let root = base.join("projects");
    std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root)
}

/// Only UUID-like project ids — blocks `../` traversal via IPC.
pub fn sanitize_project_id(project_id: &str) -> Result<String, String> {
    let ok = project_id.len() >= 8
        && project_id.len() <= 64
        && project_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-');
    if !ok {
        return Err("invalid project id".into());
    }
    Ok(project_id.to_string())
}

pub fn project_file_path(app: &tauri::AppHandle, project_id: &str) -> Result<PathBuf, String> {
    let id = sanitize_project_id(project_id)?;
    let root = projects_root(app)?;
    let path = root.join(format!("{id}{PROJECT_FILE_SUFFIX}"));

    // Canonicalize parent and ensure file stays under root
    let canonical_root = root
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("invalid path")?;
    let resolved = canonical_root.join(file_name);
    if !resolved.starts_with(&canonical_root) {
        return Err("path escapes storage root".into());
    }
    Ok(resolved)
}

pub fn list_project_ids(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let root = projects_root(app)?;
    let mut ids = Vec::new();
    let entries = std::fs::read_dir(&root).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if let Some(id) = name.strip_suffix(PROJECT_FILE_SUFFIX) {
            if sanitize_project_id(id).is_ok() {
                ids.push(id.to_string());
            }
        }
    }
    ids.sort();
    Ok(ids)
}

pub fn storage_path_display(app: &tauri::AppHandle) -> Result<String, String> {
    projects_root(app).map(|p| p.to_string_lossy().into_owned())
}

#[allow(dead_code)]
pub fn is_under_projects_root(root: &Path, path: &Path) -> bool {
    path.canonicalize()
        .ok()
        .zip(root.canonicalize().ok())
        .map(|(p, r)| p.starts_with(r))
        .unwrap_or(false)
}
