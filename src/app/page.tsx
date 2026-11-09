"use client";

import Link from "next/link";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <h1 className="text-4xl font-bold text-primary dark:text-green-400 sm:text-5xl">
        মেস ম্যানেজার
      </h1>
      <p className="mt-3 max-w-md text-neutral-600 dark:text-neutral-300">
        নিজের মেসের দৈনিক টাকা, চাল, বিল ও জরিমানার হিসাব সহজে রাখুন
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link href="/create-mess" className="btn-3d px-4 py-3 text-base">
          নতুন মেস তৈরি করুন
        </Link>
        <Link
          href="/login"
          className="btn-3d-ghost px-4 py-3 text-base text-neutral-700 dark:text-neutral-200"
        >
          লগইন করুন
        </Link>
      </div>
    </main>
  );
}
