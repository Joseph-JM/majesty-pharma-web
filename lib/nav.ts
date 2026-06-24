import type { Role } from "./auth";

export type NavItem = {
  label: string;
  href: string;
  permission: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", permission: "dashboard:view" },
    ],
  },
  {
    label: "Sales & Customers",
    items: [
      { label: "Sales Orders", href: "/sales-orders", permission: "sales-orders:view" },
      { label: "For Approval", href: "/for-approval", permission: "for-approval:view" },
      { label: "Customers", href: "/customers", permission: "customers:view" },
    ],
  },
  {
    label: "Inventory & Warehouse",
    items: [
      { label: "Inventory", href: "/inventory", permission: "inventory:view" },
      { label: "Warehouse", href: "/warehouse", permission: "warehouse:view" },
    ],
  },
  {
    label: "Warehouse Operations",
    items: [
      { label: "Receiving", href: "/receiving", permission: "receiving:view" },
      { label: "Picking", href: "/picking", permission: "picking:view" },
      { label: "Checking", href: "/checking", permission: "checking:view" },
      { label: "Dispatch", href: "/dispatch", permission: "dispatch:view" },
      { label: "Replenishment", href: "/replenishment", permission: "replenishment:view" },
      { label: "Movements", href: "/movements", permission: "movements:view" },
      { label: "Returns", href: "/returns", permission: "returns:view" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Admin", href: "/admin", permission: "admin:view" },
      { label: "Settings", href: "/settings", permission: "settings:view" },
    ],
  },
];

// Flatten for backwards compatibility
export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

export const roleLabels: Record<Role, string> = {
  systemAdmin: "System Admin",
  approver: "Approver",
  salesOrder: "Sales Order",
  picker: "Picker",
  checker: "Checker",
  dispatch: "Dispatch Team",
};
