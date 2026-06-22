"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function ResetPasswordPage() {
  const [updated, setUpdated] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdated(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-5">
      <section className="w-full max-w-md rounded-xl2 border border-zinc-100 bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Secure Reset</p>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-950">Reset Password</h1>
        <p className="mt-2 text-sm text-brand-gray">Create a new password for your account.</p>

        {!updated ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-zinc-950">New password</label>
              <Input className="mt-2" type="password" required />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Confirm password</label>
              <Input className="mt-2" type="password" required />
            </div>
            <Button className="w-full" type="submit">Update Password</Button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-brand-gray">
            Password updated successfully. <Link className="font-semibold text-brand-red" href="/login">Return to login</Link>.
          </div>
        )}
      </section>
    </main>
  );
}
