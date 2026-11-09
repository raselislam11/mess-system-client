import { api } from "./api";
import type { AppUser } from "@/types";

export interface Credentials {
  email: string;
  password: string;
}

export interface CreateMessInput extends Credentials {
  messName: string;
  name: string;
}

export async function registerMess(
  input: CreateMessInput
): Promise<{ user: AppUser }> {
  return api("/auth/register-mess", { method: "POST", body: input });
}

export async function login(input: Credentials): Promise<{ user: AppUser }> {
  return api("/auth/login", { method: "POST", body: input });
}

export async function logout(): Promise<{ message: string }> {
  return api("/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<{ user: AppUser }> {
  return api("/auth/me");
}
