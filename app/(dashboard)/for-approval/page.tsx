"use client";

import { useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { RequireAuth } from "@/components/RequireAuth";
import {
  canAccess,
  getServerRoleDefinitionsSnapshot,
  getUserLocationCode,
  readRoleDefinitionsSnapshot,
  subscribeToRoleDefinitionStore,
} from "@/lib/auth";
import {
  calculateSalesOrderInvoiceDiscount,
  calculateSalesOrderSubtotal,
  calculateSalesOrderTotalExclVat,
  calculateSalesOrderTotalInclVat,
  calculateSalesOrderVat,
  formatCurrency,
  formatNumber,
  type SalesOrder,
} from "@/lib/business";

const salesOrderStatusStyles: Record<string, string> = {
  Open: "bg-amber-50 text-amber-700",
  "Approval Request": "bg-zinc-100 text-zinc-700",
  Released: "bg-blue-50 text-blue-700",
  Post: "bg-zinc-900 text-white",
};

export default function ForApprovalPage() {
  const { user } = useAuth();
  const { salesOrders, reserveSalesOrder } = useBusiness();
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);

  useSyncExternalStore(subscribeToRoleDefinitionStore, readRoleDefinitionsSnapshot, getServerRoleDefinitionsSnapshot);

  const canApprove = user ? canAccess(user.role, "sales-orders:approve") : false;
  const userLocationCode = user ? getUserLocationCode(user) : null;

  const pendingOrders = salesOrders.filter((order) => {
    if (order.status !== "Approval Request") return false;
    if (userLocationCode && order.locationCode !== userLocationCode) return false;
    return true;
  });

  const pendingTotal = pendingOrders.reduce((sum, order) => sum + calculateSalesOrderTotalInclVat(order), 0);

  function handleRelease(orderId: string) {
    reserveSalesOrder(orderId);
    if (viewingOrder?.id === orderId) setViewingOrder(null);
  }

  return (
    <RequireAuth permission="for-approval:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Sales</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">For Approval</h2>
          <p className="mt-2 text-brand-gray">
            Orders flagged by the validation engine queue here
            {userLocationCode ? ` for location ${userLocationCode}` : ""}.
            Review the reasons and release each order to continue the warehouse flow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-sm text-brand-gray">Pending Approvals</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(pendingOrders.length)}</p>
          </Card>
          <Card>
            <p className="text-sm text-brand-gray">Pending Total Value</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatCurrency(pendingTotal)}</p>
          </Card>
        </div>

        <Card>
          <div>
            <h3 className="text-lg font-semibold text-zinc-950">Approval Queue</h3>
            <p className="mt-1 text-sm text-brand-gray">
              Orders below were automatically routed here because one or more validation rules failed at creation.
              Click <strong>View</strong> to review order details, then <strong>Release</strong> to continue the warehouse flow.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.14em] text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Order No.</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Salesperson</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3 text-right">Total Incl. VAT</th>
                  <th className="px-4 py-3">Validation Flags</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingOrders.map((order) => (
                  <tr key={order.id} className="bg-white">
                    <td className="px-4 py-4 font-semibold text-zinc-950">{order.id}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-zinc-950">{order.customerName}</p>
                      <p className="mt-0.5 text-xs text-brand-gray">{order.paymentTermsCode}</p>
                    </td>
                    <td className="px-4 py-4 text-brand-gray">{order.salesperson}</td>
                    <td className="px-4 py-4 text-brand-gray">{order.locationCode}</td>
                    <td className="px-4 py-4 text-brand-gray">{order.orderDate}</td>
                    <td className="px-4 py-4 text-right font-semibold text-zinc-950">
                      {formatCurrency(calculateSalesOrderTotalInclVat(order))}
                    </td>
                    <td className="px-4 py-4">
                      {order.approvalReasons && order.approvalReasons.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {order.approvalReasons.map((reason, i) => (
                            <span
                              key={i}
                              className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-brand-gray">–</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                          onClick={() => setViewingOrder(order)}
                          type="button"
                        >
                          View
                        </button>
                        <button
                          className="rounded-full bg-brand-red px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!canApprove}
                          onClick={() => handleRelease(order.id)}
                          type="button"
                        >
                          Release
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingOrders.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={8}>
                      No orders are currently awaiting approval{userLocationCode ? ` for location ${userLocationCode}` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {viewingOrder && (
        <Modal
          description={`Submitted by ${viewingOrder.salesperson} · Order Date: ${viewingOrder.orderDate} · Due: ${viewingOrder.dueDate}`}
          eyebrow="For Approval"
          isOpen
          onClose={() => setViewingOrder(null)}
          size="md"
          title={`Sales Order ${viewingOrder.id}`}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${salesOrderStatusStyles[viewingOrder.status]}`}>
                {viewingOrder.status}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {viewingOrder.locationCode}
              </span>
            </div>

            {viewingOrder.approvalReasons && viewingOrder.approvalReasons.length > 0 && (
              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Validation Flags</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {viewingOrder.approvalReasons.map((reason, i) => (
                    <span
                      key={i}
                      className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-300"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {[
                { label: "Customer", value: viewingOrder.customerName },
                { label: "Contact", value: viewingOrder.contact || "–" },
                { label: "Salesperson", value: viewingOrder.salesperson },
                { label: "Location Code", value: viewingOrder.locationCode },
                { label: "Payment Terms", value: viewingOrder.paymentTermsCode },
                { label: "Currency", value: viewingOrder.currencyCode },
                { label: "Order Date", value: viewingOrder.orderDate },
                { label: "Due Date", value: viewingOrder.dueDate },
                { label: "Shipment Date", value: viewingOrder.shipmentDate },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-zinc-50 px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gray">{label}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-950">{value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-[20px] border border-zinc-200/80 bg-white">
              <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">
                Order Lines ({viewingOrder.lines.length})
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50/70 text-xs uppercase tracking-[0.12em] text-brand-gray">
                    <tr>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {viewingOrder.lines.map((line, i) => (
                      <tr key={i} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3 font-medium text-zinc-950">{line.sku}</td>
                        <td className="px-4 py-3 text-brand-gray">{line.description}</td>
                        <td className="px-4 py-3 text-brand-gray">{line.locationCode}</td>
                        <td className="px-4 py-3 text-right text-zinc-950">{formatNumber(line.quantity)}</td>
                        <td className="px-4 py-3 text-right text-zinc-950">{formatCurrency(line.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-zinc-950">
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-4 text-sm">
                {[
                  { label: "Subtotal Excl. VAT", value: calculateSalesOrderSubtotal(viewingOrder) },
                  { label: "Invoice Discount", value: -calculateSalesOrderInvoiceDiscount(viewingOrder) },
                  { label: "Total Excl. VAT", value: calculateSalesOrderTotalExclVat(viewingOrder) },
                  { label: "VAT (12%)", value: calculateSalesOrderVat(viewingOrder) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-brand-gray">{label}</span>
                    <span className="font-medium text-zinc-950">{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-2">
                  <span className="font-semibold text-zinc-950">Total Incl. VAT</span>
                  <span className="font-semibold text-zinc-950">{formatCurrency(calculateSalesOrderTotalInclVat(viewingOrder))}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="rounded-2xl disabled:opacity-50"
                disabled={!canApprove}
                onClick={() => handleRelease(viewingOrder.id)}
                type="button"
              >
                Release Order
              </Button>
              <Button
                className="rounded-2xl bg-zinc-900 hover:bg-zinc-700 focus:ring-zinc-200"
                onClick={() => setViewingOrder(null)}
                type="button"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </RequireAuth>
  );
}
