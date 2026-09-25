export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tfe_token");
}

export function setToken(token: string) {
  localStorage.setItem("tfe_token", token);
}

export function clearToken() {
  localStorage.removeItem("tfe_token");
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.location.href = "/login";
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ---- Types mirroring the FastAPI schemas ----

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  api_key: string;
  allowed_domains: string;
  is_active: boolean;
  created_at: string;
}

export interface Placement {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  desktop_width: number;
  desktop_height: number;
  tablet_height: number;
  mobile_height: number;
  is_active: boolean;
}

export interface Ad {
  id: string;
  placement_id: string;
  title: string;
  image_url: string;
  target_url: string;
  alt_text: string;
  is_active: boolean;
  sort_order: number;
  start_at: string | null;
  end_at: string | null;
  open_in_new_tab: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdStats {
  ad_id: string;
  title: string;
  impressions: number;
  clicks: number;
  ctr: number;
}
