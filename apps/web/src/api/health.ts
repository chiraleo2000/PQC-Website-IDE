const API = import.meta.env.VITE_API_URL ?? "";

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
