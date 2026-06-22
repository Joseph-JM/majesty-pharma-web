"use client";

import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useBusiness } from "@/components/BusinessProvider";
import { formatCurrency, formatNumber } from "@/lib/business";

export default function DashboardPage() {
  const { activityLog, inventorySummary, salesOrders, salesOrderSummary } = useBusiness();

  const stats = [
    { label: "Sales Order Backlog", value: formatCurrency(salesOrderSummary.totalOpenAmount) },
    { label: "Released Orders", value: formatNumber(salesOrderSummary.releasedCount) },
    { label: "Inventory Value", value: formatCurrency(inventorySummary.inventoryValue) },
    { label: "Low Stock Items", value: formatNumber(inventorySummary.lowStockCount) },
  ];

  const postedToday = salesOrders.filter((order) => order.status === "Post").length;
  const activeOrders = salesOrders.filter((order) => order.status !== "Post").length;

  return (
    <RequireAuth permission="dashboard:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Operations Dashboard</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Overview</h2>
          <p className="mt-2 text-brand-gray">Live order fulfillment and stock control signals inspired by Business Central workflows.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <p className="text-sm text-brand-gray">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{stat.value}</p>
              <div className="mt-5 h-1.5 rounded-full bg-zinc-100">
                <div className="h-1.5 w-2/3 rounded-full bg-brand-red" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr,0.9fr]">
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-950">Fulfillment Signals</h3>
                <p className="mt-1 text-sm text-brand-gray">A quick read on what the sales and warehouse teams should work next.</p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">Live Module</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Approval Requests</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-950">{formatNumber(salesOrderSummary.approvalRequestCount)}</p>
                <p className="mt-2 text-sm text-brand-gray">Orders that were created and are waiting for approval before release.</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Inventory Coverage</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-950">{salesOrderSummary.averageReservedPercent}%</p>
                <p className="mt-2 text-sm text-brand-gray">Average reservation coverage across active sales documents.</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Available Units</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-950">{formatNumber(inventorySummary.totalAvailableUnits)}</p>
                <p className="mt-2 text-sm text-brand-gray">Stock still free after current sales allocations.</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Attention Queue</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="font-semibold text-brand-red">{formatNumber(inventorySummary.criticalCount)} critical stock issue</p>
                <p className="mt-1 text-brand-gray">At least one SKU is below safe coverage and needs replenishment or transfer.</p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <p className="font-semibold text-zinc-950">{formatNumber(activeOrders)} active sales documents</p>
                <p className="mt-1 text-brand-gray">Move orders from Open to Approval Request, then Released, and finally Post.</p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <p className="font-semibold text-zinc-950">{formatNumber(postedToday)} posted sales orders</p>
                <p className="mt-1 text-brand-gray">Posted documents immediately reduce stock on hand and clear allocations.</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950">Recent Activity</h3>
              <p className="mt-1 text-sm text-brand-gray">Latest events from order entry, reservation, shipment posting, and receipts.</p>
            </div>
            <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">Updated instantly</span>
          </div>
          <div className="mt-6 divide-y divide-zinc-100">
            {activityLog.map((item) => (
              <div key={item} className="flex items-center justify-between gap-4 py-4 text-sm">
                <span className="text-zinc-950">{item}</span>
                <span className="whitespace-nowrap text-brand-gray">Today</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
