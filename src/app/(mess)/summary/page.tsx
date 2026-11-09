"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  closeMonth,
  createMonth,
  getMonthSummary,
  listMonths,
} from "@/lib/mess";
import type { MonthInfo, MonthSummary } from "@/types";

export default function SummaryPage() {
  const { user } = useAuth();
  const [months, setMonths] = useState<MonthInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "controller" || user?.role === "manager";
  const isController = user?.role === "controller";

  const loadMonths = useCallback(async () => {
    const { months: data } = await listMonths();
    setMonths(data);
    return data;
  }, []);

  const loadSummary = useCallback(async (monthId: string) => {
    try {
      const data = await getMonthSummary(monthId);
      setSummary(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "লোড হয়নি");
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadMonths();
        const open = data.find((m) => m.status === "open") ?? data[0];
        if (open) {
          setSelected(open.id);
          await loadSummary(open.id);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "লোড হয়নি");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMonths, loadSummary]);

  const pickMonth = async (id: string) => {
    setSelected(id);
    setSummary(null);
    await loadSummary(id);
  };

  const openNextMonth = async () => {
    if (!summary) return;
    const [year, month] = summary.month.label.split("-").map(Number);
    const next = new Date(year, month, 1); // month is already next (0-indexed)
    const label = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    try {
      const { month: created } = await createMonth(label);
      toast.success(`${label} মাস খোলা হয়েছে`);
      await loadMonths();
      await pickMonth(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মাস খোলা যায়নি");
    }
  };

  const closeCurrent = async () => {
    if (!selected || !summary) return;
    try {
      await closeMonth(selected);
      toast.success("মাস বন্ধ হয়েছে");
      await loadMonths();
      await loadSummary(selected);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "বন্ধ করা যায়নি");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto h-40 max-w-5xl animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
    );
  }

  if (months.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">মাসিক হিসাব</h1>
        <p className="mt-4 text-neutral-500">কোনো মাস তৈরি করা হয়নি।</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">মাসিক হিসাব</h1>
        <div className="flex items-center gap-2">
          <select
            value={selected ?? ""}
            onChange={(e) => pickMonth(e.target.value)}
            className="input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.status === "open" ? "খোলা" : "বন্ধ"}
              </option>
            ))}
          </select>
          {isAdmin && summary && summary.month.status === "open" && (
            <>
              <button
                onClick={openNextMonth}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                নতুন মাস খুলুন
              </button>
              {isController && (
                <button
                  onClick={closeCurrent}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                >
                  মাস বন্ধ করুন
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!summary ? (
        <p className="mt-8 text-neutral-500">হিসাব লোড হয়নি।</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Card label="বাজার খরচ" value={summary.totals.bazar} />
            <Card label="এক্সট্রা টাকা" value={summary.totals.extraTaka} />
            <Card label="সদস্যদের টাকা" value={summary.totals.takaGiven} />
            <Card
              label={summary.totals.balance >= 0 ? "থাকা (জমা)" : "দেনা"}
              value={Math.abs(summary.totals.balance)}
            />
            <Card label="চাল দিলো (পট)" value={summary.totals.chalGiven + summary.totals.extraChal} />
            <Card label="চাল খরচ (পট)" value={summary.totals.chalUsed} />
            <Card label="মিলের টাকা মোট" value={summary.rows.reduce((s, r) => s + r.mealTakaTotal, 0)} />
            <Card label="এক জনের বাজার ভাগ" value={summary.suggestedMessShare} />
          </div>

          {/* প্রতিটা ইউজারের মাসের হিসাব — ম্যানেজার সেকশনের ডেটা থেকে সরাসরি হিসাব হয় */}
          <div className="mt-6 space-y-4">
            {summary.rows.map((row) => {
              const takaRemaining = row.takaGiven - row.mealTakaTotal;
              const chalRemaining = row.chalGiven - row.chalUsedTotal;
              return (
                <div
                  key={row.memberId}
                  className="card-3d p-4"
                >
                  <p className="font-medium">{row.name}</p>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <MiniStat
                      label="টাকা দিয়েছে (৳)"
                      value={row.takaGiven}
                      highlight
                    />
                    <MiniStat label="টাকা খরচ (৳)" value={row.mealTakaTotal} />
                    <MiniStat
                      label="টাকা আছে (৳)"
                      value={takaRemaining}
                      danger={takaRemaining < 0}
                    />
                    <MiniStat label="চাল দিয়েছে (পট)" value={row.chalGiven} />
                    <MiniStat label="চাল খরচ (পট)" value={row.chalUsedTotal} />
                    <MiniStat
                      label="চাল আছে (পট)"
                      value={chalRemaining}
                      danger={chalRemaining < 0}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
      <p className="text-xs text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 font-bold ${
          danger ? "text-red-500" : highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-3d p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
