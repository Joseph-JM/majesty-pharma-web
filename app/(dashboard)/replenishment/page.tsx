"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getInventoryAvailable, getLocationLabelFromCode } from "@/lib/business";

type Suggestion = {
  sku: string;
  description: string;
  locationCode: string;
  available: number;
  reorderPoint: number;
  suggestedQty: number;
  needsAlert: boolean;
};

export default function ReplenishmentPage() {
  const { user } = useAuth();
  const { inventoryItems, warehouseMovements, createReplenishmentMovement, registerMovement } = useBusiness();
  const [calculated, setCalculated] = useState(false);

  const suggestions = useMemo<Suggestion[]>(() => {
    return inventoryItems
      .map((item) => {
        const available = getInventoryAvailable(item);
        return {
          sku: item.sku,
          description: item.description,
          locationCode: getLocationLabelFromCode(item.location === "Cebu Hub" ? "CEBU" : item.location === "Cold Storage" ? "COLD" : "MAIN"),
          available,
          reorderPoint: item.reorderPoint,
          suggestedQty: Math.max(item.reorderPoint - available, 0),
          needsAlert: available === 0 && item.onHand === 0,
        };
      })
      .filter((suggestion) => suggestion.suggestedQty > 0 || suggestion.needsAlert);
  }, [inventoryItems]);

  const alerts = useMemo(() => suggestions.filter((suggestion) => suggestion.needsAlert), [suggestions]);
  const replenishmentMovements = useMemo(
    () => warehouseMovements.filter((movement) => movement.type === "Replenishment"),
    [warehouseMovements],
  );

  function generateMovement() {
    const lines = suggestions
      .filter((suggestion) => suggestion.suggestedQty > 0)
      .map((suggestion) => ({ sku: suggestion.sku, description: suggestion.description, qty: suggestion.suggestedQty }));
    if (lines.length === 0) return;
    createReplenishmentMovement({ locationCode: "MAIN", lines });
  }

  function handleRegister(movementId: string) {
    if (!user) return;
    registerMovement(movementId, { id: user.id, name: user.name });
  }

  return (
    <RequireAuth permission="replenishment:view">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Warehouse</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Bin Replenishment</h2>
            <p className="mt-2 text-brand-gray">Keep picking bins stocked from reserve/bulk inventory using the Movement Worksheet.</p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            onClick={() => setCalculated(true)}
            type="button"
          >
            Calculate Bin Replenishment
          </button>
        </div>

        {alerts.length > 0 ? (
          <Card className="border-red-100 bg-red-50">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-red">Purchasing / Merchandising Alert</p>
            <p className="mt-2 text-sm text-zinc-950">{alerts.length} item{alerts.length === 1 ? "" : "s"} have both picking and bulk locations at zero stock:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-brand-gray">
              {alerts.map((alert) => <li key={alert.sku}>{alert.description} ({alert.sku})</li>)}
            </ul>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950">Movement Worksheet</h3>
              <p className="mt-1 text-sm text-brand-gray">System-suggested replenishment quantities based on reorder points.</p>
            </div>
            {calculated ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
                onClick={generateMovement}
                disabled={suggestions.filter((suggestion) => suggestion.suggestedQty > 0).length === 0}
                type="button"
              >
                Generate Movement
              </button>
            ) : null}
          </div>

          {calculated ? (
            <div className="mt-5 overflow-hidden rounded-[20px] border border-zinc-200/80">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">Available</th>
                    <th className="px-4 py-3 text-right">Reorder Point</th>
                    <th className="px-4 py-3 text-right">Suggested Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {suggestions.map((suggestion) => (
                    <tr key={suggestion.sku} className={suggestion.needsAlert ? "bg-red-50/40" : "bg-white"}>
                      <td className="px-4 py-3"><span className="font-medium text-zinc-950">{suggestion.description}</span> <span className="text-xs text-brand-gray">({suggestion.sku})</span></td>
                      <td className="px-4 py-3 text-brand-gray">{suggestion.locationCode}</td>
                      <td className="px-4 py-3 text-right text-brand-gray">{formatNumber(suggestion.available)}</td>
                      <td className="px-4 py-3 text-right text-brand-gray">{formatNumber(suggestion.reorderPoint)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-950">{suggestion.suggestedQty > 0 ? formatNumber(suggestion.suggestedQty) : "—"}</td>
                    </tr>
                  ))}
                  {suggestions.length === 0 ? (
                    <tr><td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={5}>All picking bins are sufficiently stocked.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-zinc-50 p-6 text-center text-sm text-brand-gray">Run Calculate Bin Replenishment to see suggestions.</div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Replenishment Movements</h3>
          <p className="mt-1 text-sm text-brand-gray">Move inventory from reserve bins to picking bins, then register the movement.</p>
          <div className="mt-5 space-y-3">
            {replenishmentMovements.map((movement) => (
              <div key={movement.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-zinc-950">{movement.id} — {movement.fromArea} → {movement.toArea}</p>
                  <p className="mt-1 text-xs text-brand-gray">{movement.lines.length} item{movement.lines.length === 1 ? "" : "s"} · {formatNumber(movement.lines.reduce((total, line) => total + line.qty, 0))} units</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${movement.status === "Registered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{movement.status}</span>
                  {movement.status === "Open" ? (
                    <button className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700" onClick={() => handleRegister(movement.id)} type="button">Register</button>
                  ) : null}
                </div>
              </div>
            ))}
            {replenishmentMovements.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-4 text-sm text-brand-gray">No replenishment movements generated yet.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
