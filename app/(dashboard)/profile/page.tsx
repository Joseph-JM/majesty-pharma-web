"use client";

import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <RequireAuth permission="profile:view">
      <div className="max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Profile</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Personal Information</h2>
          <p className="mt-2 text-brand-gray">Manage your basic account details.</p>
        </div>

        <Card>
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-red text-xl font-bold text-white">
              {user?.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-950">{user?.name}</h3>
              <p className="text-sm text-brand-gray">{user?.email}</p>
            </div>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-zinc-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Role</dt>
              <dd className="mt-2 font-semibold capitalize text-zinc-950">{user?.role}</dd>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Department</dt>
              <dd className="mt-2 font-semibold text-zinc-950">{user?.department}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </RequireAuth>
  );
}
