export type Role = "systemAdmin" | "approver" | "salesOrder" | "picker" | "checker" | "dispatch";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  jobTitle: string;
  employeeNo: string;
  phoneNo: string;
  mobileNo: string;
  location: string;
};

export type RoleDefinition = {
  key: string;
  label: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  linkedRole?: Role;
};

const ROLE_DEFINITIONS_STORAGE_KEY = "minimal-rbac-role-definitions";
const roleDefinitionListeners = new Set<() => void>();

export const systemRoleOrder: Role[] = ["systemAdmin", "approver", "salesOrder", "picker", "checker", "dispatch"];

export const demoUsers: Record<Role, User> = {
  systemAdmin: {
    id: "u-001",
    name: "System Admin",
    email: "admin@company.com",
    role: "systemAdmin",
    department: "Operations",
    jobTitle: "System Administrator",
    employeeNo: "EMP-001",
    phoneNo: "02-8812-1001",
    mobileNo: "0917-800-1001",
    location: "Makati HQ",
  },
  approver: {
    id: "u-002",
    name: "Sales Order Approver",
    email: "approver@company.com",
    role: "approver",
    department: "Credit and Controls",
    jobTitle: "Sales Order Approver",
    employeeNo: "EMP-002",
    phoneNo: "02-8812-1002",
    mobileNo: "0917-800-1002",
    location: "Makati HQ",
  },
  salesOrder: {
    id: "u-003",
    name: "Sales Order User",
    email: "sales@company.com",
    role: "salesOrder",
    department: "Sales",
    jobTitle: "Sales Order Specialist",
    employeeNo: "EMP-003",
    phoneNo: "02-8812-1003",
    mobileNo: "0917-800-1003",
    location: "Quezon City",
  },
  picker: {
    id: "u-004",
    name: "Warehouse Picker",
    email: "picker@company.com",
    role: "picker",
    department: "Warehouse",
    jobTitle: "Warehouse Picker",
    employeeNo: "EMP-004",
    phoneNo: "02-8812-1004",
    mobileNo: "0917-800-1004",
    location: "Main Warehouse",
  },
  checker: {
    id: "u-005",
    name: "Warehouse Checker",
    email: "checker@company.com",
    role: "checker",
    department: "Warehouse",
    jobTitle: "Warehouse Checker",
    employeeNo: "EMP-005",
    phoneNo: "02-8812-1005",
    mobileNo: "0917-800-1005",
    location: "Main Warehouse",
  },
  dispatch: {
    id: "u-006",
    name: "Dispatch Team Lead",
    email: "dispatch@company.com",
    role: "dispatch",
    department: "Warehouse",
    jobTitle: "Dispatch Coordinator",
    employeeNo: "EMP-006",
    phoneNo: "02-8812-1006",
    mobileNo: "0917-800-1006",
    location: "Main Warehouse",
  },
};

export const rolePermissions: Record<Role, string[]> = {
  systemAdmin: [
    "dashboard:view",
    "admin:view",
    "profile:view",
    "settings:view",
    "settings:edit",
    "sales-orders:view",
    "sales-orders:manage",
    "sales-orders:approve",
    "customers:view",
    "inventory:view",
    "warehouse:view",
    "receiving:view",
    "receiving:manage",
    "shipping:view",
    "shipping:manage",
    "picking:view",
    "picking:manage",
    "checking:view",
    "checking:manage",
    "dispatch:view",
    "dispatch:manage",
    "replenishment:view",
    "replenishment:manage",
    "movements:view",
    "movements:manage",
    "returns:view",
    "returns:manage",
  ],
  approver: [
    "dashboard:view",
    "profile:view",
    "settings:view",
    "sales-orders:view",
    "sales-orders:approve",
    "customers:view",
    "inventory:view",
  ],
  salesOrder: [
    "dashboard:view",
    "profile:view",
    "settings:view",
    "sales-orders:view",
    "sales-orders:manage",
    "customers:view",
    "inventory:view",
  ],
  picker: [
    "dashboard:view",
    "profile:view",
    "warehouse:view",
    "picking:view",
    "picking:manage",
  ],
  checker: [
    "dashboard:view",
    "profile:view",
    "warehouse:view",
    "checking:view",
    "checking:manage",
  ],
  dispatch: [
    "dashboard:view",
    "profile:view",
    "warehouse:view",
    "dispatch:view",
    "dispatch:manage",
  ],
};

export const defaultRoleDefinitions: RoleDefinition[] = [
  {
    key: "systemAdmin",
    label: "System Admin",
    description: "Full platform access including RBAC, settings changes, sales order management, and approval control.",
    permissions: [...rolePermissions.systemAdmin],
    isSystem: true,
    linkedRole: "systemAdmin",
  },
  {
    key: "approver",
    label: "Approver",
    description: "Focuses on reviewing Sales Order approval requests and releasing them when ready.",
    permissions: [...rolePermissions.approver],
    isSystem: true,
    linkedRole: "approver",
  },
  {
    key: "salesOrder",
    label: "Sales Order",
    description: "Handles Sales Order preparation, edits, customer coordination, and posting flow without RBAC access.",
    permissions: [...rolePermissions.salesOrder],
    isSystem: true,
    linkedRole: "salesOrder",
  },
  {
    key: "picker",
    label: "Picker",
    description: "Picks items from assigned bins for warehouse shipments and moves them to the Checking Area.",
    permissions: [...rolePermissions.picker],
    isSystem: true,
    linkedRole: "picker",
  },
  {
    key: "checker",
    label: "Checker",
    description: "Verifies item, quantity, and quality, packs goods, and moves them to the Pre-Dispatch Area.",
    permissions: [...rolePermissions.checker],
    isSystem: true,
    linkedRole: "checker",
  },
  {
    key: "dispatch",
    label: "Dispatch Team",
    description: "Verifies shipment completeness, loads goods to the delivery vehicle, and posts warehouse shipments.",
    permissions: [...rolePermissions.dispatch],
    isSystem: true,
    linkedRole: "dispatch",
  },
];

function emitRoleDefinitionChange() {
  roleDefinitionListeners.forEach((listener) => listener());
}

function uniquePermissions(permissions: unknown) {
  if (!Array.isArray(permissions)) return [];

  return Array.from(
    new Set(
      permissions
        .filter((permission): permission is string => typeof permission === "string")
        .map((permission) => permission.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeStoredRoleDefinition(definition: unknown): RoleDefinition | null {
  if (!definition || typeof definition !== "object") return null;

  const candidate = definition as Partial<RoleDefinition>;
  const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
  const linkedRole = systemRoleOrder.find((role) => role === candidate.linkedRole);

  if (!key || !label) return null;

  return {
    key,
    label,
    description: typeof candidate.description === "string" ? candidate.description.trim() : "",
    permissions: uniquePermissions(candidate.permissions),
    isSystem: Boolean(candidate.isSystem),
    ...(linkedRole ? { linkedRole } : {}),
  };
}

function mergeRoleDefinitions(definitions: RoleDefinition[]) {
  const definitionMap = new Map(definitions.map((definition) => [definition.key, definition]));
  const mergedSystemRoles = systemRoleOrder.map((role) => {
    const defaultDefinition = defaultRoleDefinitions.find((definition) => definition.key === role)!;
    const storedDefinition = definitionMap.get(role);

    return {
      ...defaultDefinition,
      label: storedDefinition?.label || defaultDefinition.label,
      description: storedDefinition?.description ?? defaultDefinition.description,
      permissions: storedDefinition?.permissions?.length ? uniquePermissions(storedDefinition.permissions) : [...defaultDefinition.permissions],
      isSystem: true,
      linkedRole: role,
    } satisfies RoleDefinition;
  });

  const customRoles = definitions
    .filter((definition) => !systemRoleOrder.includes(definition.key as Role))
    .map((definition) => ({
      ...definition,
      description: definition.description.trim(),
      permissions: uniquePermissions(definition.permissions),
      isSystem: false,
      linkedRole: undefined,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [...mergedSystemRoles, ...customRoles];
}

export function readRoleDefinitionsSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_DEFINITIONS_STORAGE_KEY);
}

export function getServerRoleDefinitionsSnapshot() {
  return null;
}

export function parseRoleDefinitionsSnapshot(snapshot: string | null) {
  if (!snapshot) return defaultRoleDefinitions;

  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) return defaultRoleDefinitions;

    const normalizedDefinitions = parsed
      .map((definition) => normalizeStoredRoleDefinition(definition))
      .filter((definition): definition is RoleDefinition => definition !== null);

    return mergeRoleDefinitions(normalizedDefinitions);
  } catch {
    return defaultRoleDefinitions;
  }
}

export function getRoleDefinitions() {
  return parseRoleDefinitionsSnapshot(readRoleDefinitionsSnapshot());
}

export function saveRoleDefinitions(definitions: RoleDefinition[]) {
  if (typeof window === "undefined") return;

  const mergedDefinitions = mergeRoleDefinitions(definitions);
  window.localStorage.setItem(ROLE_DEFINITIONS_STORAGE_KEY, JSON.stringify(mergedDefinitions));
  emitRoleDefinitionChange();
}

export function subscribeToRoleDefinitionStore(listener: () => void) {
  roleDefinitionListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      roleDefinitionListeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ROLE_DEFINITIONS_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    roleDefinitionListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getPermissionsForRole(role: Role | string) {
  const matchingRole = getRoleDefinitions().find((definition) => definition.key === role || definition.linkedRole === role);
  return matchingRole?.permissions ?? [];
}

export function canAccess(role: Role, permission: string) {
  return getPermissionsForRole(role).includes(permission);
}

export function normalizeRole(role: string | undefined): Role {
  if (role === "admin" || role === "systemAdmin") return "systemAdmin";
  if (role === "approver") return "approver";
  if (role === "picker") return "picker";
  if (role === "checker") return "checker";
  if (role === "dispatch") return "dispatch";
  if (role === "user" || role === "salesOrder") return "salesOrder";
  return "salesOrder";
}
