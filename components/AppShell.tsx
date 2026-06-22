"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import clsx from "clsx";
import {
  canAccess,
  getServerRoleDefinitionsSnapshot,
  readRoleDefinitionsSnapshot,
  subscribeToRoleDefinitionStore,
  type Role,
} from "@/lib/auth";
import { navItems, roleLabels } from "@/lib/nav";
import { useAuth } from "./AuthProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, switchRole } = useAuth();

  useSyncExternalStore(subscribeToRoleDefinitionStore, readRoleDefinitionsSnapshot, getServerRoleDefinitionsSnapshot);

  if (!user) return <>{children}</>;

  const visibleNav = navItems.filter((item) => canAccess(user.role, item.permission));

  return (
    <div className="min-h-screen bg-[#f7f7f6] text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-200 bg-white p-6 lg:block">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-red text-lg font-bold text-white">M</div>
          <div>
            <p className="text-sm font-semibold text-zinc-950">Minimal RBAC</p>
            <p className="text-xs text-brand-gray">Professional Admin UI</p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center rounded-xl px-4 py-3 text-sm font-medium transition",
                pathname === item.href
                  ? "bg-red-50 text-brand-red"
                  : "text-brand-gray hover:bg-zinc-50 hover:text-zinc-950",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">Signed in as</p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">{user.name}</p>
          <p className="text-xs text-brand-gray">{roleLabels[user.role]}</p>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="mt-4 text-sm font-semibold text-brand-red"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">Workspace</p>
              <h1 className="text-xl font-semibold text-zinc-950">Welcome back, {user.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={user.role}
                onChange={(event) => switchRole(event.target.value as Role)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-brand-gray outline-none focus:border-brand-red"
              >
                <option value="systemAdmin">System Admin</option>
                <option value="approver">Approver</option>
                <option value="salesOrder">Sales Order</option>
              </select>
            </div>
          </div>
        </header>
        <div className="p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
