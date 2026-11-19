"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { logout, updateProfile } from "@/lib/auth";
import { roleLabel } from "@/lib/permissions";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import PasswordInput from "@/components/shared/PasswordInput";

interface ProfileForm {
  name: string;
  oldEmail: string;
  oldPassword: string;
  newEmail: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyForm: ProfileForm = {
  name: "",
  oldEmail: "",
  oldPassword: "",
  newEmail: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success("লগআউট হয়েছে");
      router.replace("/login");
    } catch {
      toast.error("লগআউট করা যায়নি");
      setLoggingOut(false);
    }
  };

  const set = (patch: Partial<ProfileForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    // কিছু বদলানো হয়নি?
    const changingName = form.name.trim() !== "" && form.name.trim() !== user?.name;
    const changingEmail = form.newEmail.trim() !== "";
    const changingPassword = form.newPassword !== "";

    if (!changingName && !changingEmail && !changingPassword) {
      toast.error("নতুন নাম, ইমেইল বা পাসওয়ার্ড — কিছু একটা লিখুন");
      return;
    }
    if (!form.oldEmail.trim() || !form.oldPassword) {
      toast.error("পুরোনো ইমেইল ও পুরোনো পাসওয়ার্ড দিন");
      return;
    }
    if (changingEmail && form.newEmail.trim() === form.oldEmail.trim()) {
      toast.error("নতুন ইমেইল পুরোনো ইমেইল থেকে আলাদা হতে হবে");
      return;
    }
    if (changingPassword) {
      if (form.newPassword.length < 6) {
        toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        toast.error("দুইবার লেখা পাসওয়ার্ড মিলছে না");
        return;
      }
    }
    // সব ঠিক থাকলে নিশ্চিত করার পপআপ
    setShowConfirm(true);
  };

  const doUpdate = async () => {
    setSaving(true);
    try {
      await updateProfile({
        oldEmail: form.oldEmail.trim(),
        oldPassword: form.oldPassword,
        name: form.name.trim() !== user?.name ? form.name.trim() : undefined,
        newEmail: form.newEmail.trim() || undefined,
        newPassword: form.newPassword || undefined,
      });
      toast.success("প্রোফাইল আপডেট হয়েছে");
      setShowConfirm(false);
      setForm(emptyForm);
      await refresh(); // নেভবারে নতুন নাম/ইমেইল দেখানোর জন্য
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "আপডেট হয়নি");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">আমার প্রোফাইল</h1>

      <div className="card-3d mt-6 p-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-neutral-500">নাম</p>
            <p className="mt-0.5 font-semibold">{user?.name}</p>
          </div>
          <div>
            <p className="text-neutral-500">ইমেইল</p>
            <p className="mt-0.5 font-semibold">{user?.email}</p>
          </div>
          <div>
            <p className="text-neutral-500">পদবি</p>
            <p className="mt-0.5 font-semibold">
              {user ? roleLabel(user.role) : ""}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">মেস</p>
            <p className="mt-0.5 font-semibold">{user?.messName}</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="card-3d mt-4 space-y-4 p-5">
        <h2 className="font-semibold">তথ্য বদলান</h2>
        <p className="text-sm text-neutral-500">
          যা বদলাতে চান শুধু সেটাই পূরণ করুন। যেকোনো বদলের জন্য পুরোনো ইমেইল ও
          পুরোনো পাসওয়ার্ড সঠিকভাবে দিতে হবে।
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="profile-name"
            label="নতুন নাম (ঐচ্ছিক)"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={user?.name}
          />
          <Input
            id="profile-new-email"
            label="নতুন ইমেইল (ঐচ্ছিক)"
            type="email"
            value={form.newEmail}
            onChange={(e) => set({ newEmail: e.target.value })}
          />
          <Input
            id="profile-old-email"
            label="পুরোনো ইমেইল"
            type="email"
            value={form.oldEmail}
            onChange={(e) => set({ oldEmail: e.target.value })}
            required
          />
          <PasswordInput
            id="profile-old-password"
            label="পুরোনো পাসওয়ার্ড"
            value={form.oldPassword}
            onChange={(e) => set({ oldPassword: e.target.value })}
            required
          />
          <PasswordInput
            id="profile-new-password"
            label="নতুন পাসওয়ার্ড (ঐচ্ছিক)"
            value={form.newPassword}
            onChange={(e) => set({ newPassword: e.target.value })}
            minLength={6}
          />
          <PasswordInput
            id="profile-confirm-password"
            label="নতুন পাসওয়ার্ড আবার"
            value={form.confirmPassword}
            onChange={(e) => set({ confirmPassword: e.target.value })}
            minLength={6}
          />
        </div>

        <Button type="submit" className="w-full sm:w-auto">
          সেভ করুন
        </Button>
      </form>

      {/* লগআউট */}
      <div className="card-3d mt-4 p-5">
        <Button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
        >
          লগআউট
        </Button>
      </div>

      {/* নিশ্চিত / বাতিল পপআপ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-neutral-900">
            <h2 className="text-lg font-bold">নিশ্চিত করুন</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              আপনি কি প্রোফাইল আপডেট করতে চান? নিশ্চিত করতে পুরোনো ইমেইল ও
              পাসওয়ার্ড আবার মিলিয়ে দেখা হবে।
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="btn-press rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                বাতিল
              </button>
              <Button onClick={doUpdate} loading={saving}>
                নিশ্চিত
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* লগআউট নিশ্চিত পপআপ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-neutral-900">
            <h2 className="text-lg font-bold">লগআউট করবেন?</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              আপনি এই মেস থেকে লগআউট হয়ে যাবেন।
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="btn-press rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                বাতিল
              </button>
              <Button onClick={doLogout} loading={loggingOut}>
                লগআউট
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
