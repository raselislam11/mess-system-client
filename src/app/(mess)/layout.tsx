"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { roleLabel } from "@/lib/permissions";
import ThemeToggle from "@/components/shared/ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "ড্যাশবোর্ড" },
  { href: "/manager", label: "ম্যানেজার" },
  { href: "/daily", label: "দৈনিক হিসাব" },
  { href: "/bazar", label: "বাজার" },
  { href: "/bazar-list", label: "বাজার লিস্ট" },
  { href: "/jorimana", label: "জরিমানা" },
  { href: "/extra", label: "এক্সট্রা খরচ" },
  { href: "/summary", label: "মাসিক হিসাব" },
  { href: "/members", label: "মেম্বারস" },
  { href: "/profile", label: "আমার প্রোফাইল" },
];

export default function MessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showAllNav, setShowAllNav] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // রুট বদলালে মোবাইলের বর্ধিত মেনু আবার বন্ধ করে দাও
  useEffect(() => {
    setShowAllNav(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-primary" />
      </div>
    );
  }

  const renderNavLink = (item: (typeof navItems)[number]) => {
    // "/bazar" আর "/bazar-list" আলাদা — শুধু হুবহু বা সাব-পাথ হলেই active
    const active =
      pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`btn-press px-2 py-1.5 text-center text-xs font-medium transition-colors sm:text-sm ${
          active
            ? "rounded-lg bg-white font-semibold text-brand shadow-sm"
            : "rounded-lg text-white/85 hover:bg-white/15"
        }`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-40 bg-brand px-3 py-2.5 text-white shadow-md md:top-0 md:h-screen md:w-48 md:overflow-y-auto md:px-3 md:py-3">
        <div className="mb-2 flex items-start justify-between gap-2 md:mb-3">
          <div>
            <Link
              href="/dashboard"
              className="text-base font-bold hover:opacity-80 md:text-lg"
              title="ড্যাশবোর্ডে যান"
            >
              {user.messName}
            </Link>
            <p className="text-xs text-white/75 md:text-sm">
              {user.name} — {roleLabel(user.role)}
            </p>
            {/* মালিকের ইমেইল */}
            <a
              href="mailto:islammdrasel739@gmail.com"
              className="mt-0.5 block text-[11px] text-white/60 hover:text-white md:text-xs"
            >
              islammdrasel739@gmail.com
            </a>
          </div>
          <ThemeToggle />
        </div>
        {/* মোবাইল: এক সারিতে ৩টি করে লিংক, বাকিগুলো ☰ চাপলে দেখা যাবে */}
        <nav className="md:hidden">
          <div className="grid grid-cols-4 gap-1.5">
            {navItems.slice(0, 3).map(renderNavLink)}
            <button
              onClick={() => setShowAllNav((v) => !v)}
              aria-label={showAllNav ? "মেনু বন্ধ করুন" : "আরও মেনু দেখুন"}
              className="btn-press rounded-lg border border-white/25 px-2 py-1.5 text-center text-sm leading-none text-white hover:bg-white/15"
            >
              {showAllNav ? "✕" : "☰"}
            </button>
          </div>
          {showAllNav && (
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {navItems.slice(3).map(renderNavLink)}
            </div>
          )}
        </nav>

        {/* ডেস্কটপ: সাইডবার মেনু */}
        <nav className="hidden flex-col gap-1.5 md:flex">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`btn-press px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "rounded-lg bg-white font-semibold text-brand shadow-sm"
                    : "rounded-lg text-white/85 hover:bg-white/15"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-4 md:p-8">{children}</main>
        {/* ফুটার — একই স্ট্যান্ডার্ড রঙ */}
        <footer className="border-t border-white/10 bg-brand px-4 py-3 text-center text-white md:px-8">
          <p className="text-xs md:text-sm">
            Developed by{" "}
            <span className="font-semibold">Rasel and Delower</span>
          </p>
          <a
            href="mailto:islammdrasel739@gmail.com"
            className="text-[11px] text-white/60 hover:text-white md:text-xs"
          >
            islammdrasel739@gmail.com
          </a>
        </footer>
      </div>
    </div>
  );
}
