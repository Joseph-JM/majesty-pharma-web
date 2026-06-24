"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getLocationLabelFromCode, locationCodes, vendorOptions } from "@/lib/business";

const tabs = ["Customer Returns", "Vendor Returns"] as const;
type ReturnTab = (typeof tabs)[number];

type DraftLine = { sku: string; description: string; qty: string };
function emptyLine(): DraftLine {
  return { sku: "", description: "", qty: "" };
}

const statusStyles: Record<string, string> = {
  Open: "bg-zinc-100 text-zinc-600",
  Released: "bg-amber-50 text-amber-700",
  Received: "bg-emerald-50 text-emerald-700",
  Shipped: "bg-emerald-50 text-emerald-700",
};

export default function ReturnsPage() {
  const { user } = useAuth();
  const {
    inventoryItems,
    customers,
    salesReturnOrders,
    purchaseReturnOrders,
    warehouseReceipts,
    putAways,
    warehouseShipments,
    boStock,
    createSalesReturnOrder,
    releaseSalesReturnOrder,
    createReceiptFromSRO,
    postWarehouseReceipt,
    postPutAway,
    approveReturnForResale,
    createPurchaseReturnOrder,
    releasePurchaseReturnOrder,
    createShipmentFromPRO,
  } = useBusiness();

  const [activeTab, setActiveTab] = useState<ReturnTab>("Customer Returns");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [vendorNo, setVendorNo] = useState<string>(vendorOptions[0]);
  const [locationCode, setLocationCode] = useState<string>(locationCodes[0]);
  const [disposition, setDisposition] = useState<"BO" | "Resale">("BO");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [formError, setFormError] = useState("");

  const skuOptions = useMemo(() => inventoryItems.map((item) => ({ sku: item.sku, description: item.description })), [inventoryItems]);
  const descriptionBySku = useMemo(() => new Map(inventoryItems.map((item) => [item.sku, item.description])), [inventoryItems]);

  const returnReceipts = useMemo(
    () => warehouseReceipts.filter((receipt) => receipt.sourceType === "SalesReturn"),
    [warehouseReceipts],
  );
  const returnPutAways = useMemo(
    () => putAways.filter((putAway) => putAway.sourceType === "SalesReturn"),
    [putAways],
  );
  const vendorReturnShipments = useMemo(
    () => warehouseShipments.filter((shipment) => shipment.sourceType === "PurchaseReturn"),
    [warehouseShipments],
  );
  const boEntries = useMemo(
    () => Object.entries(boStock).filter(([, qty]) => qty > 0),
    [boStock],
  );

  function resetForm() {
    setCustomerName("");
    setVendorNo(vendorOptions[0]);
    setLocationCode(locationCodes[0]);
    setDisposition("BO");
    setLines([emptyLine()]);
    setFormError("");
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line, i) => {
      if (i !== index) return line;
      const next = { ...line, ...patch };
      if (patch.sku) next.description = descriptionBySku.get(patch.sku) ?? patch.sku;
      return next;
    }));
  }

  function buildLines() {
    return lines
      .filter((line) => line.sku && Number(line.qty) > 0)
      .map((line) => ({ sku: line.sku, description: line.description || line.sku, qty: Number(line.qty) }));
  }

  function submitCustomerReturn() {
    const cleanedLines = buildLines();
    if (!customerName) { setFormError("Select a customer."); return; }
    if (cleanedLines.length === 0) { setFormError("Add at least one line with a SKU and quantity."); return; }

    createSalesReturnOrder({
      customerName,
      returnDate: new Date().toISOString().slice(0, 10),
      locationCode,
      disposition,
      lines: cleanedLines,
    });
    setIsCustomerModalOpen(false);
    resetForm();
  }

  function submitVendorReturn() {
    const cleanedLines = buildLines();
    if (cleanedLines.length === 0) { setFormError("Add at least one line with a SKU and quantity."); return; }

    createPurchaseReturnOrder({
      vendorNo,
      vendorName: vendorNo,
      returnDate: new Date().toISOString().slice(0, 10),
      locationCode,
      lines: cleanedLines,
    });
    setIsVendorModalOpen(false);
    resetForm();
  }

  function handleApproveResale(sroId: string) {
    if (!user) return;
    approveReturnForResale(sroId, { id: user.id, name: user.name });
  }

  return (
    <RequireAuth permission="returns:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Warehouse</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Returns</h2>
          <p className="mt-2 text-brand-gray">Process customer returns into the BO Area with optional resale, and ship vendor returns back to suppliers.</p>
        </div>

        <Card className="border-zinc-200/80 bg-[linear-gradient(135deg,#fffdf8,#f6f1e8)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">Blocked / Bad-Order (BO) Area</p>
          {boEntries.length === 0 ? (
            <p className="mt-2 text-sm text-brand-gray">BO Area is empty.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {boEntries.map(([sku, qty]) => (
                <span key={sku} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-950 ring-1 ring-inset ring-zinc-200">
                  {descriptionBySku.get(sku) ?? sku}: {formatNumber(qty)}
                </span>
              ))}
            </div>
          )}
        </Card>

        <div className="flex gap-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab
                ? "rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Customer Returns" ? (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950">Sales Return Orders</h3>
                  <p className="mt-1 text-sm text-brand-gray">Release, create a warehouse receipt, then approve approved goods for resale.</p>
                </div>
                <button className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700" onClick={() => { resetForm(); setIsCustomerModalOpen(true); }} type="button">Create Sales Return</button>
              </div>
              <div className="mt-5 overflow-hidden rounded-[20px] border border-zinc-200/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                    <tr>
                      <th className="px-4 py-3">SRO</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Disposition</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {salesReturnOrders.map((sro) => (
                      <tr key={sro.id} className="bg-white">
                        <td className="px-4 py-4 font-semibold text-zinc-950">{sro.id}</td>
                        <td className="px-4 py-4 text-brand-gray">{sro.customerName}</td>
                        <td className="px-4 py-4 text-brand-gray">{sro.disposition === "Resale" ? "For Resale" : "Blocked (BO)"}</td>
                        <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[sro.status]}`}>{sro.status}</span></td>
                        <td className="px-4 py-4 text-right">
                          {sro.status === "Open" ? (
                            <button className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50" onClick={() => releaseSalesReturnOrder(sro.id)} type="button">Release</button>
                          ) : sro.status === "Released" ? (
                            <button className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700" onClick={() => createReceiptFromSRO(sro.id)} type="button">Create Receipt</button>
                          ) : (
                            <button className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800" onClick={() => handleApproveResale(sro.id)} type="button">Approve for Resale</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {salesReturnOrders.length === 0 ? (
                      <tr><td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={5}>No sales returns yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <h3 className="text-lg font-semibold text-zinc-950">Return Receipts</h3>
                <div className="mt-4 space-y-3">
                  {returnReceipts.length === 0 ? <div className="rounded-xl bg-zinc-50 p-4 text-sm text-brand-gray">No return receipts yet.</div> : null}
                  {returnReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 p-4">
                      <div>
                        <p className="font-semibold text-zinc-950">{receipt.id}</p>
                        <p className="mt-1 text-xs text-brand-gray">{receipt.partyName} — from {receipt.sourceId}</p>
                      </div>
                      {receipt.status === "Open" ? (
                        <button className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700" onClick={() => postWarehouseReceipt(receipt.id)} type="button">Post Receipt</button>
                      ) : <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Posted</span>}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-zinc-950">Return Put-aways (to BO Area)</h3>
                <div className="mt-4 space-y-3">
                  {returnPutAways.length === 0 ? <div className="rounded-xl bg-zinc-50 p-4 text-sm text-brand-gray">No return put-aways yet.</div> : null}
                  {returnPutAways.map((putAway) => (
                    <div key={putAway.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 p-4">
                      <div>
                        <p className="font-semibold text-zinc-950">{putAway.id}</p>
                        <p className="mt-1 text-xs text-brand-gray">Receiving Dock → {putAway.toArea} — {formatNumber(putAway.lines.reduce((total, line) => total + line.qty, 0))} units</p>
                      </div>
                      {putAway.status === "Open" ? (
                        <button className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700" onClick={() => postPutAway(putAway.id)} type="button">Post Put-away</button>
                      ) : <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Posted</span>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950">Purchase Return Orders</h3>
                  <p className="mt-1 text-sm text-brand-gray">Return defective goods from the BO Area back to suppliers via a warehouse shipment.</p>
                </div>
                <button className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700" onClick={() => { resetForm(); setIsVendorModalOpen(true); }} type="button">Create Vendor Return</button>
              </div>
              <div className="mt-5 overflow-hidden rounded-[20px] border border-zinc-200/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                    <tr>
                      <th className="px-4 py-3">PRO</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {purchaseReturnOrders.map((pro) => (
                      <tr key={pro.id} className="bg-white">
                        <td className="px-4 py-4 font-semibold text-zinc-950">{pro.id}</td>
                        <td className="px-4 py-4 text-brand-gray">{pro.vendorName}</td>
                        <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[pro.status]}`}>{pro.status}</span></td>
                        <td className="px-4 py-4 text-right">
                          {pro.status === "Open" ? (
                            <button className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50" onClick={() => releasePurchaseReturnOrder(pro.id)} type="button">Release</button>
                          ) : pro.status === "Released" ? (
                            <button className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700" onClick={() => createShipmentFromPRO(pro.id)} type="button">Create Shipment</button>
                          ) : <span className="text-xs text-brand-gray">Completed</span>}
                        </td>
                      </tr>
                    ))}
                    {purchaseReturnOrders.length === 0 ? (
                      <tr><td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={4}>No vendor returns yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-zinc-950">Vendor-Return Shipments</h3>
              <p className="mt-1 text-sm text-brand-gray">These flow through Picking → Checking → Dispatch like any shipment; posting deducts BO stock.</p>
              <div className="mt-4 space-y-3">
                {vendorReturnShipments.length === 0 ? <div className="rounded-xl bg-zinc-50 p-4 text-sm text-brand-gray">No vendor-return shipments yet.</div> : null}
                {vendorReturnShipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 p-4">
                    <div>
                      <p className="font-semibold text-zinc-950">{shipment.id} — {shipment.partyName}</p>
                      <p className="mt-1 text-xs text-brand-gray">From {shipment.sourceId} · {getLocationLabelFromCode(shipment.locationCode)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${shipment.status === "Shipped" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{shipment.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Customer return modal */}
      <Modal eyebrow="Returns" isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="Create Sales Return Order" description="Record returned products from a customer for inspection and BO put-away.">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-zinc-950">Customer</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={customerName} onChange={(event) => setCustomerName(event.target.value)}>
                <option value="">Select customer…</option>
                {customers.map((customer) => <option key={customer.id} value={customer.name}>{customer.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Location</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={locationCode} onChange={(event) => setLocationCode(event.target.value)}>
                {locationCodes.map((code) => <option key={code} value={code}>{getLocationLabelFromCode(code)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Disposition</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={disposition} onChange={(event) => setDisposition(event.target.value as "BO" | "Resale")}>
                <option value="BO">Blocked (BO)</option>
                <option value="Resale">For Resale</option>
              </select>
            </div>
          </div>
          {renderLineEditor()}
          {formError ? <p className="text-sm text-brand-red">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <button className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50" onClick={() => setIsCustomerModalOpen(false)} type="button">Cancel</button>
            <button className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700" onClick={submitCustomerReturn} type="button">Save Return</button>
          </div>
        </div>
      </Modal>

      {/* Vendor return modal */}
      <Modal eyebrow="Returns" isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} title="Create Purchase Return Order" description="Return defective or unwanted goods from the BO Area back to a supplier.">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          {renderLineEditor()}
          {formError ? <p className="text-sm text-brand-red">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <button className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50" onClick={() => setIsVendorModalOpen(false)} type="button">Cancel</button>
            <button className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700" onClick={submitVendorReturn} type="button">Save Return</button>
          </div>
        </div>
      </Modal>
    </RequireAuth>
  );

  function renderLineEditor() {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-950">Lines</p>
          <button className="text-sm font-semibold text-brand-red" onClick={() => setLines((current) => [...current, emptyLine()])} type="button">+ Add line</button>
        </div>
        {lines.map((line, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[1.8fr_0.7fr_auto]">
            <select className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-red" value={line.sku} onChange={(event) => updateLine(index, { sku: event.target.value })}>
              <option value="">Select item…</option>
              {skuOptions.map((option) => <option key={option.sku} value={option.sku}>{option.sku} — {option.description}</option>)}
            </select>
            <input type="number" min={0} placeholder="Qty" className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-red" value={line.qty} onChange={(event) => updateLine(index, { qty: event.target.value })} />
            <button className="h-11 rounded-2xl px-3 text-sm font-semibold text-brand-gray transition hover:text-brand-red disabled:opacity-40" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} disabled={lines.length === 1} type="button">Remove</button>
          </div>
        ))}
      </div>
    );
  }
}
