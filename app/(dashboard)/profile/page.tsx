"use client";

import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { roleLabels } from "@/lib/nav";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <RequireAuth permission="profile:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Profile</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Personal Information</h2>
          <p className="mt-2 text-brand-gray">A cleaner account view with the minimal personal details your team would usually need on hand.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <Card className="overflow-hidden p-0">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(227,187,75,0.22),_transparent_38%),linear-gradient(135deg,#fffdf8,#f6f1e8)] px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-20 w-20 place-items-center rounded-[26px] bg-brand-red text-2xl font-bold text-white shadow-[0_12px_30px_rgba(228,9,9,0.22)]">
                    {user?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-gold">Account Snapshot</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{user?.name}</h3>
                    <p className="mt-1 text-sm text-brand-gray">{user?.jobTitle}</p>
                    <p className="mt-1 text-sm text-brand-gray">{user?.email}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Employee No.</p>
                    <p className="mt-2 text-lg font-semibold text-zinc-950">{user?.employeeNo}</p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Location</p>
                    <p className="mt-2 text-lg font-semibold text-zinc-950">{user?.location}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200/80 px-6 py-6 sm:px-8">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Role</p>
                  <p className="mt-2 font-semibold text-zinc-950">{user ? roleLabels[user.role] : "-"}</p>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Department</p>
                  <p className="mt-2 font-semibold text-zinc-950">{user?.department}</p>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Phone No.</p>
                  <p className="mt-2 font-semibold text-zinc-950">{user?.phoneNo}</p>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Mobile No.</p>
                  <p className="mt-2 font-semibold text-zinc-950">{user?.mobileNo}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-zinc-200/80 bg-[linear-gradient(180deg,#ffffff,#faf8f4)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold">Quick Read</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">Profile Overview</h3>
            <p className="mt-2 text-sm leading-6 text-brand-gray">
              This page keeps the profile lightweight while still showing the basic identity and contact details most internal users expect.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-inset ring-zinc-100">
                <span className="text-sm text-brand-gray">Work Email</span>
                <span className="text-sm font-semibold text-zinc-950">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-inset ring-zinc-100">
                <span className="text-sm text-brand-gray">Primary Role</span>
                <span className="text-sm font-semibold text-zinc-950">{user ? roleLabels[user.role] : "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-inset ring-zinc-100">
                <span className="text-sm text-brand-gray">Base Location</span>
                <span className="text-sm font-semibold text-zinc-950">{user?.location}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-inset ring-zinc-100">
                <span className="text-sm text-brand-gray">Contact Line</span>
                <span className="text-sm font-semibold text-zinc-950">{user?.mobileNo}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Identity Details</h3>
            <p className="mt-1 text-sm text-brand-gray">Core information used to identify the signed-in employee in the workspace.</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Full Name</dt>
                <dd className="mt-2 font-semibold text-zinc-950">{user?.name}</dd>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Employee No.</dt>
                <dd className="mt-2 font-semibold text-zinc-950">{user?.employeeNo}</dd>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Job Title</dt>
                <dd className="mt-2 font-semibold text-zinc-950">{user?.jobTitle}</dd>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Department</dt>
                <dd className="mt-2 font-semibold text-zinc-950">{user?.department}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Contact Details</h3>
            <p className="mt-1 text-sm text-brand-gray">Minimal contact information for basic internal coordination.</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Email Address</dt>
                <dd className="mt-2 font-semibold text-zinc-950">{user?.email}</dd>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Phone No.</dt>
                <dd className="mt-2 font-semibold text-zinc-950">{user?.phoneNo}</dd>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Mobile No.</dt>
                <dd className="mt-2 font-semibold text-zinc-950">{user?.mobileNo}</dd>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Location</dt>
                <dd className="mt-2 font-semibold text-zinc-950">{user?.location}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </RequireAuth>
  );
}
