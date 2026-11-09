"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { registerMess } from "@/lib/auth";

export default function CreateMessPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    messName: "",
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const onChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.messName.trim() || !form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("সব ঘর পূরণ করুন");
      return;
    }
    if (form.password.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
      return;
    }
    setLoading(true);
    try {
      const { user } = await registerMess(form);
      toast.success(`স্বাগতম, ${user.name}! মেস তৈরি হয়েছে।`);
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
        <h1 className="mb-1 text-2xl font-bold">নতুন মেস তৈরি করুন</h1>
        <p className="mb-6 text-sm text-neutral-500">
          আপনি এই মেস-এর কন্ট্রোলার হবেন
        </p>

        <div className="flex flex-col gap-4">
          <Input
            id="messName"
            label="মেসের নাম"
            value={form.messName}
            onChange={onChange("messName")}
            placeholder="যেমন: ডক পাজল"
            required
          />
          <Input
            id="name"
            label="আপনার নাম"
            value={form.name}
            onChange={onChange("name")}
            required
          />
          <Input
            id="email"
            label="ইমেইল"
            type="email"
            value={form.email}
            onChange={onChange("email")}
            required
          />
          <Input
            id="password"
            label="পাসওয়ার্ড"
            type="password"
            value={form.password}
            onChange={onChange("password")}
            required
          />
        </div>

        <Button type="submit" loading={loading} className="mt-6 w-full">
          মেস তৈরি করুন
        </Button>

        <p className="mt-4 text-center text-sm text-neutral-500">
          আগে থেকেই মেস আছে?{" "}
          <Link href="/login" className="text-primary hover:underline">
            লগইন করুন
          </Link>
        </p>
      </form>
    </main>
  );
}
