"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      toast.error("ইমেইল ও পাসওয়ার্ড দিন");
      return;
    }
    setLoading(true);
    try {
      const { user } = await login(form);
      toast.success(`স্বাগতম, ${user.name}!`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "কিছু একটা ভুল হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        onSubmit={submit}
        className="card-3d w-full max-w-sm p-6"
      >
        <h1 className="mb-1 text-2xl font-bold">লগইন করুন</h1>
        <p className="mb-6 text-sm text-neutral-500">
          আপনার মেসে প্রবেশ করুন
        </p>

        <div className="flex flex-col gap-4">
          <Input
            id="email"
            label="ইমেইল"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            id="password"
            label="পাসওয়ার্ড"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <Button type="submit" loading={loading} className="mt-6 w-full">
          লগইন
        </Button>

        <p className="mt-4 text-center text-sm text-neutral-500">
          নতুন মেস খুলতে চান?{" "}
          <Link href="/create-mess" className="text-primary hover:underline">
            মেস তৈরি করুন
          </Link>
        </p>
      </form>
    </main>
  );
}
