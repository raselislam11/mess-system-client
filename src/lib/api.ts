export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// A single fetch wrapper: JSON body, credentials (cookies), Bangla error messages
type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as T & { message?: string };

  if (!res.ok) {
    const err = new Error(data.message || "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।");
    throw err;
  }
  return data as T;
}
