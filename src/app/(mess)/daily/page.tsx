"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  getCurrentMonth,
  getDailyEntries,
  listMembers,
  upsertDailyEntry,
} from "@/lib/mess";
import type { DailyEntryData } from "@/types";

interface RowState {
  memberId: string;
  name: string;
  mealTaka: string; // দিনের মোট মিল খরচ (একটা বক্স)
  chalUsed: [string, string, string]; // সকাল, দুপুর, রাত
  // এই পেজে দেখানো হয় না — সেভ করলে আগের মানই থাকবে
  takaGiven: string;
  chalGiven: string;
  hasExisting: boolean; // এই দিনের এন্ট্রি আগেই লেখা আছে কিনা
}

const num = (v: string) => Number(v) || 0;

function toRow(
  memberId: string,
  name: string,
  entry?: DailyEntryData
): RowState {
  if (!entry) {
    return {
      memberId,
      name,
      mealTaka: "",
      chalUsed: ["", "", ""],
      takaGiven: "",
      chalGiven: "",
      hasExisting: false,
    };
  }
  // এই দিনের ডেটা আগেই লেখা থাকলেও বক্সে আর দেখানো হয় না —
  // লুকানো takaGiven/chalGiven রাখা হয় যাতে সেভ করলে হারিয়ে না যায়
  return {
    memberId,
    name,
    mealTaka: "",
    chalUsed: ["", "", ""],
    takaGiven: String(entry.takaGiven),
    chalGiven: String(entry.chalGiven),
    hasExisting: true,
  };
}

export default function DailyPage() {
  const { user } = useAuth();
  const [monthId, setMonthId] = useState<string | null>(null);
  const [day, setDay] = useState(() => Math.min(new Date().getDate(), 30));
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<RowState | null>(null);

  const isAdmin = user?.role === "controller" || user?.role === "manager";

  // লাইভ মোট — টাইপ করার সাথে সাথেই আপডেট হয়
  const totalTaka = rows.reduce((s, r) => s + num(r.mealTaka), 0);
  const totalChal = rows.reduce(
    (s, r) => s + r.chalUsed.reduce((a, v) => a + num(v), 0),
    0
  );
  // সকাল/দুপুর/রাত আলাদা করে রিয়েল-টাইম মোট
  const chalMorning = rows.reduce((s, r) => s + num(r.chalUsed[0]), 0);
  const chalNoon = rows.reduce((s, r) => s + num(r.chalUsed[1]), 0);
  const chalNight = rows.reduce((s, r) => s + num(r.chalUsed[2]), 0);

  useEffect(() => {
    (async () => {
      try {
        const { month } = await getCurrentMonth();
        setMonthId(month.id);
      } catch {
        toast.error("কোনো খোলা মাস পাওয়া যায়নি");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const load = useCallback(
    async (month: string, selectedDay: number) => {
      try {
        const [entriesRes, membersRes] = await Promise.all([
          getDailyEntries(month, selectedDay),
          isAdmin ? listMembers() : Promise.resolve(null),
        ]);

        const byMember = new Map(entriesRes.entries.map((e) => [e.memberId, e]));
        const next: RowState[] = [];

        if (membersRes) {
          for (const member of membersRes.members) {
            if (!member.isActive) continue;
            next.push(toRow(member.id, member.name, byMember.get(member.id)));
          }
        } else {
          for (const entry of entriesRes.entries) {
            next.push(toRow(entry.memberId, user?.name ?? "", entry));
          }
        }

        // পুরোনো মেম্বারদের এন্ট্রিও ভালোভাবে দেখাবে
        for (const entry of entriesRes.entries) {
          if (!next.some((r) => r.memberId === entry.memberId)) {
            next.push(toRow(entry.memberId, "পুরোনো মেম্বার", entry));
          }
        }

        setRows(next);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "লোড হয়নি");
      }
    },
    [isAdmin, user?.name]
  );

  useEffect(() => {
    if (monthId) void load(monthId, day);
  }, [monthId, day, load]);

  const update = (memberId: string, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((r) => (r.memberId === memberId ? { ...r, ...patch } : r))
    );
  };

  const save = async (row: RowState, confirmed = false) => {
    if (!monthId) return;
    // কিছুই লেখা হয়নি? তাহলে আগের ডেটা ভুলে মুছে যাওয়া আটকাও
    if (
      row.mealTaka.trim() === "" &&
      row.chalUsed.every((v) => v.trim() === "")
    ) {
      toast.error("মিল টাকা বা চাল — কিছু একটা লিখুন");
      return;
    }
    // এই দিনের ডেটা আগেই থাকলে আগে জিজ্ঞেস করবে — নিশ্চিত না বাতিল
    if (row.hasExisting && !confirmed) {
      setConfirmRow(row);
      return;
    }
    setSavingId(row.memberId);
    try {
      await upsertDailyEntry(monthId, {
        memberId: isAdmin ? row.memberId : undefined,
        day,
        takaGiven: num(row.takaGiven),
        mealTaka: [num(row.mealTaka), 0, 0],
        chalGiven: num(row.chalGiven),
        chalUsed: row.chalUsed.map(num) as [number, number, number],
      });
      setConfirmRow(null);
      toast.success("সেভ হয়েছে");
      await load(monthId, day);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto h-40 max-w-4xl animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">দৈনিক হিসাব</h1>
        <label className="flex items-center gap-2 text-sm">
          দিন:
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="input-3d px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {[...Array(30)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        মিল খরচ একটা বক্সে, চাল খরচ সকাল/দুপুর/রাত ৩ বক্সে লিখুন। লেখা সেভ
        হওয়ার পর বক্স খালি থাকবে — আবার লিখলে নিশ্চিত করতে বলবে।
      </p>

      {/* লাইভ মোট — যত জনের লিখবেন তত জনের হিসাব এখানে দেখাবে */}
      {rows.length > 0 && (
        <div className="sticky top-0 z-10 mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-3 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95 sm:grid-cols-5">
          <LiveStat label="মোট টাকা (৳)" value={totalTaka} highlight />
          <LiveStat label="মোট চাল (পট)" value={totalChal} />
          <LiveStat label="সকাল (পট)" value={chalMorning} />
          <LiveStat label="দুপুর (পট)" value={chalNoon} />
          <LiveStat
            label="রাত (পট)"
            value={chalNight}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-8 text-neutral-500">এই দিনে কোনো এন্ট্রি নেই।</p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((row) => {
            const chalTotal = row.chalUsed.reduce((s, v) => s + num(v), 0);
            return (
              <div
                key={row.memberId}
                className="card-3d p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{row.name}</p>
                  {isAdmin && (
                    <button
                      onClick={() => save(row)}
                      disabled={savingId === row.memberId}
                      className="btn-3d px-4 py-2 text-sm"
                    >
                      {savingId === row.memberId ? "..." : "+ যোগ"}
                    </button>
                  )}
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {/* মিল খরচ — একটা বক্স */}
                  <div>
                    <p className="mb-1 text-xs text-neutral-500">
                      মিল খরচ (৳)
                    </p>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={`মিল খরচ — ${row.name}`}
                      value={row.mealTaka}
                      onChange={(e) =>
                        update(row.memberId, { mealTaka: e.target.value })
                      }
                      disabled={!isAdmin}
                      className="w-24 input-3d px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </div>

                  {/* চাল খরচ — সকাল/দুপুর/রাত ৩ বক্স + মোট */}
                  <div>
                    <p className="mb-1 text-xs text-neutral-500">
                      চাল খরচ (পট)
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      {(
                        [
                          { label: "সকাল", idx: 0 },
                          { label: "দুপুর", idx: 1 },
                          { label: "রাত", idx: 2 },
                        ] as const
                      ).map((f) => (
                        <label
                          key={f.label}
                          className="text-xs text-neutral-500"
                        >
                          <span className="mb-1 block">{f.label}</span>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            aria-label={`চাল খরচ ${f.label} — ${row.name}`}
                            value={row.chalUsed[f.idx]}
                            onChange={(e) =>
                              update(row.memberId, {
                                chalUsed: row.chalUsed.map((o, oi) =>
                                  oi === f.idx ? e.target.value : o
                                ) as [string, string, string],
                              })
                            }
                            disabled={!isAdmin}
                            className="w-16 input-3d px-2 py-2 text-sm disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
                          />
                        </label>
                      ))}
                      <span className="pb-2 text-lg font-bold">
                        = {chalTotal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ওভাররাইট নিশ্চিত করার পপআপ */}
      {confirmRow && (        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-neutral-900">
            <h2 className="text-lg font-bold">
              {confirmRow.name} — দিন {day}
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              এই দিনের ডেটা আগেই লেখা আছে। আবার লিখতে চান?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmRow(null)}
                className="btn-press rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                বাতিল
              </button>
              <button
                onClick={() => save(confirmRow, true)}
                disabled={savingId === confirmRow.memberId}
                className="btn-3d px-4 py-2 text-sm"
              >
                নিশ্চিত
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveStat({
  label,
  value,
  highlight,
  className,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800 ${className ?? ""}`}
    >
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}
