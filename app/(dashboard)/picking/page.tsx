"use client";

import { useMemo } from "react";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getLocationLabelFromCode } from "@/lib/business";
import { getShipmentLineTotal } from "@/lib/warehouse";

export default function PickingPage() {
  const { user } = useAuth();
  const { warehouseShipments, postPick } = useBusiness();

  const openShipments = useMemo(
    () => warehouseShipments.filter((shipment) => shipment.status === "Open"),
    [warehouseShipments],
  );

  const myPicks = useMemo(
    () => warehouseShipments.filter((shipment) => shipment.pickerId && shipment.pickerId === user?.id),
    [warehouseShipments, user?.id],
  );

  function handlePick(shipmentId: string) {
    if (!user) return;
    postPick(shipmentId, { id: user.id, name: user.name });
  }

  return (
    <RequireAuth permission="picking:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Outbound · Picking</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Warehouse Picking</h2>
          <p className="mt-2 text-brand-gray">Pick items from assigned bins, move them to the Checking Area, and post the pick transaction.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-sm text-brand-gray">Open to Pick</p><p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(openShipments.length)}</p></Card>
          <Card><p className="text-sm text-brand-gray">My Picks</p><p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(myPicks.length)}</p></Card>
          <Card><p className="text-sm text-brand-gray">Picker</p><p className="mt-3 text-xl font-semibold text-zinc-950">{user?.name ?? "—"}</p></Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Pick Queue</h3>
          <p className="mt-1 text-sm text-brand-gray">Shipments waiting to be picked from bins.</p>
          <div className="mt-5 space-y-4">
            {openShipments.map((shipment) => (
              <div key={shipment.id} className="rounded-[20px] border border-zinc-200/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-zinc-950">{shipment.id} — {shipment.partyName}</p>
                    <p className="mt-1 text-xs text-brand-gray">
                      {shipment.sourceType === "Sales" ? shipment.sourceId : `Vendor return ${shipment.sourceId}`} · {getLocationLabelFromCode(shipment.locationCode)} · {formatNumber(getShipmentLineTotal(shipment))} units
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                    onClick={() => handlePick(shipment.id)}
                    type="button"
                  >
                    Post Pick → Checking
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                      <tr><th className="px-4 py-2">Item</th><th className="px-4 py-2">Bin</th><th className="px-4 py-2 text-right">Qty</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {shipment.lines.map((line) => (
                        <tr key={line.sku}>
                          <td className="px-4 py-2"><span className="font-medium text-zinc-950">{line.description}</span> <span className="text-xs text-brand-gray">({line.sku})</span></td>
                          <td className="px-4 py-2 text-brand-gray">{line.fromBin}</td>
                          <td className="px-4 py-2 text-right text-brand-gray">{formatNumber(line.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {openShipments.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-6 text-center text-sm text-brand-gray">No shipments waiting to be picked.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
