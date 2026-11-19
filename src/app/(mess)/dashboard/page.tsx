"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentMonth, getMonthSummary } from "@/lib/mess";
import { roleLabel } from "@/lib/permissions";
import type { MonthSummary } from "@/types";

const POLL_MS = 20000; // সার্ভার থেকে ২০ সেকেন্ড পরপর হিসাব রিফ্রেশ

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    try {
      const { month } = await getCurrentMonth();
      const data = await getMonthSummary(month.id);
      setSummary(data);
    } catch (err) {
      if (!silent) {
        toast.error(err instanceof Error ? err.message : "হিসাব লোড হয়নি");
      }
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // রিয়েল-টাইম: অন্য কেউ হিসাব বদলালে নিজে থেকেই আপডেট দেখা যায়
    const timer = setInterval(() => void load(true), POLL_MS);
    const onFocus = () => void load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">{user?.messName}</h1>
      <p className="mt-1 text-neutral-500">
        {user?.name} — {user ? roleLabel(user.role) : ""}
      </p>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      ) : summary ? (
        <>
          <p className="mt-4 text-sm text-neutral-500">
            চলতি মাস: <span className="font-medium">{summary.month.label}</span>
          </p>
          {/* ড্যাশবোর্ডে ম্যানেজারের কাছে মোট টাকা ও চাল — আগের সব মাস সহ */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="card-3d p-5">
              <p className="text-sm text-neutral-500">
                ম্যানেজারের কাছে টাকা
              </p>
              {(() => {
                const managerTaka =
                  summary.grandTotals?.managerTaka ?? summary.totals.balance;
                return (
                  <>
                    <p
                      className={`mt-2 text-3xl font-bold ${
                        managerTaka < 0 ? "text-red-500" : "text-primary"
                      }`}
                    >
                      {managerTaka < 0 ? "−" : ""}৳{Math.abs(managerTaka)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {managerTaka < 0 ? "দেনা" : "জমা"} — আগের সব মাস সহ
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      এই মাসে:{" "}
                      {summary.totals.balance < 0 ? "−" : ""}৳
                      {Math.abs(summary.totals.balance)}
                    </p>
                  </>
                );
              })()}
            </div>
            <div className="card-3d p-5">
              <p className="text-sm text-neutral-500">
                ম্যানেজারের কাছে চাল (পট)
              </p>
              {(() => {
                const managerChal =
                  summary.grandTotals?.managerChal ?? summary.totals.chalBalance;
                return (
                  <>
                    <p
                      className={`mt-2 text-3xl font-bold ${
                        managerChal < 0 ? "text-red-500" : "text-primary"
                      }`}
                    >
                      {managerChal < 0 ? "−" : ""}
                      {Math.abs(managerChal)} পট
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {managerChal < 0 ? "দেনা" : "জমা"} — আগের সব মাস সহ
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      এই মাসে: {summary.totals.chalBalance} পট
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-8 text-neutral-500">হিসাব দেখার জন্য কোনো খোলা মাস নেই।</p>
      )}
    </div>
  );
}
