"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteDailyEntry,
  getDailyEntries,
  getCurrentMonth,
  listMembers,
  listMonths,
  upsertDailyEntry,
} from "@/lib/mess";
import type { DailyEntryData, MonthInfo } from "@/types";

const WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

// মাসের লেবেল (যেমন 2026-11) আর দিন নম্বর থেকে বার বের করা (UTC-ভিত্তিক)
function weekday(label: string, day: number) {
  const d = new Date(`${label}-01T00:00:00Z`);
  d.setUTCDate(day);
  return WEEKDAYS[d.getUTCDay()];
}

export default function MemberLedgerPage({
  params,
}: {
  params: { memberId: string };
}) {
  const { user } = useAuth();
  const memberId = params.memberId;
  const isAdmin = user?.role === "controller" || user?.role === "manager";

  const [memberName, setMemberName] = useState("");
  const [months, setMonths] = useState<MonthInfo[]>([]);
  const [monthIndex, setMonthIndex] = useState<number | null>(null);
  const [entries, setEntries] = useState<DailyEntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [formAmount, setFormAmount] = useState("0");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  // উপরের বক্সসমূহ: আজকের জমা ও আজকের মিল খরচ লেখার জন্য
  const [today] = useState(() => Math.min(new Date().getDate(), 30));
  const [boxAmount, setBoxAmount] = useState("");
  const [boxNote, setBoxNote] = useState("");
  const [kboxAmount, setKboxAmount] = useState("");
  const [kEditingDay, setKEditingDay] = useState<number | null>(null);
  const [kFormAmount, setKFormAmount] = useState("0");
  // চালের বক্সসমূহ (জমা + খরচ)
  const [cboxAmount, setCboxAmount] = useState("");
  const [cEditingDay, setCEditingDay] = useState<number | null>(null);
  const [cFormAmount, setCFormAmount] = useState("0");
  const [ckMorning, setCkMorning] = useState("");
  const [ckNoon, setCkNoon] = useState("");
  const [ckNight, setCkNight] = useState("");
  const [ckEditingDay, setCkEditingDay] = useState<number | null>(null);
  const [ckForm, setCkForm] = useState<[string, string, string]>(["0", "0", "0"]);

  // কোন সদস্য তা বের করা + মাসের তালিকা
  useEffect(() => {
    (async () => {
      try {
        const [membersRes, monthsRes] = await Promise.all([
          isAdmin ? listMembers() : Promise.resolve(null),
          listMonths(),
        ]);

        let name = user?.name ?? "";
        if (membersRes) {
          const found = membersRes.members.find((m) => m.id === memberId);
          if (found) name = found.name;
        } else {
          // মেম্বার অন্যের পেজে ঢুকলে সার্ভার শুধু নিজের এন্ট্রি দেবে
          name = user?.name ?? "";
        }
        setMemberName(name || "পুরোনো মেম্বার");

        const sorted = [...monthsRes.months].sort((a, b) =>
          b.label.localeCompare(a.label)
        );
        setMonths(sorted);
        try {
          const { month } = await getCurrentMonth();
          const idx = sorted.findIndex((m) => m.id === month.id);
          setMonthIndex(idx >= 0 ? idx : 0);
        } catch {
          setMonthIndex(sorted.length ? 0 : -1);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "লোড হয়নি");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const month = monthIndex != null && monthIndex >= 0 ? months[monthIndex] : null;

  const load = useCallback(async (monthId: string) => {
    try {
      const { entries: list } = await getDailyEntries(monthId, undefined, memberId);
      setEntries(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "লোড হয়নি");
    }
  }, [memberId]);

  useEffect(() => {
    if (month) void load(month.id);
  }, [month, load]);

  const byDay = useMemo(() => {
    const map = new Map<number, DailyEntryData>();
    for (const e of entries) map.set(e.day, e);
    return map;
  }, [entries]);

  const stats = useMemo(() => {
    let total = 0;
    let days = 0;
    let mealExpense = 0;
    for (const e of entries) {
      total += e.takaGiven;
      mealExpense += e.mealTaka[0] + e.mealTaka[1] + e.mealTaka[2];
      if (e.takaGiven > 0) days += 1;
    }
    return { total, days, mealExpense, remaining: total - mealExpense };
  }, [entries]);

  // চালের হিসাব: মোট জমা, মোট খরচ, অবশিষ্ট
  const chalStats = useMemo(() => {
    let given = 0;
    let used = 0;
    for (const e of entries) {
      given += e.chalGiven;
      used += e.chalUsed[0] + e.chalUsed[1] + e.chalUsed[2];
    }
    return { given, used, remaining: given - used };
  }, [entries]);

  // আজকের চাল খরচের ৩ বক্সের যোগফল (সকাল + দুপুর + রাত)
  const ckTodayTotal = [ckMorning, ckNoon, ckNight].reduce(
    (s, v) => s + (Number(v) || 0),
    0
  );

  // কোনো দিনের মিল খরচ = ৩ বক্সের যোগফল
  const khorochOf = (e?: DailyEntryData) =>
    e ? e.mealTaka[0] + e.mealTaka[1] + e.mealTaka[2] : 0;

  // শুধু যে দিনে টাকা জমা আছে সেগুলোর বক্স দেখাবে
  const takaEntries = useMemo(
    () => entries.filter((e) => e.takaGiven > 0 || e.takaNote),
    [entries]
  );
  // শুধু যে দিনে মিল খরচ লেখা আছে সেগুলোর বক্স দেখাবে
  const khorochEntries = useMemo(
    () => entries.filter((e) => khorochOf(e) > 0),
    [entries]
  );

  // কোনো দিনের চাল খরচ = ৩ বক্সের যোগফল
  const chalUsedOf = (e?: DailyEntryData) =>
    e ? e.chalUsed[0] + e.chalUsed[1] + e.chalUsed[2] : 0;

  // শুধু যে দিনে চাল জমা আছে সেগুলোর বক্স দেখাবে
  const chalEntries = useMemo(
    () => entries.filter((e) => e.chalGiven > 0),
    [entries]
  );
  // শুধু যে দিনে চাল খরচ লেখা আছে সেগুলোর বক্স দেখাবে
  const chalKhorochEntries = useMemo(
    () => entries.filter((e) => chalUsedOf(e) > 0),
    [entries]
  );

  // আজকের এন্ট্রি থাকলে বক্সে আগের মানগুলো বসিয়ে দেওয়া (আপডেট মোড হিসেবে কাজ করে)
  useEffect(() => {
    const e = byDay.get(today);
    setBoxAmount(e?.takaGiven ? String(e.takaGiven) : "");
    setBoxNote(e?.takaNote ?? "");
    const k = khorochOf(e);
    setKboxAmount(k ? String(k) : "");
    const c = e?.chalGiven;
    setCboxAmount(c ? String(c) : "");
    const cu = e?.chalUsed ?? [0, 0, 0];
    setCkMorning(cu[0] ? String(cu[0]) : "");
    setCkNoon(cu[1] ? String(cu[1]) : "");
    setCkNight(cu[2] ? String(cu[2]) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDay, today]);

  const saveBox = async () => {
    if (!month) return;
    const amount = Number(boxAmount);
    if (!boxAmount.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error("কত টাকা দিয়েছে তা লিখুন");
      return;
    }
    setSaving(true);
    try {
      const existing = byDay.get(today);
      // টাকা/নোট এই বক্সের; খরচ ও চালের ফিল্ড আগের মানেই থাকবে
      await upsertDailyEntry(month.id, {
        memberId,
        day: today,
        takaGiven: amount,
        takaNote: boxNote.trim(),
        mealTaka: existing?.mealTaka ?? [0, 0, 0],
        chalGiven: existing?.chalGiven ?? 0,
        chalUsed: existing?.chalUsed ?? [0, 0, 0],
      });
      await load(month.id);
      toast.success("সেভ হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  // মিল খরচ সেভ (উপরের বক্স — আজকের দিন)
  const saveKBox = async () => {
    if (!month) return;
    const amount = Number(kboxAmount);
    if (!kboxAmount.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error("আজকের মিল খরচ লিখুন");
      return;
    }
    setSaving(true);
    try {
      await upsertKhoroch(today, amount);
      await load(month.id);
      toast.success("সেভ হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  // যেকোনো দিনের মিল খরচ সেভ/মুছে ফেলা (১টা বক্স → mealTaka[0], বাকি দুটো ০)
  const upsertKhoroch = async (day: number, amount: number) => {
    if (!month) return;
    const existing = byDay.get(day);
    await upsertDailyEntry(month.id, {
      memberId,
      day,
      takaGiven: existing?.takaGiven ?? 0,
      takaNote: existing?.takaNote ?? "",
      mealTaka: [amount, 0, 0],
      chalGiven: existing?.chalGiven ?? 0,
      chalUsed: existing?.chalUsed ?? [0, 0, 0],
    });
  };

  const removeKhoroch = async (day: number) => {
    if (!month) return;
    const existing = byDay.get(day);
    if (!existing || khorochOf(existing) === 0) return;
    setSaving(true);
    try {
      if (existing.takaGiven === 0 && existing.chalGiven === 0 && existing.chalUsed.every((n) => n === 0)) {
        // অন্য কিছু না থাকলে পুরো এন্ট্রিই মুছে দেওয়া যায়
        await deleteDailyEntry(month.id, existing.id);
      } else {
        await upsertKhoroch(day, 0);
      }
      await load(month.id);
      setKEditingDay(null);
      toast.success("মুছে ফেলা হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছে ফেলা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const openKForm = (day: number) => {
    setKEditingDay(day);
    setKFormAmount(String(khorochOf(byDay.get(day))));
  };

  const saveK = async (day: number) => {
    if (!month) return;
    const amount = Number(kFormAmount) || 0;
    if (Number.isNaN(amount) || amount < 0) {
      toast.error("সঠিক পরিমাণ লিখুন");
      return;
    }
    setSaving(true);
    try {
      await upsertKhoroch(day, amount);
      await load(month.id);
      setKEditingDay(null);
      toast.success("সেভ হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  const openForm = (day: number) => {
    const entry = byDay.get(day);
    setEditingDay(day);
    setFormAmount(String(entry?.takaGiven ?? 0));
    setFormNote(entry?.takaNote ?? "");
  };

  const save = async (day: number) => {
    if (!month) return;
    setSaving(true);
    try {
      const existing = byDay.get(day);
      // নোট/টাকা এই পেজের; বাকি ফিল্ড আগের মানেই থাকবে
      await upsertDailyEntry(month.id, {
        memberId,
        day,
        takaGiven: Number(formAmount) || 0,
        takaNote: formNote.trim(),
        mealTaka: existing?.mealTaka ?? [0, 0, 0],
        chalGiven: existing?.chalGiven ?? 0,
        chalUsed: existing?.chalUsed ?? [0, 0, 0],
      });
      await load(month.id);
      setEditingDay(null);
      toast.success("সেভ হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (day: number) => {
    if (!month) return;
    const existing = byDay.get(day);
    if (!existing) return;
    setSaving(true);
    try {
      if (
        existing.chalGiven === 0 &&
        existing.chalUsed.every((n) => n === 0) &&
        khorochOf(existing) === 0
      ) {
        // চাল ও খরচ কিছুই না থাকলে পুরো এন্ট্রিই মুছে দেওয়া যায়
        await deleteDailyEntry(month.id, existing.id);
      } else {
        // চালের ডেটা থাকলে শুধু টাকার অংশ শূন্য হবে
        await upsertDailyEntry(month.id, {
          memberId,
          day,
          takaGiven: 0,
          takaNote: "",
          mealTaka: existing.mealTaka,
          chalGiven: existing.chalGiven,
          chalUsed: existing.chalUsed,
        });
      }
      await load(month.id);
      setEditingDay(null);
      toast.success("মুছে ফেলা হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছে ফেলা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  // আজকের চাল জমা সেভ (উপরের বক্স)
  const saveChalBox = async () => {
    if (!month) return;
    const amount = Number(cboxAmount);
    if (!cboxAmount.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error("কত চাল দিয়েছে তা লিখুন");
      return;
    }
    setSaving(true);
    try {
      const existing = byDay.get(today);
      // চাল এই বক্সের; টাকা/খরচের ফিল্ড আগের মানেই থাকবে
      await upsertDailyEntry(month.id, {
        memberId,
        day: today,
        takaGiven: existing?.takaGiven ?? 0,
        takaNote: existing?.takaNote ?? "",
        mealTaka: existing?.mealTaka ?? [0, 0, 0],
        chalGiven: amount,
        chalUsed: existing?.chalUsed ?? [0, 0, 0],
      });
      await load(month.id);
      toast.success("সেভ হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  // যেকোনো দিনের চাল জমা সেভ
  const saveC = async (day: number) => {
    if (!month) return;
    setSaving(true);
    try {
      const existing = byDay.get(day);
      await upsertDailyEntry(month.id, {
        memberId,
        day,
        takaGiven: existing?.takaGiven ?? 0,
        takaNote: existing?.takaNote ?? "",
        mealTaka: existing?.mealTaka ?? [0, 0, 0],
        chalGiven: Number(cFormAmount) || 0,
        chalUsed: existing?.chalUsed ?? [0, 0, 0],
      });
      await load(month.id);
      setCEditingDay(null);
      toast.success("সেভ হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  const openChalForm = (day: number) => {
    setCEditingDay(day);
    setCFormAmount(String(byDay.get(day)?.chalGiven ?? 0));
  };

  const removeChal = async (day: number) => {
    if (!month) return;
    const existing = byDay.get(day);
    if (!existing) return;
    setSaving(true);
    try {
      if (
        existing.takaGiven === 0 &&
        khorochOf(existing) === 0 &&
        existing.chalUsed.every((n) => n === 0)
      ) {
        // টাকা ও খরচ কিছুই না থাকলে পুরো এন্ট্রিই মুছে দেওয়া যায়
        await deleteDailyEntry(month.id, existing.id);
      } else {
        // টাকার ডেটা থাকলে শুধু চালের অংশ শূন্য হবে
        await upsertDailyEntry(month.id, {
          memberId,
          day,
          takaGiven: existing.takaGiven,
          takaNote: existing.takaNote,
          mealTaka: existing.mealTaka,
          chalGiven: 0,
          chalUsed: existing.chalUsed,
        });
      }
      await load(month.id);
      setCEditingDay(null);
      toast.success("মুছে ফেলা হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছে ফেলা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  // আজকের চাল খরচ সেভ (উপরের বক্স — সকাল/দুপুর/রাত ৩টা ইনপুট)
  const saveCkBox = async () => {
    if (!month) return;
    const values = [ckMorning, ckNoon, ckNight].map((v) => Number(v) || 0);
    if (values.some((n) => Number.isNaN(n) || n < 0) || !values.some((n) => n > 0)) {
      toast.error("সকাল/দুপুর/রাতের যেকোনো একটিতে পরিমাণ লিখুন");
      return;
    }
    setSaving(true);
    try {
      await upsertChalKhoroch(today, [values[0], values[1], values[2]]);
      await load(month.id);
      toast.success("সেভ হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  // যেকোনো দিনের চাল খরচ সেভ (সকাল, দুপুর, রাত — ৩টা মান)
  const upsertChalKhoroch = async (
    day: number,
    values: [number, number, number]
  ) => {
    if (!month) return;
    const existing = byDay.get(day);
    await upsertDailyEntry(month.id, {
      memberId,
      day,
      takaGiven: existing?.takaGiven ?? 0,
      takaNote: existing?.takaNote ?? "",
      mealTaka: existing?.mealTaka ?? [0, 0, 0],
      chalGiven: existing?.chalGiven ?? 0,
      chalUsed: values,
    });
  };

  const removeChalKhoroch = async (day: number) => {
    if (!month) return;
    const existing = byDay.get(day);
    if (!existing || chalUsedOf(existing) === 0) return;
    setSaving(true);
    try {
      if (existing.takaGiven === 0 && existing.chalGiven === 0 && khorochOf(existing) === 0) {
        // অন্য কিছু না থাকলে পুরো এন্ট্রিই মুছে দেওয়া যায়
        await deleteDailyEntry(month.id, existing.id);
      } else {
        await upsertChalKhoroch(day, [0, 0, 0]);
      }
      await load(month.id);
      setCkEditingDay(null);
      toast.success("মুছে ফেলা হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছে ফেলা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const openCkForm = (day: number) => {
    setCkEditingDay(day);
    const cu = byDay.get(day)?.chalUsed ?? [0, 0, 0];
    setCkForm([String(cu[0]), String(cu[1]), String(cu[2])]);
  };

  const saveCk = async (day: number) => {
    if (!month) return;
    const values = ckForm.map((v) => Number(v) || 0);
    if (values.some((n) => Number.isNaN(n) || n < 0)) {
      toast.error("সঠিক পরিমাণ লিখুন");
      return;
    }
    setSaving(true);
    try {
      await upsertChalKhoroch(day, [values[0], values[1], values[2]]);
      await load(month.id);
      setCkEditingDay(null);
      toast.success("সেভ হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto h-40 max-w-4xl animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
    );
  }

  if (!month) {
    return (
      <div className="mx-auto max-w-4xl">
        <BackLink />
        <p className="mt-8 text-neutral-500">কোনো মাস পাওয়া যায়নি।</p>
      </div>
    );
  }

  const monthClosed = month.status === "closed";

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink />

      <div className="mt-4 card-3d p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              {isAdmin ? "ম্যানেজারকে দেওয়া টাকা" : "আমার জমা দেওয়া টাকা"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              মোট জমা {month.label} — {memberName}
            </p>
            {monthClosed && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                এই মাসটি বন্ধ — শুধু দেখা যাবে।
              </p>
            )}
          </div>
          {/* ডান দিকে: আজকের জমার বক্স (শুধু কন্ট্রোলার/ম্যানেজার) */}
          {isAdmin && !monthClosed && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step="any"
                aria-label="আজকের জমা"
                placeholder="৳"
                value={boxAmount}
                onChange={(e) => setBoxAmount(e.target.value)}
                className="w-20 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                onClick={saveBox}
                disabled={saving}
                className="btn-3d px-4 py-2 text-sm"
              >
                + যোগ
              </button>
              <input
                type="text"
                maxLength={200}
                aria-label="নোট"
                placeholder="নোট"
                value={boxNote}
                onChange={(e) => setBoxNote(e.target.value)}
                className="w-28 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-36"
              />
            </div>
          )}
        </div>

        {/* মাস ঘোরানো */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <button
            disabled={monthIndex === months.length - 1}
            onClick={() => setMonthIndex((i) => (i == null ? null : i + 1))}
            className="btn-press rounded-lg border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700"
          >
            ← আগের মাস
          </button>
          <span className="font-medium">{month.label}</span>
          <button
            disabled={monthIndex === 0}
            onClick={() => setMonthIndex((i) => (i == null ? null : i - 1))}
            className="btn-press rounded-lg border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700"
          >
            পরের মাস →
          </button>
        </div>

        {/* হিসাবের কার্ড */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="মোট টাকা" value={`৳${stats.total}`} highlight />
          <StatCard label="জমা আছে এমন দিন" value={String(stats.days)} />
          <StatCard
            label="কত টাকা আছে"
            value={`৳${stats.remaining}`}
            sub={`জমা ৳${stats.total} − খরচ ৳${stats.mealExpense}`}
            danger={stats.remaining < 0}
          />
        </div>
      </div>

      {/* জমার বক্স — যতবার টাকা যোগ হবে ততগুলো বক্স দেখাবে */}
      <div className="mt-4 space-y-3">
        {takaEntries.length === 0 ? (
          <p className="card-3d p-6 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            এই মাসে এখনো কোনো টাকা জমা দেওয়া হয়নি।
          </p>
        ) : (
          takaEntries.map((e) => {
            const editing = editingDay === e.day;
            return (
              <div
                key={e.id}
                className="card-3d p-4"
              >
                {editing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label="টাকা"
                      value={formAmount}
                      onChange={(ev) => setFormAmount(ev.target.value)}
                      className="w-24 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <input
                      type="text"
                      maxLength={200}
                      aria-label="নোট"
                      placeholder="নোট"
                      value={formNote}
                      onChange={(ev) => setFormNote(ev.target.value)}
                      className="min-w-0 flex-1 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <button
                      onClick={() => save(e.day)}
                      disabled={saving}
                      className="btn-3d px-3 py-2 text-xs"
                    >
                      সেভ
                    </button>
                    <button
                      onClick={() => setEditingDay(null)}
                      className="btn-press rounded-lg border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700"
                    >
                      বাতিল
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-primary">
                        ৳{e.takaGiven}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {month.label}-{String(e.day).padStart(2, "0")} ·{" "}
                        {weekday(month.label, e.day)}
                      </p>
                      {e.takaNote && (
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                          {e.takaNote}
                        </p>
                      )}
                    </div>
                    {isAdmin && !monthClosed && (
                      <div className="whitespace-nowrap">
                        <button
                          onClick={() => openForm(e.day)}
                          className="btn-press rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"
                        >
                          এডিট
                        </button>
                        <button
                          onClick={() => remove(e.day)}
                          disabled={saving}
                          className="ml-2 btn-press rounded-lg border border-red-500 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-60"
                        >
                          ডিলিট
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* মিল খরচ — হেডার কার্ড + আজকের খরচের বক্স */}
      <div className="mt-8 card-3d p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">মিল খরচ</h2>
            <p className="mt-1 text-sm text-neutral-500">মোট খরচ {month.label} — {memberName}</p>
          </div>
          {isAdmin && !monthClosed && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step="any"
                aria-label="মিল খরচ"
                placeholder="৳"
                value={kboxAmount}
                onChange={(e) => setKboxAmount(e.target.value)}
                className="w-20 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                onClick={saveKBox}
                disabled={saving}
                className="btn-3d px-4 py-2 text-sm"
              >
                + যোগ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* মিল খরচের বক্স — যতবার খরচ যোগ হবে ততগুলো বক্স দেখাবে */}
      <div className="mt-4 space-y-3">
        {khorochEntries.length === 0 ? (
          <p className="card-3d p-6 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            এই মাসে এখনো কোনো মিল খরচ লেখা হয়নি।
          </p>
        ) : (
          khorochEntries.map((e) => {
            const editing = kEditingDay === e.day;
            return (
              <div
                key={e.id}
                className="card-3d p-4"
              >
                {editing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label="মিল খরচ"
                      value={kFormAmount}
                      onChange={(ev) => setKFormAmount(ev.target.value)}
                      className="w-24 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <button
                      onClick={() => saveK(e.day)}
                      disabled={saving}
                      className="btn-3d px-3 py-2 text-xs"
                    >
                      সেভ
                    </button>
                    <button
                      onClick={() => setKEditingDay(null)}
                      className="btn-press rounded-lg border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700"
                    >
                      বাতিল
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{khorochOf(e)} ৳</p>
                      <p className="text-xs text-neutral-500">
                        {month.label}-{String(e.day).padStart(2, "0")} ·{" "}
                        {weekday(month.label, e.day)}
                      </p>
                    </div>
                    {isAdmin && !monthClosed && (
                      <div className="whitespace-nowrap">
                        <button
                          onClick={() => openKForm(e.day)}
                          className="btn-press rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"
                        >
                          এডিট
                        </button>
                        <button
                          onClick={() => removeKhoroch(e.day)}
                          disabled={saving}
                          className="ml-2 btn-press rounded-lg border border-red-500 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-60"
                        >
                          ডিলিট
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ম্যানেজারকে দেওয়া চাল — হেডার + আজকের জমার বক্স */}
      <div className="mt-8 card-3d p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">ম্যানেজারকে দেওয়া চাল</h2>
            <p className="mt-1 text-sm text-neutral-500">
              মোট চাল {month.label} — {memberName}
            </p>
          </div>
          {isAdmin && !monthClosed && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step="any"
                aria-label="আজকের চাল জমা"
                placeholder="পট"
                value={cboxAmount}
                onChange={(e) => setCboxAmount(e.target.value)}
                className="w-20 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                onClick={saveChalBox}
                disabled={saving}
                className="btn-3d px-4 py-2 text-sm"
              >
                + যোগ
              </button>
            </div>
          )}
        </div>

        {/* চালের হিসাবের কার্ড */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="মোট চাল (পট)" value={String(chalStats.given)} highlight />
          <StatCard label="চাল খরচ (পট)" value={String(chalStats.used)} />
          <StatCard
            label="অবশিষ্ট চাল (পট)"
            value={String(chalStats.remaining)}
            sub={`জমা ${chalStats.given} পট − খরচ ${chalStats.used} পট`}
            danger={chalStats.remaining < 0}
          />
        </div>
      </div>

      {/* চাল জমার বক্স — যতবার চাল যোগ হবে ততগুলো বক্স দেখাবে */}
      <div className="mt-4 space-y-3">
        {chalEntries.length === 0 ? (
          <p className="card-3d p-6 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            এই মাসে এখনো কোনো চাল জমা দেওয়া হয়নি।
          </p>
        ) : (
          chalEntries.map((e) => {
            const editing = cEditingDay === e.day;
            return (
              <div
                key={e.id}
                className="card-3d p-4"
              >
                {editing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label="চাল"
                      value={cFormAmount}
                      onChange={(ev) => setCFormAmount(ev.target.value)}
                      className="w-24 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <button
                      onClick={() => saveC(e.day)}
                      disabled={saving}
                      className="btn-3d px-3 py-2 text-xs"
                    >
                      সেভ
                    </button>
                    <button
                      onClick={() => setCEditingDay(null)}
                      className="btn-press rounded-lg border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700"
                    >
                      বাতিল
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-primary">
                        {e.chalGiven} পট
                      </p>
                      <p className="text-xs text-neutral-500">
                        {month.label}-{String(e.day).padStart(2, "0")} ·{" "}
                        {weekday(month.label, e.day)}
                      </p>
                    </div>
                    {isAdmin && !monthClosed && (
                      <div className="whitespace-nowrap">
                        <button
                          onClick={() => openChalForm(e.day)}
                          className="btn-press rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"
                        >
                          এডিট
                        </button>
                        <button
                          onClick={() => removeChal(e.day)}
                          disabled={saving}
                          className="ml-2 btn-press rounded-lg border border-red-500 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-60"
                        >
                          ডিলিট
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* চাল খরচ — হেডার কার্ড + আজকের খরচের বক্স */}
      <div className="mt-8 card-3d p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">চাল খরচ</h2>
            <p className="mt-1 text-sm text-neutral-500">
              মোট চাল খরচ {month.label} — {memberName}
            </p>
          </div>
          {isAdmin && !monthClosed && (
            <div className="flex flex-wrap items-end gap-2">
              {(
                [
                  { label: "সকাল", value: ckMorning, set: setCkMorning },
                  { label: "দুপুর", value: ckNoon, set: setCkNoon },
                  { label: "রাত", value: ckNight, set: setCkNight },
                ] as const
              ).map((f) => (
                <label key={f.label} className="text-xs text-neutral-500">
                  <span className="mb-1 block">{f.label}</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    aria-label={`আজকের চাল খরচ (${f.label})`}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className="w-20 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </label>
              ))}
              <span className="pb-2 text-lg font-bold">
                = {ckTodayTotal}
              </span>
              <button
                onClick={saveCkBox}
                disabled={saving}
                className="btn-3d px-4 py-2 text-sm"
              >
                + যোগ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* চাল খরচের বক্স — যতবার খরচ যোগ হবে ততগুলো বক্স দেখাবে */}
      <div className="mt-4 space-y-3">
        {chalKhorochEntries.length === 0 ? (
          <p className="card-3d p-6 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            এই মাসে এখনো কোনো চাল খরচ লেখা হয়নি।
          </p>
        ) : (
          chalKhorochEntries.map((e) => {
            const editing = ckEditingDay === e.day;
            return (
              <div
                key={e.id}
                className="card-3d p-4"
              >
                {editing ? (
                  <div className="flex flex-wrap items-end gap-2">
                    {(
                      [
                        { label: "সকাল", idx: 0 },
                        { label: "দুপুর", idx: 1 },
                        { label: "রাত", idx: 2 },
                      ] as const
                    ).map((f) => (
                      <label key={f.label} className="text-xs text-neutral-500">
                        <span className="mb-1 block">{f.label}</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          aria-label={`চাল খরচ (${f.label})`}
                          value={ckForm[f.idx]}
                          onChange={(ev) =>
                            setCkForm((prev) => {
                              const next = [...prev] as [string, string, string];
                              next[f.idx] = ev.target.value;
                              return next;
                            })
                          }
                          className="w-20 input-3d px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </label>
                    ))}
                    <span className="pb-2 text-lg font-bold">
                      = {ckForm.reduce((s, v) => s + (Number(v) || 0), 0)}
                    </span>
                    <button
                      onClick={() => saveCk(e.day)}
                      disabled={saving}
                      className="btn-3d px-3 py-2 text-xs"
                    >
                      সেভ
                    </button>
                    <button
                      onClick={() => setCkEditingDay(null)}
                      className="btn-press rounded-lg border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700"
                    >
                      বাতিল
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">
                        {chalUsedOf(e)} পট
                      </p>
                      <p className="text-xs text-neutral-500">
                        {month.label}-{String(e.day).padStart(2, "0")} ·{" "}
                        {weekday(month.label, e.day)}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                        সকাল {e.chalUsed[0]} · দুপুর {e.chalUsed[1]} · রাত{" "}
                        {e.chalUsed[2]} = {chalUsedOf(e)}
                      </p>
                    </div>
                    {isAdmin && !monthClosed && (
                      <div className="whitespace-nowrap">
                        <button
                          onClick={() => openCkForm(e.day)}
                          className="btn-press rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"
                        >
                          এডিট
                        </button>
                        <button
                          onClick={() => removeChalKhoroch(e.day)}
                          disabled={saving}
                          className="ml-2 btn-press rounded-lg border border-red-500 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-60"
                        >
                          ডিলিট
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/manager"
      className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-primary dark:text-neutral-300"
    >
      ← ইউজারস
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="card-3d p-4 text-center">
      <p className={`text-xl font-bold ${danger ? "text-red-500" : highlight ? "text-primary" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-neutral-500">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}
