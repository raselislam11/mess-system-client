import { api } from "./api";
import type {
  BazarEntryData,
  DailyEntryData,
  ExtraEntryData,
  Member,
  MonthInfo,
  MonthSummary,
} from "@/types";

// Members
export const listMembers = () =>
  api<{ members: Member[] }>("/users");

export const addMember = (body: {
  name: string;
  email: string;
  password: string;
}) => api<{ member: Member }>("/users", { method: "POST", body });

export const updateMember = (
  id: string,
  body: { role?: Member["role"]; isActive?: boolean }
) => api<{ member: Member }>(`/users/${id}`, { method: "PATCH", body });

// Months
export const listMonths = () => api<{ months: MonthInfo[] }>("/months");

export const getCurrentMonth = () =>
  api<{ month: MonthInfo }>("/months/current");

export const createMonth = (label: string) =>
  api<{ month: MonthInfo }>("/months", { method: "POST", body: { label } });

export const closeMonth = (id: string) =>
  api<{ month: MonthInfo }>(`/months/${id}/close`, { method: "POST" });

export const getMonthSummary = (id: string) =>
  api<MonthSummary>(`/months/${id}/summary`);

export const updateMemberBill = (
  monthId: string,
  memberId: string,
  body: {
    messBillPaid?: boolean;
    messBillAmount?: number;
    auntyBillPaid?: boolean;
    auntyBillAmount?: number;
  }
) =>
  api<unknown>(`/months/${monthId}/bills/${memberId}`, { method: "PUT", body });

// Daily entries (day filter optional; memberId only for manager/controller)
export const getDailyEntries = (
  monthId: string,
  day?: number,
  memberId?: string
) => {
  const search = new URLSearchParams();
  if (day) search.set("day", String(day));
  if (memberId) search.set("memberId", memberId);
  const qs = search.toString();
  return api<{ entries: DailyEntryData[] }>(
    `/months/${monthId}/daily${qs ? `?${qs}` : ""}`
  );
};

export function upsertDailyEntry(
  monthId: string,
  body: {
    memberId?: string;
    day: number;
    takaGiven: number;
    takaNote?: string;
    mealTaka: number[];
    chalGiven: number;
    chalUsed: number[];
  }
) {
  return api<{ entry: DailyEntryData }>(`/months/${monthId}/daily`, {
    method: "POST",
    body,
  });
}

export const deleteDailyEntry = (monthId: string, entryId: string) =>
  api<{ message: string }>(`/months/${monthId}/daily/${entryId}`, {
    method: "DELETE",
  });

// Bazar entries
export const getBazarEntries = (monthId: string) =>
  api<{ entries: BazarEntryData[] }>(`/months/${monthId}/bazar`);

export const addBazarEntry = (
  monthId: string,
  body: { day: number; amount: number; note: string }
) =>
  api<{ entry: BazarEntryData }>(`/months/${monthId}/bazar`, {
    method: "POST",
    body,
  });

export const deleteBazarEntry = (monthId: string, entryId: string) =>
  api<{ message: string }>(`/months/${monthId}/bazar/${entryId}`, {
    method: "DELETE",
  });

// Extra entries
export const getExtraEntries = (monthId: string) =>
  api<{ entries: ExtraEntryData[] }>(`/months/${monthId}/extra`);

export const addExtraEntry = (
  monthId: string,
  body: { type: "taka" | "chal"; day: number; description: string; amount: number }
) =>
  api<{ entry: ExtraEntryData }>(`/months/${monthId}/extra`, {
    method: "POST",
    body,
  });

export const deleteExtraEntry = (monthId: string, entryId: string) =>
  api<{ message: string }>(`/months/${monthId}/extra/${entryId}`, {
    method: "DELETE",
  });
