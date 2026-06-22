import type { Role } from "./auth";

export type NavItem = {
  label: string;
  href: string;
  permission: string;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", permission: "dashboard:view" },
  { label: "Sales Orders", href: "/sales-orders", permission: "sales-orders:view" },
  { label: "Inventory", href: "/inventory", permission: "inventory:view" },
  { label: "Profile", href: "/profile", permission: "profile:view" },
  { label: "Admin", href: "/admin", permission: "admin:view" },
  { label: "Settings", href: "/settings", permission: "settings:view" },
];

export const roleLabels: Record<Role, string> = {
  admin: "Administrator",
  user: "User",
};
