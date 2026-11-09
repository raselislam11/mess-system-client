"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentMonth, getMonthSummary } from "@/lib/mess";
import { roleLabel } from "@/lib/permissions";
import type { MonthSummary } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { month } = await getCurrentMonth();
        const data = await getMonthSummary(month.id);
        setSummary(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          toast.error(
            err instanceof Error ? err.message : "হিসাব লোড হয়নি"
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const cards = summary
    ? [
        { label: "সদস্যদের টাকা", value: summary.totals.takaGiven + summary.totals.extraTaka },
        { label: "বাজার খরচ", value: summary.totals.bazar },
        {
          label: "থাকা/জমা",
          value: summary.totals.balance,
        },
        { label: "চাল (কেজি)", value: summary.totals.chalGiven + summary.totals.extraChal },
      ]
    : [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">{user?.messName}</h1>
      <p className="mt-1 text-neutral-500">
        {user?.name} — {user ? roleLabel(user.role) : ""}
      </p>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      ) : summary ? (
        <>
          <p className="mt-4 text-sm text-neutral-500">
            চলতি মাস: <span className="font-medium">{summary.month.label}</span>
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="card-3d p-4"
              >
                <p className="text-sm text-neutral-500">{card.label}</p>
                <p className="mt-1 text-xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/daily"
              className="btn-3d px-4 py-2 text-sm"
            >
              দৈনিক হিসাব লিখুন
            </Link>
            <Link
              href="/summary"
              className="btn-press rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              মাসিক হিসাব দেখুন
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-8 text-neutral-500">হিসাব দেখার জন্য কোনো খোলা মাস নেই।</p>
      )}
    </div>
  );
}
