export type Role = "controller" | "manager" | "member";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  messId: string;
  messName: string;
}

export interface ApiResponse<T> {
  message?: string;
  details?: Record<string, string>;
  user?: T;
  [key: string]: unknown;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface MonthInfo {
  id: string;
  label: string;
  status: "open" | "closed";
}

export interface DailyEntryData {
  id: string;
  memberId: string;
  day: number;
  takaGiven: number;
  takaNote: string;
  mealTaka: number[];
  mealNote: string;
  chalGiven: number;
  chalUsed: number[];
  chalNote: string;
}

export interface BazarEntryData {
  id: string;
  day: number;
  amount: number;
  note: string;
}

export interface BazarListData {
  id: string;
  day: number;
  members: { id: string; name: string }[];
  amount: number;
  done: boolean;
}

export interface JorimanaData {
  id: string;
  day: number;
  member: { id: string; name: string } | null;
  amount: number;
  done: boolean;
}

export interface ExtraEntryData {
  id: string;
  type: "taka" | "chal";
  day: number;
  description: string;
  amount: number;
}

export interface SummaryRow {
  memberId: string;
  name: string;
  role: string;
  takaGiven: number;
  mealTakaTotal: number;
  chalGiven: number;
  chalUsedTotal: number;
  extraTakaShare: number;
  extraChalShare: number;
  // আগের সব মাস থেকে ক্যারি হওয়া জমা
  carryOverTaka: number;
  carryOverChal: number;
  messBillPaid: boolean;
  messBillAmount: number;
  auntyBillPaid: boolean;
  auntyBillAmount: number;
}

export interface MonthSummary {
  month: MonthInfo;
  totals: {
    bazar: number;
    extraTaka: number;
    extraChal: number;
    chalGiven: number;
    chalUsed: number;
    takaGiven: number;
    mealTaka: number;
    balance: number;
    chalBalance: number;
  };
  carryOver: {
    managerTaka: number;
    managerChal: number;
  };
  grandTotals: {
    managerTaka: number;
    managerChal: number;
  };
  suggestedMessShare: number;
  rows: SummaryRow[];
}
