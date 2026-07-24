mod commands;
mod crypto;
mod paths;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::write_encrypted_project,
            commands::read_encrypted_project,
            commands::list_encrypted_projects,
            commands::delete_encrypted_project,
            commands::get_projects_storage_path,
            commands::hardware_key_available,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
