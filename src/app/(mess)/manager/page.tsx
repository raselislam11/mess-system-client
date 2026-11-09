"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentMonth, getMonthSummary } from "@/lib/mess";
import { roleLabel } from "@/lib/permissions";
import type { SummaryRow } from "@/types";

// প্রথমে সব সদস্যের তালিকা, কার্ডে ক্লিক করলে ওই সদস্যের দৈনিক হিসাব খোলে
export default function ManagerUsersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [monthLabel, setMonthLabel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { month } = await getCurrentMonth();
        const summary = await getMonthSummary(month.id);
        setMonthLabel(summary.month.label);
        setRows(summary.rows);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "লোড হয়নি");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // মেম্বার শুধু নিজের হিসাব দেখতে পারবে
  const visible =
    user?.role === "member" ? rows.filter((r) => r.memberId === user.id) : rows;

  if (loading) {
    return (
      <div className="mx-auto h-40 max-w-4xl animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">ইউজারস</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {monthLabel ? `${monthLabel} মাসের হিসাব — কার্ডে ক্লিক করে দৈনিক হিসাব দেখুন` : ""}
      </p>

      {visible.length === 0 ? (
        <p className="mt-8 text-neutral-500">কোনো সদস্য নেই।</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {visible.map((member) => {
            const remaining = member.takaGiven - member.mealTakaTotal;
            return (
              <Link
                key={member.memberId}
                href={`/manager/${member.memberId}`}
                className="card-3d p-4 transition-colors hover:border-primary dark:hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{member.name}</p>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
                    {roleLabel(member.role as "controller" | "manager" | "member")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-500">
                  দিলো: <span className="font-medium text-neutral-800 dark:text-neutral-200">৳{member.takaGiven}</span>
                </p>
                <p
                  className={`text-sm ${remaining < 0 ? "text-red-500" : "text-neutral-500"}`}
                >
                  বাকি: <span className="font-medium">৳{remaining}</span>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
