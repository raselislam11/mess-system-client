"use client";

import { useEffect, useState } from "react";
import type { AppUser } from "@/types";
import { getMe, logout } from "@/lib/auth";

// Loads the logged-in user from the server (JWT cookie based)
export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { user: me } = await getMe();
      setUser(me);
    } catch {
      setUser(null);
      // Stale/invalid cookie: clear it, otherwise middleware keeps
      // bouncing /login <-> /dashboard in a redirect loop
      await logout().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { user, loading, refresh };
}
