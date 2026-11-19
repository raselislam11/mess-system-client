"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  getCurrentMonth,
  getExtraEntries,
  addExtraEntry,
  deleteExtraEntry,
  getMonthSummary,
} from "@/lib/mess";
import type { ExtraEntryData, MonthSummary } from "@/types";

const POLL_MS = 20000; // সার্ভার থেকে ২০ সেকেন্ড পরপর হিসাব রিফ্রেশ

// এক্সট্রা খরচ — কন্ট্রোলার/ম্যানেজার যোগ করে, সবাই দেখতে পারে
export default function ExtraPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "controller" || user?.role === "manager";

  const [monthId, setMonthId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ExtraEntryData[]>([]);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<"taka" | "chal">("taka");
  const [day, setDay] = useState(() => Math.min(new Date().getDate(), 30));
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { month } = await getCurrentMonth();
      setMonthId(month.id);
      const [extraRes, summaryRes] = await Promise.all([
        getExtraEntries(month.id),
        getMonthSummary(month.id),
      ]);
      setEntries(extraRes.entries);
      setSummary(summaryRes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "লোড হয়নি");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // রিয়েল-টাইম: ২০ সেকেন্ড পরপর ও ফোকাসে রিফ্রেশ
    const timer = setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthId) return;
    const amountNum = Number(amount);
    if (!note.trim()) {
      toast.error("নোট লিখুন");
      return;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error(type === "taka" ? "টাকার পরিমাণ দিন" : "চালের পরিমাণ দিন");
      return;
    }
    setSaving(true);
    try {
      await addExtraEntry(monthId, {
        type,
        day,
        description: note.trim(),
        amount: amountNum,
      });
      toast.success("যোগ হয়েছে");
      setNote("");
      setAmount("");
      // যোগ করার সাথে সাথে মোট ও বাকি হিসাব রিফ্রেশ
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "যোগ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: ExtraEntryData) => {
    if (!monthId) return;
    setDeletingId(entry.id);
    try {
      await deleteExtraEntry(monthId, entry.id);
      toast.success("মুছে ফেলা হয়েছে");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছে ফেলা যায়নি");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto h-40 max-w-4xl animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
    );
  }

  const takaEntries = entries.filter((e) => e.type === "taka");
  const chalEntries = entries.filter((e) => e.type === "chal");

  // সার্ভারে হিসাব হয়ে আসে — ম্যানেজারের কাছে যা আসলে থাকে
  const takaBalance = summary?.totals.balance ?? 0;
  const chalBalance = summary?.totals.chalBalance ?? 0;

  const list = (items: ExtraEntryData[], entryType: "taka" | "chal") => (
    <div className="card-3d p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">
          {entryType === "taka" ? "টাকা" : "চাল"} খরচ
        </h2>
        <span className="text-sm text-neutral-500">
          মোট:{" "}
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {entryType === "taka"
              ? `৳${summary?.totals.extraTaka ?? 0}`
              : `${summary?.totals.extraChal ?? 0} পট`}
          </span>
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">কোনো খরচ যোগ হয়নি।</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">
                  <span className="font-medium">দিন {e.day}:</span> {e.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-medium">
                  {entryType === "taka" ? `৳${e.amount}` : `${e.amount} পট`}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => remove(e)}
                    disabled={deletingId === e.id}
                    aria-label="মুছে ফেলুন"
                    className="btn-press rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    {deletingId === e.id ? "..." : "মুছুন"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">এক্সট্রা খরচ</h1>
      <p className="mt-1 text-sm text-neutral-500">
        মেসের বাড়তি টাকা ও চালের খরচ। {isAdmin ? "যোগ ও মুছতে পারবেন।" : "শুধু দেখতে পারবেন।"}
      </p>

      {/* রিয়েল-টাইম হিসাব — সব সেকশন কানেক্টেড, সার্ভারে হিসাব হয় */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card-3d p-4">
          <p className="text-sm text-neutral-500">টাকা থাকা/জমা</p>
          <p
            className={`mt-1 text-lg font-bold ${
              takaBalance < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"
            }`}
          >
            ৳{takaBalance}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            জমা {summary?.totals.takaGiven ?? 0} − মিল {summary?.totals.mealTaka ?? 0} − বাজার{" "}
            {summary?.totals.bazar ?? 0} − এক্সট্রা {summary?.totals.extraTaka ?? 0}
          </p>
        </div>
        <div className="card-3d p-4">
          <p className="text-sm text-neutral-500">চাল থাকা/জমা (পট)</p>
          <p
            className={`mt-1 text-lg font-bold ${
              chalBalance < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"
            }`}
          >
            {chalBalance} পট
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            জমা {summary?.totals.chalGiven ?? 0} − খরচ {summary?.totals.chalUsed ?? 0} − এক্সট্রা{" "}
            {summary?.totals.extraChal ?? 0} পট
          </p>
        </div>
      </div>

      {isAdmin && (
        <form onSubmit={submit} className="card-3d mt-6 p-4">
          <p className="font-medium">নতুন খরচ যোগ করুন</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="text-xs text-neutral-500">
              ধরন
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "taka" | "chal")}
                className="input-3d mt-1 w-full px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="taka">টাকা</option>
                <option value="chal">চাল</option>
              </select>
            </label>
            <label className="text-xs text-neutral-500">
              তারিখ (দিন)
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="input-3d mt-1 w-full px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                {[...Array(30)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-neutral-500">
              নোট
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="কী খরচ হলো"
                className="input-3d mt-1 w-full px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="text-xs text-neutral-500">
              {type === "taka" ? "টাকা (৳)" : "চাল (পট)"}
              <input
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-3d mt-1 w-full px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
          </div>
          <button type="submit" disabled={saving} className="btn-3d mt-4 px-4 py-2 text-sm">
            {saving ? "..." : "+ যোগ করুন"}
          </button>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {list(takaEntries, "taka")}
        {list(chalEntries, "chal")}
      </div>
    </div>
  );
}
