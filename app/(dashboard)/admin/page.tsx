import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";

const users = [
  { name: "Admin User", email: "admin@company.com", role: "Admin" },
  { name: "Standard User", email: "user@company.com", role: "User" },
];

export default function AdminPage() {
  return (
    <RequireAuth permission="admin:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">RBAC</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Admin Access</h2>
          <p className="mt-2 text-brand-gray">Role-based controls for users and permissions.</p>
        </div>

        <Card>
          <div className="overflow-hidden rounded-xl border border-zinc-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {users.map((user) => (
                  <tr key={user.email}>
                    <td className="px-4 py-4 font-medium text-zinc-950">{user.name}</td>
                    <td className="px-4 py-4 text-brand-gray">{user.email}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">{user.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
