"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  addBazarEntry,
  addExtraEntry,
  deleteBazarEntry,
  deleteExtraEntry,
  getBazarEntries,
  getCurrentMonth,
  getExtraEntries,
} from "@/lib/mess";
import type { BazarEntryData, ExtraEntryData } from "@/types";

export default function BazarPage() {
  const { user } = useAuth();
  const [monthId, setMonthId] = useState<string | null>(null);
  const [bazar, setBazar] = useState<BazarEntryData[]>([]);
  const [extra, setExtra] = useState<ExtraEntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // বাজার ফর্ম
  const [bazarDay, setBazarDay] = useState(() => Math.min(new Date().getDate(), 30));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // এক্সট্রা ফর্ম
  const [extraDay, setExtraDay] = useState(() => Math.min(new Date().getDate(), 30));
  const [extraType, setExtraType] = useState<"taka" | "chal">("taka");
  const [description, setDescription] = useState("");
  const [extraAmount, setExtraAmount] = useState("");

  const isAdmin = user?.role === "controller" || user?.role === "manager";

  const load = useCallback(async (month: string) => {
    try {
      const [bazarRes, extraRes] = await Promise.all([
        getBazarEntries(month),
        getExtraEntries(month),
      ]);
      setBazar(bazarRes.entries);
      setExtra(extraRes.entries);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "লোড হয়নি");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { month } = await getCurrentMonth();
        setMonthId(month.id);
        await load(month.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "লোড হয়নি");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const submitBazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthId) return;
    setSaving(true);
    try {
      await addBazarEntry(monthId, {
        day: bazarDay,
        amount: Number(amount),
        note,
      });
      toast.success("বাজার যোগ হয়েছে");
      setAmount("");
      setNote("");
      await load(monthId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "যোগ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const submitExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthId) return;
    setSaving(true);
    try {
      await addExtraEntry(monthId, {
        type: extraType,
        day: extraDay,
        description,
        amount: Number(extraAmount),
      });
      toast.success("এন্ট্রি যোগ হয়েছে");
      setDescription("");
      setExtraAmount("");
      await load(monthId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "যোগ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const removeBazar = async (id: string) => {
    if (!monthId) return;
    try {
      await deleteBazarEntry(monthId, id);
      toast.success("মুছে ফেলা হয়েছে");
      await load(monthId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছে ফেলা যায়নি");
    }
  };

  const removeExtra = async (id: string) => {
    if (!monthId) return;
    try {
      await deleteExtraEntry(monthId, id);
      toast.success("মুছে ফেলা হয়েছে");
      await load(monthId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছে ফেলা যায়নি");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto h-40 max-w-4xl animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">বাজার</h1>

      {isAdmin && (
        <form
          onSubmit={submitBazar}
          className="grid gap-4 card-3d p-4 sm:grid-cols-3"
        >
          <label className="text-sm">
            দিন
            <select
              value={bazarDay}
              onChange={(e) => setBazarDay(Number(e.target.value))}
              className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {[...Array(30)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            টাকা
            <input
              type="number"
              min={1}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm">
            নোট (অপশনাল)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-3d px-4 py-2.5"
            >
              বাজার যোগ করুন
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {bazar.length === 0 && (
          <li className="text-neutral-500">কোনো বাজার যোগ করা হয়নি।</li>
        )}
        {bazar.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800">
              দিন {entry.day}
            </span>
            <span className="font-semibold">{entry.amount} টাকা</span>
            {entry.note && (
              <span className="text-sm text-neutral-500">{entry.note}</span>
            )}
            {isAdmin && (
              <button
                onClick={() => removeBazar(entry.id)}
                className="ml-auto text-sm text-red-500 hover:underline"
              >
                মুছুন
              </button>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <>
          <h2 className="text-xl font-bold">এক্সট্রা (টাকা/চাল)</h2>
          <form
            onSubmit={submitExtra}
            className="grid gap-4 card-3d p-4 sm:grid-cols-4"
          >
            <label className="text-sm">
              ধরন
              <select
                value={extraType}
                onChange={(e) => setExtraType(e.target.value as "taka" | "chal")}
                className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="taka">টাকা</option>
                <option value="chal">চাল</option>
              </select>
            </label>
            <label className="text-sm">
              দিন
              <select
                value={extraDay}
                onChange={(e) => setExtraDay(Number(e.target.value))}
                className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                {[...Array(30)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              বিবরণ
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={200}
                className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="text-sm">
              পরিমাণ
              <input
                type="number"
                min={1}
                step="any"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                required
                className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <div className="sm:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="btn-3d px-4 py-2.5"
              >
                যোগ করুন
              </button>
            </div>
          </form>
        </>
      )}

      {extra.length > 0 && (
        <ul className="space-y-2">
          {extra.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800">
                দিন {entry.day}
              </span>
              <span className="font-semibold">
                {entry.amount} {entry.type === "taka" ? "টাকা" : "কেজি চাল"}
              </span>
              <span className="text-sm text-neutral-500">{entry.description}</span>
              {isAdmin && (
                <button
                  onClick={() => removeExtra(entry.id)}
                  className="ml-auto text-sm text-red-500 hover:underline"
                >
                  মুছুন
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
