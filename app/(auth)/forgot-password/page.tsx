"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-5">
      <section className="w-full max-w-md rounded-xl2 border border-zinc-100 bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Account Recovery</p>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-950">Forgot Password</h1>
        <p className="mt-2 text-sm text-brand-gray">Enter your email and we will send reset instructions.</p>

        {!sent ? (
          <form onSubmit={handleSubmit} className="mt-6">
            <label className="text-sm font-medium text-zinc-950">Email address</label>
            <Input className="mt-2" type="email" placeholder="name@company.com" required />
            <Button className="mt-6 w-full" type="submit">Send Reset Link</Button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-brand-gray">
            Reset link sent. For demo, continue to the <Link className="font-semibold text-brand-red" href="/reset-password">reset page</Link>.
          </div>
        )}

        <Link className="mt-6 inline-block text-sm font-semibold text-brand-red" href="/login">Back to login</Link>
      </section>
    </main>
  );
}
