"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  canAccess,
  getServerRoleDefinitionsSnapshot,
  readRoleDefinitionsSnapshot,
  subscribeToRoleDefinitionStore,
} from "@/lib/auth";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { user } = useAuth();
  const router = useRouter();

  useSyncExternalStore(subscribeToRoleDefinitionStore, readRoleDefinitionsSnapshot, getServerRoleDefinitionsSnapshot);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [router, user]);

  if (!user) return null;

  if (permission && !canAccess(user.role, permission)) {
    return (
      <div className="rounded-xl2 border border-red-100 bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-red">Access denied</p>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-950">You do not have permission to view this page.</h1>
        <p className="mt-2 text-brand-gray">Please contact your administrator if you believe this is a mistake.</p>
      </div>
    );
  }

  return <>{children}</>;
}
