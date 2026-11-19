"use client";

import { useEffect, useState } from "react";
import type { AppUser } from "@/types";
import { getMe, logout } from "@/lib/auth";
import { ApiError } from "@/lib/api";

// Loads the logged-in user from the server (JWT cookie based)
export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { user: me } = await getMe();
      setUser(me);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 401 || status === 403) {
        // সত্যিকারের ইনভ্যালিড সেশন — পুরনো কুকি পরিষ্কার করে লগআউট,
        // নইলে middleware /login <-> /dashboard লুপ বানায়
        setUser(null);
        await logout().catch(() => {});
      } else {
        // নেটওয়ার্ক/সার্ভার সমস্যা — কুকি মুছবেন না, শুধু ইউজার দেখাবেন না
        // (পরে রিফ্রেশ করলে আবার চেষ্টা হবে)
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { user, loading, refresh };
}
