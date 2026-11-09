import type { AppUser, Role } from "@/types";

const roleLabels: Record<Role, string> = {
  controller: "কন্ট্রোলার",
  manager: "ম্যানেজার",
  member: "মেম্বার",
};

export function roleLabel(role: Role): string {
  return roleLabels[role] ?? "";
}

export function canEditEverything(user: AppUser | null): boolean {
  return user?.role === "controller";
}

export function canEditManagerSection(user: AppUser | null): boolean {
  return user?.role === "controller" || user?.role === "manager";
}

export function canViewManagerSection(user: AppUser | null): boolean {
  return user !== null; // members see only their own data (enforced on the server)
}
