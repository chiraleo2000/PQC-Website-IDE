/**
 * Typed IPC to the Tauri Rust backend — only these invoke targets exist.
 * Passphrases stay in the frontend memory briefly and are passed to Rust; they are never written to disk.
 */

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export function isTauriDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getProjectsStoragePath(): Promise<string> {
  return invoke<string>("get_projects_storage_path");
}

export async function listEncryptedProjects(): Promise<string[]> {
  return invoke<string[]>("list_encrypted_projects");
}

export async function readEncryptedProject(
  projectId: string,
  passphrase: string,
  useHardwareKey = false
): Promise<string> {
  return invoke<string>("read_encrypted_project", {
    projectId,
    passphrase,
    useHardwareKey,
  });
}

export async function writeEncryptedProject(
  projectId: string,
  plaintextJson: string,
  passphrase: string,
  useHardwareKey = false
): Promise<string> {
  return invoke<string>("write_encrypted_project", {
    projectId,
    plaintext: plaintextJson,
    passphrase,
    useHardwareKey,
  });
}

export async function deleteEncryptedProject(projectId: string): Promise<void> {
  return invoke<void>("delete_encrypted_project", { projectId });
}

export async function hardwareKeyAvailable(): Promise<boolean> {
  return invoke<boolean>("hardware_key_available");
}
