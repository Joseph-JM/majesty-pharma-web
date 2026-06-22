"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { demoUsers, type Role, type User } from "@/lib/auth";

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  switchRole: (role: Role) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "minimal-rbac-user";
const authListeners = new Set<() => void>();

function emitAuthChange() {
  authListeners.forEach((listener) => listener());
}

function readAuthSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerAuthSnapshot() {
  return null;
}

function parseStoredUser(snapshot: string | null) {
  if (!snapshot) return null;

  try {
    return JSON.parse(snapshot) as User;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null) {
  if (typeof window === "undefined") return;

  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  emitAuthChange();
}

function subscribeToAuthStore(listener: () => void) {
  authListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      authListeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    authListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToAuthStore, readAuthSnapshot, getServerAuthSnapshot);
  const user = useMemo(() => parseStoredUser(snapshot), [snapshot]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    login: (email: string) => {
      const role = email.toLowerCase().includes("admin") ? "admin" : "user";
      const selectedUser = { ...demoUsers[role], email };
      writeStoredUser(selectedUser);
      return true;
    },
    logout: () => {
      writeStoredUser(null);
    },
    switchRole: (role: Role) => {
      writeStoredUser(demoUsers[role]);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
