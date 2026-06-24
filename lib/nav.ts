import type { Role } from "./auth";

export type NavItem = {
  label: string;
  href: string;
  permission: string;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", permission: "dashboard:view" },
  { label: "Sales Orders", href: "/sales-orders", permission: "sales-orders:view" },
  { label: "Customers", href: "/customers", permission: "customers:view" },
  { label: "Inventory", href: "/inventory", permission: "inventory:view" },
  { label: "Warehouse", href: "/warehouse", permission: "warehouse:view" },
  { label: "Receiving", href: "/receiving", permission: "receiving:view" },
  { label: "Picking", href: "/picking", permission: "picking:view" },
  { label: "Checking", href: "/checking", permission: "checking:view" },
  { label: "Dispatch", href: "/dispatch", permission: "dispatch:view" },
  { label: "Replenishment", href: "/replenishment", permission: "replenishment:view" },
  { label: "Movements", href: "/movements", permission: "movements:view" },
  { label: "Returns", href: "/returns", permission: "returns:view" },
  { label: "Admin", href: "/admin", permission: "admin:view" },
  { label: "Settings", href: "/settings", permission: "settings:view" },
];

export const roleLabels: Record<Role, string> = {
  systemAdmin: "System Admin",
  approver: "Approver",
  salesOrder: "Sales Order",
  picker: "Picker",
  checker: "Checker",
  dispatch: "Dispatch Team",
};
