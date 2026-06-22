"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { RequireAuth } from "@/components/RequireAuth";
import {
  defaultRoleDefinitions,
  demoUsers,
  getServerRoleDefinitionsSnapshot,
  parseRoleDefinitionsSnapshot,
  readRoleDefinitionsSnapshot,
  saveRoleDefinitions,
  subscribeToRoleDefinitionStore,
  systemRoleOrder,
  type Role,
  type RoleDefinition,
} from "@/lib/auth";
import { roleLabels } from "@/lib/nav";

const adminTabs = ["Users", "Roles", "Permissions"] as const;

type AdminTab = (typeof adminTabs)[number];
type RoleModalMode = "create" | "edit" | "view";
type RoleEditorDraft = {
  key: string;
  label: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
};

const permissionRows = [
  { permission: "admin:view", label: "Access Admin RBAC module" },
  { permission: "dashboard:view", label: "Open dashboard" },
  { permission: "profile:view", label: "Open personal profile" },
  { permission: "customers:view", label: "Open Customer module" },
  { permission: "inventory:view", label: "Open Inventory module" },
  { permission: "sales-orders:view", label: "Open Sales Order workspace" },
  { permission: "sales-orders:manage", label: "Create, edit, and post Sales Orders" },
  { permission: "sales-orders:approve", label: "Approve and release Sales Order requests" },
  { permission: "settings:view", label: "Open system settings" },
  { permission: "settings:edit", label: "Edit system settings" },
];

const tabStyles: Record<AdminTab, string> = {
  Users: "from-[#18181b] to-[#383840] text-white",
  Roles: "from-[#fdf3d7] to-[#fff8ea] text-zinc-950",
  Permissions: "from-[#fff1f1] to-[#fff8f5] text-zinc-950",
};

const toolbarSelectClass =
  "h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-brand-red focus:ring-4 focus:ring-red-50";

function getDefaultRoleDraft(): RoleEditorDraft {
  return {
    key: "",
    label: "",
    description: "",
    permissions: [],
    isSystem: false,
  };
}

function slugifyRoleKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapRoleToDraft(role: RoleDefinition): RoleEditorDraft {
  return {
    key: role.key,
    label: role.label,
    description: role.description,
    permissions: [...role.permissions],
    isSystem: role.isSystem,
  };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("Users");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | Role>("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<RoleModalMode>("view");
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleEditorDraft>(getDefaultRoleDraft);
  const [roleFormError, setRoleFormError] = useState("");

  const roleDefinitionsSnapshot = useSyncExternalStore(
    subscribeToRoleDefinitionStore,
    readRoleDefinitionsSnapshot,
    getServerRoleDefinitionsSnapshot,
  );

  const roleDefinitions = useMemo(
    () => parseRoleDefinitionsSnapshot(roleDefinitionsSnapshot),
    [roleDefinitionsSnapshot],
  );
  const adminUsers = useMemo(() => systemRoleOrder.map((role) => demoUsers[role]), []);
  const departmentOptions = useMemo(
    () => ["All", ...Array.from(new Set(adminUsers.map((user) => user.department)))],
    [adminUsers],
  );
  const filteredAdminUsers = useMemo(() => {
    const normalizedQuery = userSearchQuery.trim().toLowerCase();

    return adminUsers.filter((user) => {
      const matchesQuery = normalizedQuery.length === 0 || [
        user.name,
        user.email,
        user.employeeNo,
        user.jobTitle,
        user.department,
        user.location,
        roleLabels[user.role],
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesDepartment = departmentFilter === "All" || user.department === departmentFilter;

      return matchesQuery && matchesRole && matchesDepartment;
    });
  }, [adminUsers, departmentFilter, roleFilter, userSearchQuery]);
  const usersTotalPages = Math.max(1, Math.ceil(filteredAdminUsers.length / usersPerPage));
  const usersSafeCurrentPage = Math.min(usersCurrentPage, usersTotalPages);
  const paginatedAdminUsers = useMemo(() => {
    const startIndex = (usersSafeCurrentPage - 1) * usersPerPage;
    return filteredAdminUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredAdminUsers, usersPerPage, usersSafeCurrentPage]);
  const usersPageStartItem = filteredAdminUsers.length === 0 ? 0 : ((usersSafeCurrentPage - 1) * usersPerPage) + 1;
  const usersPageEndItem = filteredAdminUsers.length === 0 ? 0 : Math.min(usersSafeCurrentPage * usersPerPage, filteredAdminUsers.length);
  const selectedRoleDefinition = useMemo(
    () => roleDefinitions.find((role) => role.key === selectedRoleKey) ?? null,
    [roleDefinitions, selectedRoleKey],
  );
  const totals = useMemo(() => {
    const systemAdminRole = roleDefinitions.find((role) => role.key === "systemAdmin") ?? defaultRoleDefinitions[0];
    const otherRolePermissions = new Set(
      roleDefinitions
        .filter((role) => role.key !== "systemAdmin")
        .flatMap((role) => role.permissions),
    );

    return {
      roles: roleDefinitions.length,
      permissionRules: permissionRows.length,
      adminOnly: systemAdminRole.permissions.filter((permission) => !otherRolePermissions.has(permission)).length,
    };
  }, [roleDefinitions]);

  function resetRoleEditor() {
    setSelectedRoleKey(null);
    setRoleDraft(getDefaultRoleDraft());
    setRoleFormError("");
  }

  function closeRoleModal() {
    setIsRoleModalOpen(false);
    resetRoleEditor();
  }

  function openCreateRoleModal() {
    setRoleModalMode("create");
    setSelectedRoleKey(null);
    setRoleDraft(getDefaultRoleDraft());
    setRoleFormError("");
    setIsRoleModalOpen(true);
  }

  function openRoleModal(role: RoleDefinition, mode: RoleModalMode) {
    setRoleModalMode(mode);
    setSelectedRoleKey(role.key);
    setRoleDraft(mapRoleToDraft(role));
    setRoleFormError("");
    setIsRoleModalOpen(true);
  }

  function toggleRolePermission(permission: string) {
    if (roleModalMode === "view") return;

    setRoleDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((currentPermission) => currentPermission !== permission)
        : [...current.permissions, permission],
    }));
  }

  function saveRoleDraft() {
    const resolvedLabel = roleDraft.label.trim();
    const resolvedDescription = roleDraft.description.trim();
    const resolvedKey = roleDraft.isSystem ? roleDraft.key : slugifyRoleKey(roleDraft.key || roleDraft.label);

    if (!resolvedLabel) {
      setRoleFormError("Role name is required.");
      return;
    }

    if (!resolvedKey) {
      setRoleFormError("Role code could not be generated. Add a clearer role name or code.");
      return;
    }

    if (roleDraft.permissions.length === 0) {
      setRoleFormError("Select at least one permission for this role.");
      return;
    }

    if (roleModalMode === "create" && roleDefinitions.some((role) => role.key === resolvedKey)) {
      setRoleFormError("That role code already exists. Use a different one.");
      return;
    }

    const nextRole: RoleDefinition = {
      key: resolvedKey,
      label: resolvedLabel,
      description: resolvedDescription,
      permissions: Array.from(new Set(roleDraft.permissions)),
      isSystem: roleDraft.isSystem,
      linkedRole: roleDraft.isSystem ? (resolvedKey as Role) : undefined,
    };

    const nextRoleDefinitions = roleModalMode === "create"
      ? [...roleDefinitions, nextRole]
      : roleDefinitions.map((role) => (role.key === selectedRoleKey ? nextRole : role));

    saveRoleDefinitions(nextRoleDefinitions);
    closeRoleModal();
  }

  return (
    <RequireAuth permission="admin:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">RBAC</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Access & Permissions</h2>
          <p className="mt-2 text-brand-gray">This module is reserved for the System Admin persona and now groups users, roles, and permissions into focused tabs.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-zinc-200/80 bg-[linear-gradient(135deg,#ffffff,#faf7f2)]">
            <p className="text-sm text-brand-gray">System Admin Access</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">Exclusive</p>
          </Card>
          <Card className="border-zinc-200/80 bg-[linear-gradient(135deg,#ffffff,#faf7f2)]">
            <p className="text-sm text-brand-gray">Roles</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{totals.roles}</p>
          </Card>
          <Card className="border-zinc-200/80 bg-[linear-gradient(135deg,#ffffff,#faf7f2)]">
            <p className="text-sm text-brand-gray">Permission Rules</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{totals.permissionRules}</p>
          </Card>
          <Card className="border-zinc-200/80 bg-[linear-gradient(135deg,#ffffff,#faf7f2)]">
            <p className="text-sm text-brand-gray">Admin-Only Controls</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{totals.adminOnly}</p>
          </Card>
        </div>

        <Card className="overflow-hidden border-zinc-200/80 p-0">
          <div className={`bg-[linear-gradient(135deg,var(--tw-gradient-stops))] px-6 py-6 sm:px-8 ${tabStyles[activeTab]}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${activeTab === "Users" ? "text-white/70" : "text-brand-gold"}`}>System Admin Workspace</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">{activeTab}</h3>
                <p className={`mt-2 text-sm leading-6 ${activeTab === "Users" ? "text-white/80" : "text-brand-gray"}`}>
                  {activeTab === "Users"
                    ? "Review the actual personas in the app and the account that represents each one."
                    : activeTab === "Roles"
                      ? "Create roles, edit permission scope, and inspect what each role can access before rollout."
                      : "Inspect the exact permission matrix that powers module access and workflow actions."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {adminTabs.map((tab) => {
                  const isActive = activeTab === tab;

                  return (
                    <button
                      key={tab}
                      className={isActive
                        ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm"
                        : activeTab === "Users"
                          ? "rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                          : "rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-white"}
                      onClick={() => setActiveTab(tab)}
                      type="button"
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {activeTab === "Users" ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-zinc-950">User Directory</h4>
                    <p className="mt-1 text-sm text-brand-gray">System Admin can review persona accounts here with searchable table controls.</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 px-4 py-2 text-sm text-brand-gray">
                    {adminUsers.length} user accounts
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
                  <div>
                    <label className="text-sm font-medium text-zinc-950">Search</label>
                    <input
                      className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-brand-red focus:ring-4 focus:ring-red-50"
                      onChange={(event) => {
                        setUserSearchQuery(event.target.value);
                        setUsersCurrentPage(1);
                      }}
                      placeholder="Search user, email, employee no., title..."
                      value={userSearchQuery}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-950">Role</label>
                    <select
                      className={toolbarSelectClass}
                      onChange={(event) => {
                        setRoleFilter(event.target.value as "All" | Role);
                        setUsersCurrentPage(1);
                      }}
                      value={roleFilter}
                    >
                      <option value="All">All Roles</option>
                      {systemRoleOrder.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-950">Department</label>
                    <select
                      className={toolbarSelectClass}
                      onChange={(event) => {
                        setDepartmentFilter(event.target.value);
                        setUsersCurrentPage(1);
                      }}
                      value={departmentFilter}
                    >
                      {departmentOptions.map((department) => (
                        <option key={department} value={department}>
                          {department === "All" ? "All Departments" : department}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-950">Rows Per Page</label>
                    <select
                      className={toolbarSelectClass}
                      onChange={(event) => {
                        setUsersPerPage(Number(event.target.value));
                        setUsersCurrentPage(1);
                      }}
                      value={usersPerPage}
                    >
                      {[5, 10, 20].map((size) => (
                        <option key={size} value={size}>
                          {size} rows
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-[24px] border border-zinc-200/80 bg-zinc-50/70 px-4 py-4 text-sm text-brand-gray sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Showing {usersPageStartItem} to {usersPageEndItem} of {filteredAdminUsers.length} filtered users
                  </p>
                  <p>
                    Total items: <span className="font-semibold text-zinc-950">{adminUsers.length}</span> / Page{" "}
                    <span className="font-semibold text-zinc-950">{usersSafeCurrentPage}</span> of{" "}
                    <span className="font-semibold text-zinc-950">{usersTotalPages}</span>
                  </p>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Persona</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Job Title</th>
                        <th className="px-4 py-3">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {paginatedAdminUsers.map((user) => (
                        <tr key={user.id} className="bg-white">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-zinc-950">{user.name}</p>
                            <p className="mt-1 text-xs text-brand-gray">{user.employeeNo}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">{roleLabels[user.role]}</span>
                          </td>
                          <td className="px-4 py-4 text-brand-gray">{user.email}</td>
                          <td className="px-4 py-4 text-brand-gray">{user.department}</td>
                          <td className="px-4 py-4 text-brand-gray">{user.jobTitle}</td>
                          <td className="px-4 py-4 text-brand-gray">{user.location}</td>
                        </tr>
                      ))}
                      {paginatedAdminUsers.length === 0 ? (
                        <tr>
                          <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={6}>
                            No users matched your current search and filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-brand-gray">
                    Page <span className="font-semibold text-zinc-950">{usersSafeCurrentPage}</span> of{" "}
                    <span className="font-semibold text-zinc-950">{usersTotalPages}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-50"
                      disabled={usersSafeCurrentPage === 1}
                      onClick={() => setUsersCurrentPage((current) => Math.max(1, current - 1))}
                      type="button"
                    >
                      Previous
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-2xl bg-brand-red px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                      disabled={usersSafeCurrentPage === usersTotalPages || filteredAdminUsers.length === 0}
                      onClick={() => setUsersCurrentPage((current) => Math.min(usersTotalPages, current + 1))}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "Roles" ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-zinc-950">Role Directory</h4>
                    <p className="mt-1 text-sm text-brand-gray">Create new roles, review permission scope, and update each role inside one modal workspace.</p>
                  </div>
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-red px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                    onClick={openCreateRoleModal}
                    type="button"
                  >
                    Create Role
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] border border-zinc-200/80 bg-[linear-gradient(180deg,#fff,#faf8f4)] p-5 shadow-sm">
                    <p className="text-sm text-brand-gray">System Roles</p>
                    <p className="mt-3 text-3xl font-semibold text-zinc-950">{roleDefinitions.filter((role) => role.isSystem).length}</p>
                  </div>
                  <div className="rounded-[24px] border border-zinc-200/80 bg-[linear-gradient(180deg,#fff,#faf8f4)] p-5 shadow-sm">
                    <p className="text-sm text-brand-gray">Custom Roles</p>
                    <p className="mt-3 text-3xl font-semibold text-zinc-950">{roleDefinitions.filter((role) => !role.isSystem).length}</p>
                  </div>
                  <div className="rounded-[24px] border border-zinc-200/80 bg-[linear-gradient(180deg,#fff,#faf8f4)] p-5 shadow-sm">
                    <p className="text-sm text-brand-gray">Permissions Catalog</p>
                    <p className="mt-3 text-3xl font-semibold text-zinc-950">{permissionRows.length}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                        <tr>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Permissions</th>
                          <th className="px-4 py-3">Access Pattern</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {roleDefinitions.map((role) => (
                          <tr key={role.key} className="bg-white align-top">
                            <td className="px-4 py-4">
                              <button
                                className="text-left font-semibold text-brand-red transition hover:text-red-700"
                                onClick={() => openRoleModal(role, "view")}
                                type="button"
                              >
                                {role.label}
                              </button>
                              <p className="mt-1 text-xs text-brand-gray">{role.key}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className={role.isSystem
                                ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
                                : "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"}
                              >
                                {role.isSystem ? "System Role" : "Custom Role"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-brand-gray">{role.description || "No description added yet."}</td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-zinc-950">{role.permissions.length} assigned</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {role.permissions.slice(0, 3).map((permission) => (
                                  <span key={permission} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                                    {permission}
                                  </span>
                                ))}
                                {role.permissions.length > 3 ? (
                                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-brand-red">
                                    +{role.permissions.length - 3} more
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-zinc-950">
                                {role.linkedRole ? roleLabels[role.linkedRole] : "Custom template"}
                              </p>
                              <p className="mt-1 text-xs text-brand-gray">
                                {role.linkedRole
                                  ? "Used by the live persona in the app."
                                  : "Prepared for future user-role assignment."}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50"
                                  onClick={() => openRoleModal(role, "view")}
                                  type="button"
                                >
                                  View
                                </button>
                                <button
                                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                                  onClick={() => openRoleModal(role, "edit")}
                                  type="button"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
                  <div className="rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-sm">
                    <h4 className="text-lg font-semibold text-zinc-950">Role Guidance</h4>
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                        <p className="font-semibold text-brand-red">System roles stay tied to live personas</p>
                        <p className="mt-1 text-brand-gray">You can refine their name, description, and permissions here, but the core persona identity stays protected.</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="font-semibold text-zinc-950">Custom roles are ready for future assignments</p>
                        <p className="mt-1 text-brand-gray">Create template roles now so the team already has reviewed permission bundles when more user types are introduced.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-zinc-200/80 bg-zinc-50/80 p-5">
                    <h4 className="text-lg font-semibold text-zinc-950">Operational Notes</h4>
                    <p className="mt-2 text-sm leading-6 text-brand-gray">
                      Editing a role here updates the permission matrix used by the app. For the three live personas, navigation and access checks now follow the saved role definition.
                    </p>
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-inset ring-zinc-100">
                        <span className="text-sm text-brand-gray">Live persona roles</span>
                        <span className="text-sm font-semibold text-zinc-950">{roleDefinitions.filter((role) => role.linkedRole).length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-inset ring-zinc-100">
                        <span className="text-sm text-brand-gray">Saved role definitions</span>
                        <span className="text-sm font-semibold text-zinc-950">{roleDefinitions.length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-inset ring-zinc-100">
                        <span className="text-sm text-brand-gray">Roles with Admin access</span>
                        <span className="text-sm font-semibold text-zinc-950">
                          {roleDefinitions.filter((role) => role.permissions.includes("admin:view")).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "Permissions" ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-zinc-950">Permission Matrix</h4>
                    <p className="mt-1 text-sm text-brand-gray">A quick matrix of which role can access each module or workflow permission.</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 px-4 py-2 text-sm text-brand-gray">
                    {permissionRows.length} permission checks
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.14em] text-brand-gray">
                        <tr>
                          <th className="px-4 py-3">Permission</th>
                          {roleDefinitions.map((role) => (
                            <th key={role.key} className="px-4 py-3">
                              <div>
                                <p>{role.label}</p>
                                <p className="mt-1 text-[10px] font-medium normal-case tracking-normal text-zinc-400">{role.key}</p>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {permissionRows.map((row) => (
                          <tr key={row.permission} className="bg-white">
                            <td className="px-4 py-4">
                              <p className="font-semibold text-zinc-950">{row.label}</p>
                              <p className="mt-1 text-xs text-brand-gray">{row.permission}</p>
                            </td>
                            {roleDefinitions.map((role) => {
                              const hasPermission = role.permissions.includes(row.permission);

                              return (
                                <td key={`${row.permission}-${role.key}`} className="px-4 py-4">
                                  <span
                                    className={hasPermission
                                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                                      : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500"}
                                  >
                                    {hasPermission ? "Allowed" : "No Access"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Modal
          description={roleModalMode === "create"
            ? "Build a new permission bundle for future use, or align it with one of your operating personas later."
            : roleModalMode === "edit"
              ? "Adjust the role details and permission scope here. Changes to live personas affect access checks across the app."
              : "Review this role in full, including its description and exact permission scope."}
          eyebrow="Admin Roles"
          isOpen={isRoleModalOpen}
          onClose={closeRoleModal}
          title={roleModalMode === "create" ? "Create Role" : roleModalMode === "edit" ? "Edit Role" : "View Role"}
        >
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
              <section className="rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-[0_14px_40px_rgba(24,24,27,0.05)] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold tracking-tight text-zinc-950">Role Setup</h4>
                    <p className="mt-1 text-sm leading-6 text-brand-gray">Basic identity and purpose for this role definition.</p>
                  </div>
                  <span className={roleDraft.isSystem
                    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"}
                  >
                    {roleDraft.isSystem ? "System Role" : "Custom Role"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-950">Role Code</label>
                    <input
                      className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-brand-red focus:ring-4 focus:ring-red-50 disabled:bg-zinc-50 disabled:text-zinc-500"
                      disabled={roleModalMode !== "create"}
                      onChange={(event) => {
                        setRoleDraft((current) => ({ ...current, key: event.target.value }));
                        setRoleFormError("");
                      }}
                      placeholder="Ex. finance-reviewer"
                      value={roleDraft.key}
                    />
                    <p className="mt-2 text-xs leading-5 text-brand-gray">
                      {roleModalMode === "create"
                        ? "Leave this aligned with the role name or enter a custom internal code."
                        : "Role codes are locked after creation to keep permission references stable."}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-950">Role Name</label>
                    <input
                      className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-brand-red focus:ring-4 focus:ring-red-50 disabled:bg-zinc-50 disabled:text-zinc-500"
                      disabled={roleModalMode === "view"}
                      onChange={(event) => {
                        setRoleDraft((current) => ({ ...current, label: event.target.value }));
                        setRoleFormError("");
                      }}
                      placeholder="Ex. Finance Reviewer"
                      value={roleDraft.label}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-950">Description</label>
                    <textarea
                      className="mt-2 min-h-[132px] w-full rounded-[24px] border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-brand-red focus:ring-4 focus:ring-red-50 disabled:bg-zinc-50 disabled:text-zinc-500"
                      disabled={roleModalMode === "view"}
                      onChange={(event) => {
                        setRoleDraft((current) => ({ ...current, description: event.target.value }));
                        setRoleFormError("");
                      }}
                      placeholder="Describe what this role is responsible for."
                      value={roleDraft.description}
                    />
                  </div>

                  <div className="rounded-[24px] border border-zinc-200/80 bg-zinc-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">Current Scope</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-brand-gray">Assigned permissions</span>
                      <span className="text-base font-semibold text-zinc-950">{roleDraft.permissions.length}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <span className="text-sm text-brand-gray">Access type</span>
                      <span className="text-sm font-semibold text-zinc-950">
                        {selectedRoleDefinition?.linkedRole ? roleLabels[selectedRoleDefinition.linkedRole] : roleDraft.isSystem ? "Live persona" : "Custom template"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-[0_14px_40px_rgba(24,24,27,0.05)] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold tracking-tight text-zinc-950">Permissions</h4>
                    <p className="mt-1 text-sm leading-6 text-brand-gray">Choose the modules and workflow actions this role can access.</p>
                  </div>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">
                    {roleDraft.permissions.length} selected
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {permissionRows.map((permissionRow) => {
                    const isSelected = roleDraft.permissions.includes(permissionRow.permission);

                    return (
                      <label
                        key={permissionRow.permission}
                        className={isSelected
                          ? "flex min-h-[108px] cursor-pointer flex-col rounded-[24px] border border-red-200 bg-red-50/80 p-4 transition"
                          : "flex min-h-[108px] cursor-pointer flex-col rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-4 transition hover:border-zinc-300 hover:bg-white"}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            checked={isSelected}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200"
                            disabled={roleModalMode === "view"}
                            onChange={() => toggleRolePermission(permissionRow.permission)}
                            type="checkbox"
                          />
                          <div>
                            <p className="font-semibold text-zinc-950">{permissionRow.label}</p>
                            <p className="mt-2 text-xs leading-5 text-brand-gray">{permissionRow.permission}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-4 rounded-[24px] border border-zinc-200/80 bg-zinc-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  {roleModalMode === "view"
                    ? "Role details are read-only in this mode."
                    : roleDraft.isSystem
                      ? "System roles affect live access for the built-in personas."
                      : "Custom roles are saved for future assignment and permission planning."}
                </p>
                {roleFormError ? <p className="mt-1 text-sm text-brand-red">{roleFormError}</p> : null}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50"
                  onClick={closeRoleModal}
                  type="button"
                >
                  {roleModalMode === "view" ? "Close" : "Cancel"}
                </button>
                {roleModalMode === "view" && selectedRoleDefinition ? (
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-red px-5 text-sm font-semibold text-white transition hover:bg-red-700"
                    onClick={() => openRoleModal(selectedRoleDefinition, "edit")}
                    type="button"
                  >
                    Edit Role
                  </button>
                ) : null}
                {roleModalMode !== "view" ? (
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-red px-5 text-sm font-semibold text-white transition hover:bg-red-700"
                    onClick={saveRoleDraft}
                    type="button"
                  >
                    {roleModalMode === "create" ? "Save Role" : "Update Role"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </RequireAuth>
  );
}
