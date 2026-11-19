"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  addJorimana,
  deleteJorimana,
  getCurrentMonth,
  getJorimana,
  listMembers,
  updateJorimana,
} from "@/lib/mess";
import type { JorimanaData, Member } from "@/types";

// বারের বাংলা নাম — getDay(): 0=রবি ... 6=শনি
const barNames = [
  "রবিবার",
  "সোমবার",
  "মঙ্গলবার",
  "বুধবার",
  "বৃহস্পতিবার",
  "শুক্রবার",
  "শনিবার",
];

// বাংলা মাসের নাম
const monthNames = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

// আসল চলতি মাস-বছর অনুযায়ী তারিখ ও বার
const now = new Date();
const realYear = now.getFullYear();
const realMonth = now.getMonth();

export default function JorimanaPage() {
  const { user } = useAuth();
  const [monthId, setMonthId] = useState<string | null>(null);
  const [monthLabel, setMonthLabel] = useState("");
  const [entries, setEntries] = useState<JorimanaData[]>([]);
  const [memberOptions, setMemberOptions] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ফর্ম — editing থাকলে এডিট মোড
  const [editing, setEditing] = useState<JorimanaData | null>(null);
  const [day, setDay] = useState(() => Math.min(new Date().getDate(), 30));
  const [member, setMember] = useState("");
  const [amount, setAmount] = useState("");

  const isAdmin = user?.role === "controller" || user?.role === "manager";
  const today = Math.min(new Date().getDate(), 30);

  // দিন নম্বরকে আসল চলতি মাসের তারিখ ধরে বার বের করা
  const barOf = useCallback((d: number) => {
    return barNames[new Date(realYear, realMonth, d).getDay()];
  }, []);

  // পূর্ণ তারিখ — যেমন "16 নভেম্বর"
  const dateOf = useCallback((d: number) => {
    return `${d} ${monthNames[realMonth]}`;
  }, []);

  const load = useCallback(async () => {
    try {
      const monthRes = await getCurrentMonth();
      setMonthId(monthRes.month.id);
      setMonthLabel(monthRes.month.label);
      const listRes = await getJorimana(monthRes.month.id);
      setEntries(listRes.entries);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "লোড হয়নি");
    } finally {
      setLoading(false);
    }
  }, []);

  // সদস্য তালিকা আলাদাভাবে লোড — জরিমানার এন্ট্রি লোড ব্যর্থ হলেও
  // ড্রপডাউনে নাম বাছাই করা যাবে
  const loadMembers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const membersRes = await listMembers();
      setMemberOptions(membersRes.members.filter((mm) => mm.isActive));
    } catch {
      // ইগনোর — পরে আবার লোড হবে
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
    void loadMembers();
  }, [load, loadMembers]);

  const resetForm = () => {
    setEditing(null);
    setMember("");
    setAmount("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthId) return;
    const body = {
      day,
      member: member || null,
      amount: Number(amount) || 0,
      done: editing?.done ?? false,
    };
    setSaving(true);
    try {
      if (editing) {
        await updateJorimana(monthId, editing.id, body);
        toast.success("জরিমানা আপডেট হয়েছে");
      } else {
        await addJorimana(monthId, body);
        toast.success(`দিন ${day} — জরিমানায় যোগ হয়েছে`);
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  // হয়ে গেছে — টিক মার্ক বদলানো
  const toggleDone = async (entry: JorimanaData) => {
    if (!monthId) return;
    try {
      await updateJorimana(monthId, entry.id, {
        day: entry.day,
        member: entry.member?.id ?? null,
        amount: entry.amount,
        done: !entry.done,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "বদলানো যায়নি");
    }
  };

  // এডিট — সারির তথ্য উপরের ফর্মে বসানো
  const startEdit = (entry: JorimanaData) => {
    setEditing(entry);
    setDay(entry.day);
    setMember(entry.member?.id ?? "");
    setAmount(entry.amount ? String(entry.amount) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (entry: JorimanaData) => {
    if (!monthId) return;
    try {
      await deleteJorimana(monthId, entry.id);
      if (editing?.id === entry.id) resetForm();
      toast.success("মুছে ফেলা হয়েছে");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছে ফেলা যায়নি");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto h-40 max-w-3xl animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
    );
  }

  const total = entries.reduce((s, e) => s + e.amount, 0);
  const doneCount = entries.filter((e) => e.done).length;
  const sorted = [...entries].sort((a, b) => a.day - b.day);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">জরিমানা</h1>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          মোট জরিমানা: {total} টাকা — হয়ে গেছে {doneCount}/{entries.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        মাস: {monthLabel} — কোন দিনে কে (১ জন) জরিমানা দেবে, কত টাকা, তার
        তালিকা।
      </p>

      {isAdmin && (
        <form
          onSubmit={submit}
          className="mt-4 grid gap-3 card-3d p-4 sm:grid-cols-2"
        >
          <h2 className="font-semibold sm:col-span-2">
            {editing
              ? `দিন ${editing.day} — এডিট করুন`
              : "নতুন জরিমানায় যোগ করুন"}
          </h2>
          <label className="text-sm">
            তারিখ (দিন)
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {[...Array(30)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {dateOf(i + 1)} — {barOf(i + 1)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            কত টাকার জরিমানা
            <input
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="৳"
              className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            জরিমানা দেবে (১ জন)
            <select
              value={member}
              onChange={(e) => setMember(e.target.value)}
              className="mt-1 w-full input-3d px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">— নাম বাছাই করুন —</option>
              {memberOptions.map((mm) => (
                <option key={mm.id} value={mm.id}>
                  {mm.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-3d px-4 py-2.5">
              {saving ? "..." : editing ? "আপডেট করুন" : "+ যোগ করুন"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-press rounded-lg border border-neutral-300 px-4 py-2.5 text-sm dark:border-neutral-700"
              >
                বাতিল
              </button>
            )}
          </div>
        </form>
      )}

      <ul className="mt-5 space-y-3">
        {sorted.length === 0 && (
          <li className="text-neutral-500">এখনো কোনো জরিমানা যোগ করা হয়নি।</li>
        )}
        {sorted.map((entry) => (
          <li
            key={entry.id}
            className={`rounded-xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${
              entry.done ? "border-primary/40" : "border-neutral-200"
            }`}
          >
            {/* উপরে: দিন, বার ও টাকা */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                দিন {entry.day}
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  {dateOf(entry.day)}, {barOf(entry.day)}
                </span>
                {entry.day === today && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    আজ
                  </span>
                )}
              </p>
              <span className="font-bold text-primary">
                {entry.amount} টাকা
              </span>
            </div>

            {/* একজন সদস্যের নাম */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {!entry.member ? (
                <span className="text-sm text-neutral-400">নাম দেওয়া হয়নি</span>
              ) : (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium dark:bg-neutral-800">
                  {entry.member.name}
                </span>
              )}
            </div>

            {/* নিচে: এডিট, হয়ে গেছে, মুছুন বাটন */}
            {isAdmin && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <button
                  onClick={() => startEdit(entry)}
                  className="btn-press rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
                >
                  এডিট
                </button>
                <button
                  onClick={() => toggleDone(entry)}
                  className={`btn-press rounded-lg px-3 py-1.5 text-sm ${
                    entry.done
                      ? "bg-primary text-white"
                      : "border border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {entry.done ? "হয়ে গেছে ✓" : "হয়ে গেছে?"}
                </button>
                <button
                  onClick={() => remove(entry)}
                  className="btn-press ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                >
                  মুছুন
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
