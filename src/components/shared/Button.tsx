"use client";

import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center px-4 py-2.5 text-base disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "btn-3d"
      : "btn-3d-ghost text-neutral-700 dark:text-neutral-200";

  return (
    <button
      className={`${base} ${styles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "অপেক্ষা করুন..." : children}
    </button>
  );
}
