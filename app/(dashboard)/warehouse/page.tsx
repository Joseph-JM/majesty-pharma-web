"use client";

import { useMemo } from "react";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { canAccess } from "@/lib/auth";
import { formatNumber, getLocationLabelFromCode } from "@/lib/business";
import { getBoStockTotal, getShipmentLineTotal } from "@/lib/warehouse";

const stageStyles: Record<string, string> = {
  Open: "bg-zinc-100 text-zinc-600",
  Picked: "bg-amber-50 text-amber-700",
  Checked: "bg-blue-50 text-blue-700",
  Shipped: "bg-emerald-50 text-emerald-700",
};

export default function WarehousePage() {
  const { user } = useAuth();
  const {
    inventoryItems,
    salesOrders,
    warehouseShipments,
    purchaseOrders,
    boStock,
    createShipmentFromSalesOrder,
  } = useBusiness();

  const canManageShipping = user ? canAccess(user.role, "shipping:manage") : false;

  const releasedOrders = useMemo(
    () => salesOrders.filter((order) => order.status === "Released"),
    [salesOrders],
  );

  const shippedSourceIds = useMemo(
    () => new Set(warehouseShipments.filter((shipment) => shipment.sourceType === "Sales").map((shipment) => shipment.sourceId)),
    [warehouseShipments],
  );

  const replenishmentAlerts = useMemo(
    () => inventoryItems.filter((item) => Math.max(item.onHand - item.allocated, 0) === 0 && item.onHand === 0),
    [inventoryItems],
  );

  const pickerProductivity = useMemo(() => {
    const counts = new Map<string, number>();
    warehouseShipments.forEach((shipment) => {
      if (!shipment.pickerName) return;
      counts.set(shipment.pickerName, (counts.get(shipment.pickerName) ?? 0) + 1);
    });
    return Array.from(counts.entries());
  }, [warehouseShipments]);

  const checkerProductivity = useMemo(() => {
    const counts = new Map<string, number>();
    warehouseShipments.forEach((shipment) => {
      if (!shipment.checkerName) return;
      counts.set(shipment.checkerName, (counts.get(shipment.checkerName) ?? 0) + 1);
    });
    return Array.from(counts.entries());
  }, [warehouseShipments]);

  const stats = [
    { label: "Open Purchase Orders", value: formatNumber(purchaseOrders.filter((order) => order.status !== "Received").length) },
    { label: "Active Shipments", value: formatNumber(warehouseShipments.filter((shipment) => shipment.status !== "Shipped").length) },
    { label: "BO Area Units", value: formatNumber(getBoStockTotal(boStock)) },
    { label: "Replenishment Alerts", value: formatNumber(replenishmentAlerts.length) },
  ];

  const lifecycle = [
    { stage: "Open", count: warehouseShipments.filter((shipment) => shipment.status === "Open").length },
    { stage: "Picked", count: warehouseShipments.filter((shipment) => shipment.status === "Picked").length },
    { stage: "Checked", count: warehouseShipments.filter((shipment) => shipment.status === "Checked").length },
    { stage: "Shipped", count: warehouseShipments.filter((shipment) => shipment.status === "Shipped").length },
  ];

  return (
    <RequireAuth permission="warehouse:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Warehouse</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Warehouse Operations</h2>
          <p className="mt-2 text-brand-gray">Inbound receiving, outbound pick-check-dispatch, replenishment, movements, and returns at a glance.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <p className="text-sm text-brand-gray">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{stat.value}</p>
            </Card>
          ))}
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Outbound Shipment Lifecycle</h3>
          <p className="mt-1 text-sm text-brand-gray">Open is created from a released sales order, then flows Picked, Checked, and Shipped.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            {lifecycle.map((item) => (
              <div key={item.stage} className="rounded-xl bg-zinc-50 p-4">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stageStyles[item.stage]}`}>{item.stage}</span>
                <p className="mt-3 text-2xl font-semibold text-zinc-950">{formatNumber(item.count)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950">Outbound Queue</h3>
              <p className="mt-1 text-sm text-brand-gray">Released sales orders ready to be turned into warehouse shipments.</p>
            </div>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">{releasedOrders.length} released</span>
          </div>

          <div className="mt-5 overflow-hidden rounded-[20px] border border-zinc-200/80">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Sales Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Lines</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {releasedOrders.map((order) => {
                  const hasShipment = shippedSourceIds.has(order.id);
                  return (
                    <tr key={order.id} className="bg-white">
                      <td className="px-4 py-4 font-semibold text-zinc-950">{order.id}</td>
                      <td className="px-4 py-4 text-brand-gray">{order.customerName}</td>
                      <td className="px-4 py-4 text-brand-gray">{getLocationLabelFromCode(order.locationCode)}</td>
                      <td className="px-4 py-4 text-brand-gray">{order.lines.length}</td>
                      <td className="px-4 py-4 text-right">
                        {hasShipment ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Shipment created</span>
                        ) : canManageShipping ? (
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                            onClick={() => createShipmentFromSalesOrder(order.id)}
                            type="button"
                          >
                            Create Shipment
                          </button>
                        ) : (
                          <span className="text-xs text-brand-gray">Awaiting warehouse</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {releasedOrders.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={5}>No released sales orders waiting for shipment.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Picker & Checker Productivity</h3>
            <p className="mt-1 text-sm text-brand-gray">Shipments handled, tracked by user ID and timestamp.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Pickers</p>
                <div className="mt-3 space-y-2">
                  {pickerProductivity.length === 0 ? <p className="text-sm text-brand-gray">No picks yet.</p> : null}
                  {pickerProductivity.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-950">{name}</span>
                      <span className="font-semibold text-brand-red">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Checkers</p>
                <div className="mt-3 space-y-2">
                  {checkerProductivity.length === 0 ? <p className="text-sm text-brand-gray">No checks yet.</p> : null}
                  {checkerProductivity.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-950">{name}</span>
                      <span className="font-semibold text-brand-red">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Stock Alerts</h3>
            <p className="mt-1 text-sm text-brand-gray">SKUs with zero picking and bulk stock — escalate to Purchasing/Merchandising.</p>
            <div className="mt-4 space-y-3">
              {replenishmentAlerts.length === 0 ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">All items have available stock.</div>
              ) : null}
              {replenishmentAlerts.map((item) => (
                <div key={item.sku} className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="font-semibold text-brand-red">{item.description}</p>
                  <p className="mt-1 text-sm text-brand-gray">{item.sku} — both picking and bulk locations are at zero.</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Recent Shipments</h3>
          <div className="mt-5 overflow-hidden rounded-[20px] border border-zinc-200/80">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Shipment</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {warehouseShipments.slice(0, 8).map((shipment) => (
                  <tr key={shipment.id} className="bg-white">
                    <td className="px-4 py-4 font-semibold text-zinc-950">{shipment.id}</td>
                    <td className="px-4 py-4 text-brand-gray">{shipment.sourceType === "Sales" ? shipment.sourceId : `Vendor return ${shipment.sourceId}`}</td>
                    <td className="px-4 py-4 text-brand-gray">{shipment.partyName}</td>
                    <td className="px-4 py-4 text-brand-gray">{formatNumber(getShipmentLineTotal(shipment))}</td>
                    <td className="px-4 py-4 text-brand-gray">{shipment.dispatchSchedule}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stageStyles[shipment.status]}`}>{shipment.status}</span>
                    </td>
                  </tr>
                ))}
                {warehouseShipments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={6}>No shipments yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
