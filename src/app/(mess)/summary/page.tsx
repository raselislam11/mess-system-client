"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  closeMonth,
  createMonth,
  getMonthSummary,
  listMonths,
  reopenMonth,
} from "@/lib/mess";
import type { MonthInfo, MonthSummary } from "@/types";

const POLL_MS = 20000; // সার্ভার থেকে ২০ সেকেন্ড পরপর হিসাব রিফ্রেশ

export default function SummaryPage() {
  const { user } = useAuth();
  const [months, setMonths] = useState<MonthInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "controller" || user?.role === "manager";

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

  // রিয়েল-টাইম: সিলেক্টেড মাসের হিসাব ২০ সেকেন্ড পরপর ও ফোকাসে রিফ্রেশ
  useEffect(() => {
    if (!selected) return;
    const timer = setInterval(() => void loadSummary(selected), POLL_MS);
    const onFocus = () => void loadSummary(selected);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [selected, loadSummary]);

  const pickMonth = async (id: string) => {
    setSelected(id);
    setSummary(null);
    await loadSummary(id);
  };

  // নতুন মাসের লেবেল = যে মাস সিলেক্টেড তার পরের মাস (নইলে চলতি মাস)
  const openNextMonth = async () => {
    const current =
      months.find((m) => m.id === selected)?.label ??
      new Date().toISOString().slice(0, 7);
    const [year, month] = current.split("-").map(Number);
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
    if (!selected) return;
    try {
      await closeMonth(selected);
      toast.success("মাস বন্ধ হয়েছে");
      await loadMonths();
      await loadSummary(selected);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "বন্ধ করা যায়নি");
    }
  };

  // বন্ধ মাস আবার খোলা
  const reopenCurrent = async () => {
    if (!selected) return;
    try {
      await reopenMonth(selected);
      toast.success("মাস খোলা হয়েছে");
      await loadMonths();
      await loadSummary(selected);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "খোলা যায়নি");
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
        {isAdmin && <CreateFirstMonth onCreated={async () => {
          const data = await loadMonths();
          const open = data.find((m) => m.status === "open") ?? data[0];
          if (open) {
            setSelected(open.id);
            await loadSummary(open.id);
          }
        }} />}
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
          {/* শুধু কন্ট্রোলার ও ম্যানেজার: মাস বন্ধ/খোলা ও নতুন মাস */}
          {isAdmin && (
            <>
              {summary?.month.status === "open" ? (
                <button
                  onClick={closeCurrent}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                >
                  মাস বন্ধ করুন
                </button>
              ) : (
                selected && (
                  <button
                    onClick={reopenCurrent}
                    className="rounded-lg border border-green-600 px-3 py-2 text-sm text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
                  >
                    মাস খুলুন
                  </button>
                )
              )}
              <button
                onClick={openNextMonth}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                নতুন মাস খুলুন
              </button>
            </>
          )}
        </div>
      </div>

      {!summary ? (
        <p className="mt-8 text-neutral-500">হিসাব লোড হয়নি।</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Card
              label="আগের সব মাস থেকে জমা (ম্যানেজার)"
              value={summary.carryOver?.managerTaka ?? 0}
            />
            <Card label="বাজার খরচ" value={summary.totals.bazar} />
            <Card label="এক্সট্রা টাকা" value={summary.totals.extraTaka} />
            <Card
              label={summary.totals.balance >= 0 ? "থাকা (জমা)" : "দেনা"}
              value={Math.abs(summary.totals.balance)}
            />
            <Card
              label="ম্যানেজারের কাছে মোট টাকা"
              value={
                (summary.grandTotals?.managerTaka ??
                  summary.totals.balance + (summary.carryOver?.managerTaka ?? 0))
              }
              highlight
            />
            <Card
              label={
                summary.totals.chalBalance >= 0
                  ? "চাল থাকা/জমা (পট)"
                  : "চাল দেনা (পট)"
              }
              value={Math.abs(summary.totals.chalBalance)}
            />
            <Card
              label="ম্যানেজারের কাছে মোট চাল (পট)"
              value={summary.grandTotals?.managerChal ?? summary.totals.chalBalance}
            />
            <Card
              label="এক জনের এক্সট্রা ভাগ"
              value={summary.rows[0]?.extraTakaShare ?? 0}
            />
          </div>

          {/* প্রতিটা ইউজারের মাসের হিসাব — ম্যানেজার সেকশনের ডেটা থেকে সরাসরি হিসাব হয় */}
          <div className="mt-6 space-y-4">
            {summary.rows.map((row) => {
              // টাকা আছে = জমা − খরচ − এক্সট্রা খরচের নিজের ভাগ
              const takaRemaining =
                row.takaGiven - row.mealTakaTotal - row.extraTakaShare;
              const chalRemaining =
                row.chalGiven - row.chalUsedTotal - row.extraChalShare;
              // মোট টাকা আছে = এই মাসের বাকি + আগের সব মাস থেকে ক্যারি
              const totalTakaRemaining = takaRemaining + row.carryOverTaka;
              return (
                <div
                  key={row.memberId}
                  className="card-3d p-4"
                >
                  <p className="font-medium">{row.name}</p>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat
                      label="টাকা দিয়েছে (৳)"
                      value={row.takaGiven}
                      highlight
                    />
                    <MiniStat label="টাকা খরচ (৳)" value={row.mealTakaTotal} />
                    <MiniStat
                      label="এক্সট্রা ভাগ (৳)"
                      value={row.extraTakaShare}
                    />
                    <MiniStat
                      label="টাকা আছে (৳)"
                      value={takaRemaining}
                      danger={takaRemaining < 0}
                    />
                    <MiniStat
                      label="আগের মাস থেকে জমা (৳)"
                      value={row.carryOverTaka ?? 0}
                    />
                    <MiniStat
                      label="মোট টাকা আছে (৳)"
                      value={totalTakaRemaining}
                      highlight
                      danger={totalTakaRemaining < 0}
                    />
                    <MiniStat label="চাল দিয়েছে (পট)" value={row.chalGiven} />
                    <MiniStat label="চাল খরচ (পট)" value={row.chalUsedTotal} />
                    <MiniStat
                      label="এক্সট্রা চাল ভাগ (পট)"
                      value={row.extraChalShare}
                    />
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

function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="card-3d p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

// প্রথম মাস তৈরি — শুধু কন্ট্রোলার/ম্যানেজার
function CreateFirstMonth({ onCreated }: { onCreated: () => Promise<void> }) {
  const [label, setLabel] = useState(new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!/^\d{4}-\d{2}$/.test(label)) {
      toast.error("মাসের ফরম্যাট হবে যেমন 2026-11");
      return;
    }
    setBusy(true);
    try {
      await createMonth(label);
      toast.success(`${label} মাস শুরু হয়েছে`);
      await onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মাস খোলা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="first-month-label" className="mb-1 block text-sm font-medium">
          মাস
        </label>
        <input
          id="first-month-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="2026-11"
          className="input-3d px-3 py-2 text-base"
        />
      </div>
      <button
        onClick={create}
        disabled={busy}
        className="btn-3d px-4 py-2 text-sm"
      >
        {busy ? "অপেক্ষা করুন..." : "নতুন মাস শুরু করুন"}
      </button>
    </div>
  );
}
