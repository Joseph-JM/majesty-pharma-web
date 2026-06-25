"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("password");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login(email, password);
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-5">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            alt="Majesty Pharma ERP"
            className="mx-auto h-auto w-full max-w-[280px]"
            height={98}
            priority
            src="https://drive.google.com/file/d/1qaGEBS_pYCzkrVvz26LI99hsgZn9vmyh/view"
            width={280}
          />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">Sign in to your account</h1>
          <p className="mt-2 text-sm text-brand-gray">Majesty Pharma ERP with a clean and professional interface for daily operations.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl2 border border-zinc-100 bg-white p-6 shadow-soft">
          <label className="text-sm font-medium text-zinc-950">Email address</label>
          <Input className="mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <div className="mt-5 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-950">Password</label>
            <Link href="/forgot-password" className="text-sm font-semibold text-brand-red">Forgot password?</Link>
          </div>
          <Input className="mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <Button className="mt-6 w-full" type="submit">Login</Button>

          <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-xs leading-6 text-brand-gray">
            Use <strong>admin@company.com</strong> for System Admin access, <strong>approver@company.com</strong> for the Approver persona, or <strong>sales@company.com</strong> for the Sales Order persona.
          </div>
        </form>
      </section>
    </main>
  );
}
