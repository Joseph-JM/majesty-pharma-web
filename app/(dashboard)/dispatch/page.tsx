"use client";

import { useMemo } from "react";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getLocationLabelFromCode } from "@/lib/business";
import { CUTOFF_HOUR, getShipmentLineTotal } from "@/lib/warehouse";

export default function DispatchPage() {
  const { user } = useAuth();
  const { warehouseShipments, postShipment } = useBusiness();

  const checkedShipments = useMemo(
    () => warehouseShipments.filter((shipment) => shipment.status === "Checked"),
    [warehouseShipments],
  );

  const shippedToday = useMemo(
    () => warehouseShipments.filter((shipment) => shipment.status === "Shipped").length,
    [warehouseShipments],
  );

  function handleDispatch(shipmentId: string) {
    if (!user) return;
    postShipment(shipmentId, { id: user.id, name: user.name });
  }

  return (
    <RequireAuth permission="dispatch:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Outbound · Dispatch</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Dispatch & Loading</h2>
          <p className="mt-2 text-brand-gray">Verify shipment completeness, load goods to the delivery vehicle, and post the warehouse shipment.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-sm text-brand-gray">Ready to Dispatch</p><p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(checkedShipments.length)}</p></Card>
          <Card><p className="text-sm text-brand-gray">Shipped</p><p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(shippedToday)}</p></Card>
          <Card>
            <p className="text-sm text-brand-gray">Daily Cut-off</p>
            <p className="mt-3 text-xl font-semibold text-zinc-950">{CUTOFF_HOUR}:00</p>
            <p className="mt-1 text-xs text-brand-gray">Orders after cut-off ship next day.</p>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Pre-Dispatch Area</h3>
          <p className="mt-1 text-sm text-brand-gray">Checked & packed shipments ready for loading and dispatch.</p>
          <div className="mt-5 space-y-4">
            {checkedShipments.map((shipment) => (
              <div key={shipment.id} className="rounded-[20px] border border-zinc-200/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-zinc-950">{shipment.id} — {shipment.partyName}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${shipment.dispatchSchedule === "Today" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{shipment.dispatchSchedule}</span>
                    </div>
                    <p className="mt-1 text-xs text-brand-gray">
                      Checked by {shipment.checkerName || "—"} · {getLocationLabelFromCode(shipment.locationCode)} · {formatNumber(getShipmentLineTotal(shipment))} units
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                    onClick={() => handleDispatch(shipment.id)}
                    type="button"
                  >
                    Post Shipment
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                      <tr><th className="px-4 py-2">Item</th><th className="px-4 py-2 text-right">Qty</th></tr>
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
            {checkedShipments.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-6 text-center text-sm text-brand-gray">No shipments ready for dispatch.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
