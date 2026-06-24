"use client";

import { useMemo } from "react";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getLocationLabelFromCode } from "@/lib/business";
import { getShipmentLineTotal } from "@/lib/warehouse";

export default function CheckingPage() {
  const { user } = useAuth();
  const { warehouseShipments, postChecking } = useBusiness();

  const pickedShipments = useMemo(
    () => warehouseShipments.filter((shipment) => shipment.status === "Picked"),
    [warehouseShipments],
  );

  const myChecks = useMemo(
    () => warehouseShipments.filter((shipment) => shipment.checkerId && shipment.checkerId === user?.id),
    [warehouseShipments, user?.id],
  );

  function handleCheck(shipmentId: string) {
    if (!user) return;
    postChecking(shipmentId, { id: user.id, name: user.name });
  }

  return (
    <RequireAuth permission="checking:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Outbound · Checking</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Checking & Packing</h2>
          <p className="mt-2 text-brand-gray">Verify item, quantity, and quality, pack the goods, and move them to the Pre-Dispatch Area.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-sm text-brand-gray">Awaiting Check</p><p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(pickedShipments.length)}</p></Card>
          <Card><p className="text-sm text-brand-gray">My Checks</p><p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(myChecks.length)}</p></Card>
          <Card><p className="text-sm text-brand-gray">Checker</p><p className="mt-3 text-xl font-semibold text-zinc-950">{user?.name ?? "—"}</p></Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Checking Queue</h3>
          <p className="mt-1 text-sm text-brand-gray">Picked shipments in the Checking Area awaiting verification and packing.</p>
          <div className="mt-5 space-y-4">
            {pickedShipments.map((shipment) => (
              <div key={shipment.id} className="rounded-[20px] border border-zinc-200/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-zinc-950">{shipment.id} — {shipment.partyName}</p>
                    <p className="mt-1 text-xs text-brand-gray">
                      Picked by {shipment.pickerName || "—"} · {getLocationLabelFromCode(shipment.locationCode)} · {formatNumber(getShipmentLineTotal(shipment))} units
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                    onClick={() => handleCheck(shipment.id)}
                    type="button"
                  >
                    Post Check & Pack → Pre-Dispatch
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                      <tr><th className="px-4 py-2">Item</th><th className="px-4 py-2 text-right">Qty to Verify</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {shipment.lines.map((line) => (
                        <tr key={line.sku}>
                          <td className="px-4 py-2"><span className="font-medium text-zinc-950">{line.description}</span> <span className="text-xs text-brand-gray">({line.sku})</span></td>
                          <td className="px-4 py-2 text-right text-brand-gray">{formatNumber(line.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {pickedShipments.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-6 text-center text-sm text-brand-gray">No shipments waiting to be checked.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
