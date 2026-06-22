"use client";

import { useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { RequireAuth } from "@/components/RequireAuth";
import { formatCurrency, formatNumber, getInventoryAvailable } from "@/lib/business";

const inventoryHealthStyles = {
  Healthy: "bg-emerald-50 text-emerald-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-brand-red",
};

export default function InventoryPage() {
  const { demandBySku, inventoryItems, inventorySummary, receiveInventory } = useBusiness();
  const [selectedSku, setSelectedSku] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState("100");

  const activeSku = selectedSku || inventoryItems[0]?.sku || "";

  function submitReceipt() {
    const quantity = Number(receiveQuantity);
    if (!activeSku || !quantity || quantity <= 0) return;

    receiveInventory(activeSku, quantity);
    setReceiveQuantity("100");
  }

  return (
    <RequireAuth permission="inventory:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Warehouse</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Inventory</h2>
          <p className="mt-2 text-brand-gray">Receive stock, monitor demand, and protect fulfillment capacity by location and item.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-sm text-brand-gray">Inventory Value</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatCurrency(inventorySummary.inventoryValue)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">Available Units</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(inventorySummary.totalAvailableUnits)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">Low Stock Items</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(inventorySummary.lowStockCount)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">Critical Replenishment</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(inventorySummary.criticalCount)}</p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Receive Inventory</h3>
            <p className="mt-1 text-sm text-brand-gray">Post a simple receipt to increase on-hand stock and improve order coverage.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr,0.7fr,auto]">
              <div>
                <label className="text-sm font-medium text-zinc-950">Item</label>
                <select
                  value={activeSku}
                  onChange={(event) => setSelectedSku(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red focus:ring-4 focus:ring-red-50"
                >
                  {inventoryItems.map((item) => (
                    <option key={item.sku} value={item.sku}>
                      {item.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-950">Qty Received</label>
                <Input
                  className="mt-2"
                  type="number"
                  min="1"
                  value={receiveQuantity}
                  onChange={(event) => setReceiveQuantity(event.target.value)}
                />
              </div>
              <div className="self-end">
                <Button className="w-full md:w-auto" onClick={submitReceipt} type="button">
                  Post Receipt
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Replenishment Priorities</h3>
            <div className="mt-4 space-y-3">
              {inventoryItems
                .filter((item) => item.health !== "Healthy")
                .map((item) => (
                  <div key={item.sku} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-zinc-950">{item.description}</p>
                        <p className="mt-1 text-brand-gray">
                          Available {formatNumber(getInventoryAvailable(item))} • Demand {formatNumber(demandBySku[item.sku] ?? 0)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inventoryHealthStyles[item.health]}`}>
                        {item.health}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950">Item Availability</h3>
              <p className="mt-1 text-sm text-brand-gray">Demand now reflects live sales order quantities, including newly created documents.</p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-4 py-2 text-sm text-brand-gray">
              {formatNumber(inventoryItems.length)} tracked SKUs
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.14em] text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Item No.</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3 text-right">Demand</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {inventoryItems.map((item) => (
                  <tr key={item.sku} className="bg-white">
                    <td className="px-4 py-4 font-semibold text-zinc-950">{item.sku}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-zinc-950">{item.description}</p>
                      <p className="mt-1 text-xs text-brand-gray">
                        {item.category} • Next receipt {item.nextReceipt}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-brand-gray">{item.location}</td>
                    <td className="px-4 py-4 text-right text-zinc-950">{formatNumber(item.onHand)}</td>
                    <td className="px-4 py-4 text-right text-brand-gray">{formatNumber(item.allocated)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-zinc-950">{formatNumber(getInventoryAvailable(item))}</td>
                    <td className="px-4 py-4 text-right text-brand-gray">{formatNumber(demandBySku[item.sku] ?? 0)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inventoryHealthStyles[item.health]}`}>
                        {item.health}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button className="h-9 px-4 text-xs" onClick={() => receiveInventory(item.sku, 100)} type="button">
                        Receive 100
                      </Button>
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
