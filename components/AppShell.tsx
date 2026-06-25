"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { BellIcon, UserCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  canAccess,
  getServerRoleDefinitionsSnapshot,
  readRoleDefinitionsSnapshot,
  subscribeToRoleDefinitionStore,
  systemRoleOrder,
  type Role,
} from "@/lib/auth";
import { navGroups, roleLabels } from "@/lib/nav";
import { useAuth } from "./AuthProvider";

const notifications = [
  { id: 1, title: "New sales order submitted", body: "SO-2024-0091 is pending your approval.", time: "2m ago", unread: true },
  { id: 2, title: "Inventory low stock alert", body: "Amoxicillin 500mg is below reorder level.", time: "1h ago", unread: true },
  { id: 3, title: "Customer record updated", body: "MedSupply Co. contact details were changed.", time: "3h ago", unread: false },
  { id: 4, title: "Monthly report ready", body: "June 2025 sales report is available for review.", time: "Yesterday", unread: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, switchRole } = useAuth();

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    () => navGroups.find((group) => group.items.some((item) => item.href === pathname))?.label ?? null,
  );
  const [prevPathname, setPrevPathname] = useState(pathname);

  useSyncExternalStore(subscribeToRoleDefinitionStore, readRoleDefinitionsSnapshot, getServerRoleDefinitionsSnapshot);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return <>{children}</>;

  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(user.role, item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  // When the route changes, open the group that contains it (accordion: one open at a time)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    const activeGroup = visibleNavGroups.find((group) =>
      group.items.some((item) => item.href === pathname),
    );
    if (activeGroup) {
      setExpandedGroup(activeGroup.label);
    }
  }

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="h-screen overflow-hidden bg-[#f7f7f6] text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-200 bg-white p-6 lg:block">
        <div className="flex items-center gap-3">
          <div>
            <Image
              alt="Majesty Pharma ERP"
              className="h-auto w-[172px]"
              height={60}
              priority
              src="./majesty-pharma-web/majesty-pharma-logo.svg"
              width={172}
            />
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-brand-gray">Majesty Pharma ERP</p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {visibleNavGroups.map((group) => {
            const isExpanded = expandedGroup === group.label;
            const toggleGroup = () => {
              setExpandedGroup((prev) => (prev === group.label ? null : group.label));
            };

            return (
              <div key={group.label}>
                <button
                  onClick={toggleGroup}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-gray hover:text-zinc-950 transition rounded-xl hover:bg-zinc-50"
                >
                  <span>{group.label}</span>
                  <ChevronDownIcon
                    className={clsx(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="space-y-1 mt-1 overflow-hidden animate-in fade-in duration-200">
                    {group.items.map((item) => (
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
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">Signed in as</p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">{user.name}</p>
          <p className="text-xs text-brand-gray">{roleLabels[user.role]}</p>
          <div className="mt-4 flex items-center gap-4">
            <Link href="/profile" className="text-sm font-semibold text-zinc-950 hover:text-brand-red transition">
              Profile
            </Link>
            <button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="text-sm font-semibold text-brand-red"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex h-full flex-col lg:pl-72">
        <header className="shrink-0 border-b border-zinc-200 bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="lg:hidden">
                <Image
                  alt="Majesty Pharma ERP"
                  className="h-auto w-[156px]"
                  height={54}
                  priority
                  src="/majesty-pharma-web/majesty-pharma-logo.svg"
                  width={156}
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">Workspace</p>
              <h1 className="text-xl font-semibold text-zinc-950">Welcome back, {user.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => setBellOpen((o) => !o)}
                  className={clsx(
                    "relative flex h-10 w-10 items-center justify-center rounded-xl border transition",
                    bellOpen
                      ? "border-brand-red bg-red-50 text-brand-red"
                      : "border-zinc-200 bg-white text-brand-gray hover:text-zinc-950",
                  )}
                  aria-label="Notifications"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-zinc-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-950">Notifications</p>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-brand-red">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <ul className="divide-y divide-zinc-100">
                      {notifications.map((n) => (
                        <li key={n.id} className={clsx("px-4 py-3", n.unread && "bg-red-50/40")}>
                          <div className="flex items-start gap-3">
                            {n.unread && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-red" />
                            )}
                            {!n.unread && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-950">{n.title}</p>
                              <p className="mt-0.5 text-xs text-brand-gray">{n.body}</p>
                              <p className="mt-1 text-[11px] text-zinc-400">{n.time}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-zinc-100 px-4 py-3">
                      <button className="text-xs font-semibold text-brand-red hover:underline">
                        Mark all as read
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile icon */}
              <Link
                href="/profile"
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition",
                  pathname === "/profile"
                    ? "border-brand-red bg-red-50 text-brand-red"
                    : "border-zinc-200 bg-white text-brand-gray hover:text-zinc-950",
                )}
                aria-label="Profile"
              >
                <UserCircleIcon className="h-5 w-5" />
              </Link>

              <select
                value={user.role}
                onChange={(event) => switchRole(event.target.value as Role)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-brand-gray outline-none focus:border-brand-red"
              >
                {systemRoleOrder.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
