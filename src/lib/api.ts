// Same-origin request: Next.js rewrites "/api/*" to the Express server
// (next.config.mjs), so the auth cookie is stored on this domain.
// (vercel.app is a public suffix — a cookie set by another *.vercel.app
// subdomain would be third-party and the browser would not keep it.)
export const API_BASE = "";

// Error with HTTP status so callers can tell 401 (really logged out)
// apart from a network/500 hiccup.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// A single fetch wrapper: JSON body, credentials (cookies), Bangla error messages
type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network failure (offline, server down) — not an auth problem
    throw new ApiError("নেটওয়ার্কে সমস্যা হয়েছে। আবার চেষ্টা করুন।", 0);
  }

  const data = (await res.json().catch(() => ({}))) as T & { message?: string };

  if (!res.ok) {
    throw new ApiError(
      data.message || "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।",
      res.status
    );
  }
  return data as T;
}
