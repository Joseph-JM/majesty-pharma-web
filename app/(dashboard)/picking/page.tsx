"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getLocationLabelFromCode } from "@/lib/business";
import { getUserLocationCode } from "@/lib/auth";
import { getShipmentLineTotal, type WarehouseShipment } from "@/lib/warehouse";

const stepLabels = ["Start Picking", "Generate Pick List", "Register Picked Qty", "Move to Checking"];

function StepBadge({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {stepLabels.map((label, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-red text-white" : "bg-zinc-100 text-zinc-400"
            }`}
          >
            {i < step ? "✓" : i + 1}
          </span>
          <span className={`hidden text-xs font-medium sm:block ${i === step ? "text-zinc-950" : "text-brand-gray"}`}>
            {label}
          </span>
          {i < stepLabels.length - 1 && <span className="mx-1 text-zinc-200">›</span>}
        </div>
      ))}
    </div>
  );
}

type PickedQtyMap = Record<string, Record<string, string>>;

function ActivePickCard({
  shipment,
  pickedQtyInputs,
  onQtyChange,
  onRegister,
  onMoveToChecking,
}: {
  shipment: WarehouseShipment;
  pickedQtyInputs: Record<string, string>;
  onQtyChange: (sku: string, value: string) => void;
  onRegister: () => void;
  onMoveToChecking: () => void;
}) {
  const hasRegistered = shipment.lines.some((l) => l.pickedQty > 0);
  const allInputsFilled = shipment.lines.every((l) => {
    const raw = pickedQtyInputs[l.sku];
    return raw !== undefined ? raw.trim() !== "" : l.pickedQty > 0;
  });

  return (
    <div className="rounded-[20px] border border-zinc-200/80 bg-white">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-zinc-950">{shipment.id}</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                Picking in Progress
              </span>
            </div>
            <p className="mt-1 text-sm text-brand-gray">
              {shipment.partyName} · {getLocationLabelFromCode(shipment.locationCode)} · {shipment.sourceId}
            </p>
            <p className="mt-0.5 text-xs text-brand-gray">
              Assigned to: <span className="font-medium text-zinc-950">{shipment.pickerName}</span> · {shipment.pickedAt}
            </p>
          </div>
          <StepBadge step={hasRegistered ? 3 : 2} />
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">Pick List — {formatNumber(getShipmentLineTotal(shipment))} units total</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
              <tr>
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Bin / Location</th>
                <th className="px-4 py-2.5 text-right">Ordered Qty</th>
                <th className="px-4 py-2.5 text-right">Picked Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shipment.lines.map((line) => {
                const inputVal = pickedQtyInputs[line.sku] ?? (line.pickedQty > 0 ? String(line.pickedQty) : "");
                const parsedVal = Number(inputVal);
                const isOver = inputVal !== "" && parsedVal > line.qty;

                return (
                  <tr key={line.sku} className="bg-white">
                    <td className="px-4 py-3 font-medium text-zinc-950">{line.sku}</td>
                    <td className="px-4 py-3 text-brand-gray">{line.description}</td>
                    <td className="px-4 py-3 text-brand-gray">{line.fromBin}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-950">{formatNumber(line.qty)}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        className={`w-24 rounded-lg border px-2.5 py-1.5 text-right text-sm font-semibold outline-none transition ${
                          isOver
                            ? "border-red-300 bg-red-50 text-red-700 focus:border-red-400"
                            : inputVal !== "" && parsedVal >= 0
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 focus:border-emerald-400"
                            : "border-zinc-200 bg-white text-zinc-950 focus:border-brand-red"
                        }`}
                        min={0}
                        max={line.qty}
                        onChange={(e) => onQtyChange(line.sku, e.target.value)}
                        placeholder={String(line.qty)}
                        type="number"
                        value={inputVal}
                      />
                      {isOver && (
                        <p className="mt-0.5 text-[10px] text-red-600">Exceeds ordered qty</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!allInputsFilled}
            onClick={onRegister}
            type="button"
          >
            Save Picked Quantities
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasRegistered}
            onClick={onMoveToChecking}
            title={!hasRegistered ? "Register picked quantities first" : undefined}
            type="button"
          >
            Move to Checking →
          </button>
          {!hasRegistered && (
            <p className="text-xs text-amber-600">Save quantities before moving to Checking.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PickingPage() {
  const { user } = useAuth();
  const { salesOrders, warehouseShipments, startPickForOrder, registerPickedQty, postPick } = useBusiness();
  const [pickedQtyInputs, setPickedQtyInputs] = useState<PickedQtyMap>({});

  const userLocationCode = user ? getUserLocationCode(user) : null;

  const releasedOrders = useMemo(
    () =>
      salesOrders.filter((so) => {
        if (so.status !== "Released") return false;
        if (userLocationCode && so.locationCode !== userLocationCode) return false;
        return !warehouseShipments.some(
          (ws) => ws.sourceType === "Sales" && ws.sourceId === so.id && ws.status !== "Shipped",
        );
      }),
    [salesOrders, warehouseShipments, userLocationCode],
  );

  const myActivePicks = useMemo(
    () => warehouseShipments.filter((ws) => ws.status === "Picking" && ws.pickerId === user?.id),
    [warehouseShipments, user?.id],
  );

  const otherActivePicks = useMemo(
    () => warehouseShipments.filter((ws) => ws.status === "Picking" && ws.pickerId !== user?.id),
    [warehouseShipments, user?.id],
  );

  function handleStartPick(orderId: string) {
    if (!user) return;
    startPickForOrder(orderId, { id: user.id, name: user.name });
  }

  function handleQtyChange(shipmentId: string, sku: string, value: string) {
    setPickedQtyInputs((prev) => ({
      ...prev,
      [shipmentId]: { ...(prev[shipmentId] ?? {}), [sku]: value },
    }));
  }

  function handleRegister(shipment: WarehouseShipment) {
    const inputs = pickedQtyInputs[shipment.id] ?? {};
    const pickedLines = shipment.lines.map((line) => ({
      sku: line.sku,
      pickedQty: inputs[line.sku] !== undefined ? Number(inputs[line.sku]) : line.pickedQty,
    }));
    registerPickedQty(shipment.id, pickedLines);
    setPickedQtyInputs((prev) => {
      const next = { ...prev };
      delete next[shipment.id];
      return next;
    });
  }

  function handleMoveToChecking(shipmentId: string) {
    if (!user) return;
    postPick(shipmentId, { id: user.id, name: user.name });
  }

  return (
    <RequireAuth permission="picking:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Outbound · Picking</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Warehouse Picking</h2>
          <p className="mt-2 text-brand-gray">
            Start picks from released sales orders, register per-line quantities, then move to Checking.
            {userLocationCode ? ` Showing orders for ${getLocationLabelFromCode(userLocationCode)}.` : ""}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm text-brand-gray">Released — Awaiting Pick</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(releasedOrders.length)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">My Active Picks</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(myActivePicks.length)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">Picker</p>
            <p className="mt-3 text-xl font-semibold text-zinc-950">{user?.name ?? "—"}</p>
          </Card>
        </div>

        {/* Step 1: Released SOs awaiting pick */}
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950">Released Orders — Awaiting Pick</h3>
              <p className="mt-1 text-sm text-brand-gray">
                Click <strong>Start Picking</strong> to assign yourself and generate the pick list.
              </p>
            </div>
            <StepBadge step={0} />
          </div>

          <div className="mt-5 space-y-3">
            {releasedOrders.map((order) => (
              <div key={order.id} className="rounded-[20px] border border-zinc-200/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-zinc-950">{order.id} — {order.customerName}</p>
                    <p className="mt-1 text-xs text-brand-gray">
                      {getLocationLabelFromCode(order.locationCode)} · {order.lines.length} line{order.lines.length === 1 ? "" : "s"} ·{" "}
                      {formatNumber(order.lines.reduce((s, l) => s + l.quantity, 0))} total units · Due {order.dueDate}
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                    onClick={() => handleStartPick(order.id)}
                    type="button"
                  >
                    Start Picking
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.14em] text-brand-gray">
                      <tr>
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {order.lines.map((line) => (
                        <tr key={line.sku}>
                          <td className="px-4 py-2 font-medium text-zinc-950">{line.sku}</td>
                          <td className="px-4 py-2 text-brand-gray">{line.description}</td>
                          <td className="px-4 py-2 text-right text-brand-gray">{formatNumber(line.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {releasedOrders.length === 0 && (
              <div className="rounded-xl bg-zinc-50 p-6 text-center text-sm text-brand-gray">
                No released orders awaiting a pick.
              </div>
            )}
          </div>
        </Card>

        {/* Steps 2–4: My Active Picks (pick list, register qty, move to checking) */}
        {myActivePicks.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950">My Active Picks</h3>
              <p className="mt-1 text-sm text-brand-gray">
                Enter the actual quantity picked per line, save, then move to Checking.
              </p>
            </div>
            {myActivePicks.map((shipment) => (
              <ActivePickCard
                key={shipment.id}
                shipment={shipment}
                pickedQtyInputs={pickedQtyInputs[shipment.id] ?? {}}
                onQtyChange={(sku, value) => handleQtyChange(shipment.id, sku, value)}
                onRegister={() => handleRegister(shipment)}
                onMoveToChecking={() => handleMoveToChecking(shipment.id)}
              />
            ))}
          </div>
        )}

        {/* Other pickers' active picks (read-only) */}
        {otherActivePicks.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Picks in Progress — Other Pickers</h3>
            <p className="mt-1 text-sm text-brand-gray">These picks are assigned to other team members.</p>
            <div className="mt-4 space-y-3">
              {otherActivePicks.map((shipment) => (
                <div key={shipment.id} className="rounded-[20px] border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-zinc-950">{shipment.id} — {shipment.partyName}</p>
                      <p className="mt-0.5 text-xs text-brand-gray">
                        {getLocationLabelFromCode(shipment.locationCode)} · {shipment.sourceId} ·{" "}
                        {formatNumber(getShipmentLineTotal(shipment))} units
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-brand-gray">
                      Assigned: <span className="font-medium text-zinc-950">{shipment.pickerName}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </RequireAuth>
  );
}
