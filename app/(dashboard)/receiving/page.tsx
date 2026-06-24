"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { RequireAuth } from "@/components/RequireAuth";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getLocationLabelFromCode, locationCodes, vendorOptions } from "@/lib/business";
import { warehouseUomOptions, type WarehouseReceipt } from "@/lib/warehouse";

const poStatusStyles: Record<string, string> = {
  Open: "bg-zinc-100 text-zinc-600",
  Released: "bg-amber-50 text-amber-700",
  "Partially Received": "bg-blue-50 text-blue-700",
  Received: "bg-emerald-50 text-emerald-700",
};

type DraftLine = { sku: string; description: string; uom: string; quantity: string };

function emptyLine(): DraftLine {
  return { sku: "", description: "", uom: "PCS", quantity: "" };
}

export default function ReceivingPage() {
  const {
    purchaseOrders,
    warehouseReceipts,
    putAways,
    inventoryItems,
    createPurchaseOrder,
    releasePurchaseOrder,
    createReceiptFromPO,
    postWarehouseReceipt,
    postPutAway,
  } = useBusiness();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [vendorNo, setVendorNo] = useState<string>(vendorOptions[0]);
  const [locationCode, setLocationCode] = useState<string>(locationCodes[0]);
  const [expectedReceiptDate, setExpectedReceiptDate] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [formError, setFormError] = useState("");
  const [inspectReceipt, setInspectReceipt] = useState<WarehouseReceipt | null>(null);

  const skuOptions = useMemo(() => inventoryItems.map((item) => ({ sku: item.sku, description: item.description })), [inventoryItems]);

  function resetForm() {
    setVendorNo(vendorOptions[0]);
    setLocationCode(locationCodes[0]);
    setExpectedReceiptDate("");
    setLines([emptyLine()]);
    setFormError("");
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line, i) => {
      if (i !== index) return line;
      const next = { ...line, ...patch };
      if (patch.sku) {
        const match = skuOptions.find((option) => option.sku === patch.sku);
        if (match) next.description = match.description;
      }
      return next;
    }));
  }

  function submitPurchaseOrder() {
    const cleanedLines = lines
      .filter((line) => line.sku && Number(line.quantity) > 0)
      .map((line) => ({ sku: line.sku, description: line.description || line.sku, uom: line.uom, quantity: Number(line.quantity) }));

    if (cleanedLines.length === 0) {
      setFormError("Add at least one line with a SKU and quantity.");
      return;
    }

    const vendorName = vendorNo;
    createPurchaseOrder({
      vendorNo,
      vendorName,
      orderDate: new Date().toISOString().slice(0, 10),
      expectedReceiptDate: expectedReceiptDate || new Date().toISOString().slice(0, 10),
      locationCode,
      lines: cleanedLines,
    });

    setIsCreateOpen(false);
    resetForm();
  }

  return (
    <RequireAuth permission="receiving:view">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Inbound</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Purchase Order Receiving</h2>
            <p className="mt-2 text-brand-gray">Receive supplier goods: release POs, create and post warehouse receipts, then post put-aways to make stock available.</p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-red px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
            type="button"
          >
            Create Purchase Order
          </button>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Purchase Orders</h3>
          <div className="mt-5 overflow-hidden rounded-[20px] border border-zinc-200/80">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                <tr>
                  <th className="px-4 py-3">PO</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="bg-white align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-zinc-950">{po.id}</p>
                      <p className="mt-1 text-xs text-brand-gray">{po.lines.length} line{po.lines.length === 1 ? "" : "s"}</p>
                    </td>
                    <td className="px-4 py-4 text-brand-gray">{po.vendorName}</td>
                    <td className="px-4 py-4 text-brand-gray">{getLocationLabelFromCode(po.locationCode)}</td>
                    <td className="px-4 py-4 text-brand-gray">{po.expectedReceiptDate}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${poStatusStyles[po.status]}`}>{po.status}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {po.status === "Open" ? (
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50"
                            onClick={() => releasePurchaseOrder(po.id)}
                            type="button"
                          >
                            Release
                          </button>
                        ) : null}
                        {po.status === "Released" || po.status === "Partially Received" ? (
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700"
                            onClick={() => createReceiptFromPO(po.id)}
                            type="button"
                          >
                            Create Receipt
                          </button>
                        ) : null}
                        {po.status === "Received" ? (
                          <span className="text-xs text-brand-gray">Completed</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 ? (
                  <tr><td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={6}>No purchase orders yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Warehouse Receipts</h3>
            <p className="mt-1 text-sm text-brand-gray">Inspect delivered goods, then post to send them to the Receiving Dock and generate a put-away.</p>
            <div className="mt-5 space-y-3">
              {warehouseReceipts.length === 0 ? (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm text-brand-gray">No receipts created yet.</div>
              ) : null}
              {warehouseReceipts.map((receipt) => (
                <div key={receipt.id} className="rounded-xl border border-zinc-200/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-950">{receipt.id}</p>
                      <p className="mt-1 text-xs text-brand-gray">{receipt.partyName} — from {receipt.sourceId}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${receipt.status === "Posted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{receipt.status}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50"
                      onClick={() => setInspectReceipt(receipt)}
                      type="button"
                    >
                      Inspect
                    </button>
                    {receipt.status === "Open" ? (
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700"
                        onClick={() => postWarehouseReceipt(receipt.id)}
                        type="button"
                      >
                        Post Receipt
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-zinc-950">Put-aways</h3>
            <p className="mt-1 text-sm text-brand-gray">Move goods from the Receiving Dock to storage bins. Posting makes stock available.</p>
            <div className="mt-5 space-y-3">
              {putAways.length === 0 ? (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm text-brand-gray">No put-aways generated yet.</div>
              ) : null}
              {putAways.map((putAway) => (
                <div key={putAway.id} className="rounded-xl border border-zinc-200/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-950">{putAway.id}</p>
                      <p className="mt-1 text-xs text-brand-gray">Receiving Dock to {putAway.toArea} — {formatNumber(putAway.lines.reduce((total, line) => total + line.qty, 0))} units</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${putAway.status === "Posted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{putAway.status}</span>
                  </div>
                  {putAway.status === "Open" ? (
                    <button
                      className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700"
                      onClick={() => postPutAway(putAway.id)}
                      type="button"
                    >
                      Post Put-away
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        eyebrow="Inbound"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Purchase Order"
        description="Raise a purchase order for supplier goods. Release it, then receive against it."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-zinc-950">Vendor</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={vendorNo} onChange={(event) => setVendorNo(event.target.value)}>
                {vendorOptions.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Location</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={locationCode} onChange={(event) => setLocationCode(event.target.value)}>
                {locationCodes.map((code) => <option key={code} value={code}>{getLocationLabelFromCode(code)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Expected Receipt</label>
              <input type="date" className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={expectedReceiptDate} onChange={(event) => setExpectedReceiptDate(event.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-950">Lines</p>
              <button className="text-sm font-semibold text-brand-red" onClick={() => setLines((current) => [...current, emptyLine()])} type="button">+ Add line</button>
            </div>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1.6fr_0.7fr_0.7fr_auto]">
                <select className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-red" value={line.sku} onChange={(event) => updateLine(index, { sku: event.target.value })}>
                  <option value="">Select item…</option>
                  {skuOptions.map((option) => <option key={option.sku} value={option.sku}>{option.sku} — {option.description}</option>)}
                </select>
                <select className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-red" value={line.uom} onChange={(event) => updateLine(index, { uom: event.target.value })}>
                  {warehouseUomOptions.map((uom) => <option key={uom} value={uom}>{uom}</option>)}
                </select>
                <input type="number" min={0} placeholder="Qty" className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-red" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                <button className="h-11 rounded-2xl px-3 text-sm font-semibold text-brand-gray transition hover:text-brand-red disabled:opacity-40" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} disabled={lines.length === 1} type="button">Remove</button>
              </div>
            ))}
          </div>

          {formError ? <p className="text-sm text-brand-red">{formError}</p> : null}

          <div className="flex justify-end gap-3">
            <button className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50" onClick={() => setIsCreateOpen(false)} type="button">Cancel</button>
            <button className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700" onClick={submitPurchaseOrder} type="button">Save Purchase Order</button>
          </div>
        </div>
      </Modal>

      <Modal
        eyebrow="Inbound"
        isOpen={inspectReceipt !== null}
        onClose={() => setInspectReceipt(null)}
        title={inspectReceipt ? `Inspect Receipt ${inspectReceipt.id}` : "Inspect Receipt"}
        description="Validate item, description, UOM, and quantity delivered. Discrepancies should be coordinated with Purchasing."
      >
        {inspectReceipt ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[20px] border border-zinc-200/80">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">UOM</th>
                    <th className="px-4 py-3">Expected</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3">Discrepancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {inspectReceipt.lines.map((line) => {
                    const diff = line.qtyReceived - line.qtyExpected;
                    return (
                      <tr key={line.sku} className="bg-white">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-zinc-950">{line.description}</p>
                          <p className="text-xs text-brand-gray">{line.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-brand-gray">{line.uom}</td>
                        <td className="px-4 py-3 text-brand-gray">{formatNumber(line.qtyExpected)}</td>
                        <td className="px-4 py-3 text-brand-gray">{formatNumber(line.qtyReceived)}</td>
                        <td className="px-4 py-3">
                          {diff === 0 ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Match</span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">{diff > 0 ? `+${diff} over` : `${diff} short`}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50" onClick={() => setInspectReceipt(null)} type="button">Close</button>
              {inspectReceipt.status === "Open" ? (
                <button
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                  onClick={() => { postWarehouseReceipt(inspectReceipt.id); setInspectReceipt(null); }}
                  type="button"
                >
                  Post Receipt
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </RequireAuth>
  );
}
