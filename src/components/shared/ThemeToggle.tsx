"use client";

import { useEffect, useState } from "react";

// লাইট/ডার্ক থিম টগল — ডিফল্ট লাইট, পছন্দ localStorage-এ থাকে
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label="থিম বদলান"
      title={dark ? "লাইট থিম" : "ডার্ক থিম"}
      className="btn-3d-ghost inline-flex h-9 w-9 items-center justify-center !rounded-full text-lg"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
