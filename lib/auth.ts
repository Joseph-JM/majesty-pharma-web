export type Role = "admin" | "user";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
};

export const demoUsers: Record<Role, User> = {
  admin: {
    id: "u-001",
    name: "Admin User",
    email: "admin@company.com",
    role: "admin",
    department: "Operations",
  },
  user: {
    id: "u-002",
    name: "Standard User",
    email: "user@company.com",
    role: "user",
    department: "Sales",
  },
};

export const rolePermissions: Record<Role, string[]> = {
  admin: [
    "dashboard:view",
    "admin:view",
    "profile:view",
    "settings:view",
    "settings:edit",
    "sales-orders:view",
    "inventory:view",
  ],
  user: ["dashboard:view", "profile:view", "settings:view", "sales-orders:view", "inventory:view"],
};

export function canAccess(role: Role, permission: string) {
  return rolePermissions[role]?.includes(permission);
}
