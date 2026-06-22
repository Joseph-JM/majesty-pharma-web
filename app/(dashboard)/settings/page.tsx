"use client";

import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";

const colors = [
  { name: "Bright Red", value: "#E40909" },
  { name: "Gold", value: "#E3BB4B" },
  { name: "Dark Gray", value: "#565656" },
  { name: "White", value: "#FFFFFF" },
];

export default function SettingsPage() {
  return (
    <RequireAuth permission="settings:view">
      <div className="max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Settings</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Theme & Preferences</h2>
          <p className="mt-2 text-brand-gray">Minimal theme using the provided brand colors.</p>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Theme Palette</h3>
          <p className="mt-1 text-sm text-brand-gray">Applied as Tailwind brand tokens for consistent UI usage.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {colors.map((color) => (
              <div key={color.value} className="rounded-xl border border-zinc-100 p-4">
                <div className="h-16 rounded-xl border border-zinc-100" style={{ backgroundColor: color.value }} />
                <p className="mt-3 text-sm font-semibold text-zinc-950">{color.name}</p>
                <p className="text-xs text-brand-gray">{color.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Design Direction</h3>
          <div className="mt-4 grid gap-3 text-sm text-brand-gray sm:grid-cols-3">
            <div className="rounded-xl bg-zinc-50 p-4">Clean spacing</div>
            <div className="rounded-xl bg-zinc-50 p-4">Neutral surfaces</div>
            <div className="rounded-xl bg-zinc-50 p-4">Red primary action</div>
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
