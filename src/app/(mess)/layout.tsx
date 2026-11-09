"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth";
import { roleLabel } from "@/lib/permissions";
import ThemeToggle from "@/components/shared/ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "ড্যাশবোর্ড" },
  { href: "/manager", label: "ম্যানেজার" },
  { href: "/daily", label: "দৈনিক হিসাব" },
  { href: "/bazar", label: "বাজার" },
  { href: "/summary", label: "মাসিক হিসাব" },
  { href: "/members", label: "মেম্বারস" },
];

export default function MessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const out = async () => {
    try {
      await logout();
      toast.success("লগআউট হয়েছে");
      router.replace("/login");
    } catch {
      toast.error("লগআউট করা যায়নি");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-neutral-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900 md:w-56 md:border-b-0 md:border-r">
        <div className="mb-4">
          <p className="text-lg font-bold">{user.messName}</p>
          <p className="text-sm text-neutral-500">
            {user.name} — {roleLabel(user.role)}
          </p>
        </div>
        <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`btn-press shrink-0 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "nav-active-3d"
                    : "rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 flex items-center gap-2 md:flex-col md:items-stretch">
          <ThemeToggle />
          <button
            onClick={out}
            className="btn-3d-ghost w-full rounded-lg px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 md:w-auto"
          >
            লগআউট
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
