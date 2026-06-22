"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { RequireAuth } from "@/components/RequireAuth";
import {
  calculateReservedPercent,
  calculateSalesOrderAmount,
  calculateSalesOrderLineCount,
  formatCurrency,
  formatNumber,
  getSuggestedUnitPrice,
  locations,
  paymentTermsOptions,
  toISODate,
} from "@/lib/business";

const salesOrderStatusStyles = {
  Open: "bg-amber-50 text-amber-700",
  Released: "bg-blue-50 text-blue-700",
  "Pending Approval": "bg-zinc-100 text-zinc-700",
  "Ready to Ship": "bg-emerald-50 text-emerald-700",
  Posted: "bg-zinc-900 text-white",
};

type DraftLine = {
  sku: string;
  quantity: string;
  unitPrice: string;
};

function getDefaultShipmentDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toISODate(tomorrow);
}

export default function SalesOrdersPage() {
  const { user } = useAuth();
  const { createSalesOrder, inventoryItems, reserveSalesOrder, salesOrders, salesOrderSummary, postSalesOrder } = useBusiness();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [location, setLocation] = useState<string>(locations[0]);
  const [shipmentDate, setShipmentDate] = useState(getDefaultShipmentDate);
  const [paymentTerms, setPaymentTerms] = useState<string>(paymentTermsOptions[2]);
  const [draftLine, setDraftLine] = useState<DraftLine>({ sku: "", quantity: "1", unitPrice: "" });
  const [draftLines, setDraftLines] = useState<Array<{ sku: string; description: string; quantity: number; unitPrice: number }>>([]);

  const selectedSku = draftLine.sku || inventoryItems[0]?.sku || "";
  const selectedItem = inventoryItems.find((item) => item.sku === selectedSku);
  const computedPrice = draftLine.unitPrice || (selectedItem ? String(getSuggestedUnitPrice(selectedItem)) : "");
  const draftTotal = useMemo(
    () => draftLines.reduce((total, line) => total + (line.quantity * line.unitPrice), 0),
    [draftLines],
  );

  const lowStockOrders = salesOrders.filter((order) => order.status !== "Posted" && calculateReservedPercent(order) < 100);

  function addDraftLine() {
    if (!selectedItem) return;

    const quantity = Number(draftLine.quantity);
    const unitPrice = Number(computedPrice);
    if (!quantity || quantity <= 0 || !unitPrice || unitPrice <= 0) return;

    setDraftLines((current) => [
      ...current,
      {
        sku: selectedItem.sku,
        description: selectedItem.description,
        quantity,
        unitPrice,
      },
    ]);
    setDraftLine({ sku: "", quantity: "1", unitPrice: "" });
  }

  function removeDraftLine(index: number) {
    setDraftLines((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function submitOrder() {
    if (!customer.trim() || draftLines.length === 0 || !user) return;

    createSalesOrder({
      customer: customer.trim(),
      location,
      shipmentDate,
      paymentTerms,
      salesperson: user.name,
      lines: draftLines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    });

    setCustomer("");
    setLocation(locations[0]);
    setShipmentDate(getDefaultShipmentDate());
    setPaymentTerms(paymentTermsOptions[2]);
    setDraftLine({ sku: "", quantity: "1", unitPrice: "" });
    setDraftLines([]);
    setIsCreateOpen(false);
  }

  return (
    <RequireAuth permission="sales-orders:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Sales</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Sales Orders</h2>
          <p className="mt-2 text-brand-gray">Create documents, reserve stock, and post shipments from a single queue.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-sm text-brand-gray">Open Order Value</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatCurrency(salesOrderSummary.totalOpenAmount)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">Ready to Ship</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(salesOrderSummary.readyToShip)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">Pending Approval</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(salesOrderSummary.awaitingApproval)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">Average Reserved</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{salesOrderSummary.averageReservedPercent}%</p>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950">Order List</h3>
              <p className="mt-1 text-sm text-brand-gray">Reserve stock first, then post the shipment once the order reaches 100% coverage.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl bg-zinc-50 px-4 py-2 text-sm text-brand-gray">
                {formatNumber(salesOrders.filter((order) => order.status !== "Posted").length)} active documents
              </div>
              <Button onClick={() => setIsCreateOpen((current) => !current)} type="button">
                {isCreateOpen ? "Close Form" : "Create Sales Order"}
              </Button>
            </div>
          </div>

          {isCreateOpen ? (
            <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-zinc-950">New Sales Order</h4>
                  <p className="mt-1 text-sm text-brand-gray">Orders above PHP 100,000 start in Pending Approval to mimic a release workflow.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-gray">Interactive</span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-zinc-950">Customer</label>
                  <Input className="mt-2" value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Branch or customer name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-950">Shipment Date</label>
                  <Input className="mt-2" type="date" value={shipmentDate} onChange={(event) => setShipmentDate(event.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-950">Location</label>
                  <select
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red focus:ring-4 focus:ring-red-50"
                  >
                    {locations.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-950">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(event) => setPaymentTerms(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red focus:ring-4 focus:ring-red-50"
                  >
                    {paymentTermsOptions.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-zinc-100 bg-white p-4">
                <div className="grid gap-4 md:grid-cols-[1.4fr,0.7fr,0.7fr,auto]">
                  <div>
                    <label className="text-sm font-medium text-zinc-950">Item</label>
                    <select
                      value={selectedSku}
                      onChange={(event) => setDraftLine((current) => ({ ...current, sku: event.target.value, unitPrice: "" }))}
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
                    <label className="text-sm font-medium text-zinc-950">Qty</label>
                    <Input
                      className="mt-2"
                      type="number"
                      min="1"
                      value={draftLine.quantity}
                      onChange={(event) => setDraftLine((current) => ({ ...current, quantity: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-950">Unit Price</label>
                    <Input
                      className="mt-2"
                      type="number"
                      min="1"
                      step="0.01"
                      value={computedPrice}
                      onChange={(event) => setDraftLine((current) => ({ ...current, unitPrice: event.target.value }))}
                    />
                  </div>
                  <div className="self-end">
                    <Button className="w-full md:w-auto" type="button" onClick={addDraftLine}>
                      Add Line
                    </Button>
                  </div>
                </div>
                {selectedItem ? (
                  <p className="mt-3 text-xs text-brand-gray">
                    Available stock: {formatNumber(Math.max(selectedItem.onHand - selectedItem.allocated, 0))} units
                  </p>
                ) : null}
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase tracking-[0.14em] text-brand-gray">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {draftLines.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-brand-gray" colSpan={5}>
                          Add at least one line to create a sales order.
                        </td>
                      </tr>
                    ) : (
                      draftLines.map((line, index) => (
                        <tr key={`${line.sku}-${index}`}>
                          <td className="px-4 py-4">
                            <p className="font-medium text-zinc-950">{line.description}</p>
                            <p className="mt-1 text-xs text-brand-gray">{line.sku}</p>
                          </td>
                          <td className="px-4 py-4 text-right text-zinc-950">{formatNumber(line.quantity)}</td>
                          <td className="px-4 py-4 text-right text-zinc-950">{formatCurrency(line.unitPrice)}</td>
                          <td className="px-4 py-4 text-right font-semibold text-zinc-950">{formatCurrency(line.quantity * line.unitPrice)}</td>
                          <td className="px-4 py-4 text-right">
                            <button className="text-sm font-semibold text-brand-red" onClick={() => removeDraftLine(index)} type="button">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-brand-gray">
                  Draft Total: <span className="font-semibold text-zinc-950">{formatCurrency(draftTotal)}</span>
                </div>
                <div className="flex gap-3">
                  <Button className="bg-zinc-900 hover:bg-zinc-700 focus:ring-zinc-200" onClick={() => setIsCreateOpen(false)} type="button">
                    Cancel
                  </Button>
                  <Button disabled={!customer.trim() || draftLines.length === 0} onClick={submitOrder} type="button">
                    Create Sales Order
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.14em] text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Order No.</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Shipment Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {salesOrders.map((order) => {
                  const reservedPercent = calculateReservedPercent(order);
                  const orderAmount = calculateSalesOrderAmount(order);
                  const canPost = reservedPercent === 100 && order.status !== "Posted";
                  const reserveActionLabel = order.status === "Pending Approval" ? "Approve & Reserve" : "Reserve Stock";

                  return (
                    <tr key={order.id} className="bg-white">
                      <td className="px-4 py-4 font-semibold text-zinc-950">{order.id}</td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-zinc-950">{order.customer}</p>
                        <p className="mt-1 text-xs text-brand-gray">
                          {order.paymentTerms} / {calculateSalesOrderLineCount(order)} lines / {order.salesperson}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-brand-gray">{order.shipmentDate}</td>
                      <td className="px-4 py-4 text-brand-gray">{order.location}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${salesOrderStatusStyles[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-28">
                          <div className="flex items-center justify-between text-xs text-brand-gray">
                            <span>{reservedPercent}%</span>
                            <span>{formatNumber(order.lines.reduce((total, line) => total + line.reservedQty, 0))} units</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-zinc-100">
                            <div className="h-2 rounded-full bg-brand-red" style={{ width: `${reservedPercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-zinc-950">{formatCurrency(orderAmount)}</td>
                      <td className="px-4 py-4 text-right">
                        {order.status === "Posted" ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Complete</span>
                        ) : canPost ? (
                          <Button className="h-9 px-4 text-xs" onClick={() => postSalesOrder(order.id)} type="button">
                            Post Shipment
                          </Button>
                        ) : (
                          <Button className="h-9 px-4 text-xs" onClick={() => reserveSalesOrder(order.id)} type="button">
                            {reserveActionLabel}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Release Queue</h3>
          <div className="mt-4 space-y-3 text-sm">
            {lowStockOrders.slice(0, 4).map((order) => (
              <div key={order.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <p className="font-semibold text-zinc-950">{order.id}</p>
                <p className="mt-1 text-brand-gray">
                  {order.customer} / {calculateReservedPercent(order)}% reserved
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
