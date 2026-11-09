"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { addMember, listMembers, updateMember } from "@/lib/mess";
import { roleLabel } from "@/lib/permissions";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import type { Member, Role } from "@/types";

export default function MembersPage() {
  const { user, refresh } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "controller" || user?.role === "manager";

  const load = useCallback(async () => {
    try {
      const { members: data } = await listMembers();
      setMembers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "লোড হয়নি");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addMember({ name, email, password });
      toast.success("মেম্বার যোগ হয়েছে");
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "যোগ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: Member) => {
    try {
      await updateMember(member.id, { isActive: !member.isActive });
      toast.success(member.isActive ? "মেম্বার বাদ দেওয়া হয়েছে" : "মেম্বার ফিরিয়ে আনা হয়েছে");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "করা যায়নি");
    }
  };

  const changeRole = async (member: Member, role: Role) => {
    try {
      await updateMember(member.id, { role });
      toast.success("রোল বদলেছে");
      await load();
      // হাতবদলে নিজের রোলও বদলাতে পারে (পুরোনো কন্ট্রোলার মেম্বার হয়ে যায়)
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "বদলানো যায়নি");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">মেম্বারস</h1>

      {isAdmin && (
        <form
          onSubmit={submit}
          className="mt-6 grid gap-4 card-3d p-4 sm:grid-cols-3"
        >
          <Input
            id="member-name"
            label="নাম"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
          <Input
            id="member-email"
            label="ইমেইল"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="member-password"
            label="পাসওয়ার্ড"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <div className="sm:col-span-3">
            <Button type="submit" loading={saving}>
              মেম্বার যোগ করুন
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="mt-6 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="min-w-40 flex-1">
                <p className={`font-medium ${member.isActive ? "" : "line-through opacity-50"}`}>
                  {member.name}
                </p>
                <p className="text-sm text-neutral-500">{member.email}</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800">
                {roleLabel(member.role)}
              </span>
              {/* রোল সেট করতে পারবে কন্ট্রোলার; আর কন্ট্রোলারের আসন খালি থাকলে ম্যানেজারও */}
              {(user?.role === "controller" ||
                (user?.role === "manager" &&
                  !members.some((m) => m.role === "controller" && m.isActive))) &&
                member.id !== user.id && (
                <select
                  aria-label="রোল বদলান"
                  value={member.role}
                  onChange={(e) => changeRole(member, e.target.value as Role)}
                  className="input-3d px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <option value="controller">কন্ট্রোলার</option>
                  <option value="manager">ম্যানেজার</option>
                  <option value="member">মেম্বার</option>
                </select>
              )}
              {isAdmin && member.role !== "controller" && member.id !== user.id && (
                <Button
                  variant="ghost"
                  onClick={() => toggleActive(member)}
                  className="!px-3 !py-1.5 text-sm"
                >
                  {member.isActive ? "বাদ দিন" : "ফিরিয়ে আনুন"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
