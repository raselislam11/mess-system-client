import { api } from "./api";
import type {
  BazarEntryData,
  BazarListData,
  DailyEntryData,
  ExtraEntryData,
  JorimanaData,
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

export const reopenMonth = (id: string) =>
  api<{ month: MonthInfo }>(`/months/${id}/reopen`, { method: "POST" });

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
    mealNote?: string;
    chalGiven: number;
    chalUsed: number[];
    chalNote?: string;
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

// Bazar list — কোন দিনে কারা বাজার করবে, কত টাকা, টিক মার্ক
export const getBazarList = (monthId: string) =>
  api<{ entries: BazarListData[] }>(`/months/${monthId}/bazar-list`);

export const addBazarList = (
  monthId: string,
  body: { day: number; members: string[]; amount: number; done: boolean }
) =>
  api<{ entry: BazarListData }>(`/months/${monthId}/bazar-list`, {
    method: "POST",
    body,
  });

export const updateBazarList = (
  monthId: string,
  entryId: string,
  body: { day: number; members: string[]; amount: number; done: boolean }
) =>
  api<{ entry: BazarListData }>(
    `/months/${monthId}/bazar-list/${entryId}`,
    { method: "PUT", body }
  );

export const deleteBazarList = (monthId: string, entryId: string) =>
  api<{ message: string }>(`/months/${monthId}/bazar-list/${entryId}`, {
    method: "DELETE",
  });

// জরিমানা — বাজার লিস্টের মতো, তবে একদিনে এক জন
export const getJorimana = (monthId: string) =>
  api<{ entries: JorimanaData[] }>(`/months/${monthId}/jorimana`);

export const addJorimana = (
  monthId: string,
  body: { day: number; member: string | null; amount: number; done: boolean }
) =>
  api<{ entry: JorimanaData }>(`/months/${monthId}/jorimana`, {
    method: "POST",
    body,
  });

export const updateJorimana = (
  monthId: string,
  entryId: string,
  body: { day: number; member: string | null; amount: number; done: boolean }
) =>
  api<{ entry: JorimanaData }>(`/months/${monthId}/jorimana/${entryId}`, {
    method: "PUT",
    body,
  });

export const deleteJorimana = (monthId: string, entryId: string) =>
  api<{ message: string }>(`/months/${monthId}/jorimana/${entryId}`, {
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
