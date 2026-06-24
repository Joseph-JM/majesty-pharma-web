"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getLocationLabelFromCode, locationCodes } from "@/lib/business";
import { warehouseAreas } from "@/lib/warehouse";

export default function MovementsPage() {
  const { user } = useAuth();
  const { inventoryItems, warehouseMovements, createInternalMovement, registerMovement } = useBusiness();

  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("");
  const [fromArea, setFromArea] = useState<string>(warehouseAreas[1]);
  const [toArea, setToArea] = useState<string>(warehouseAreas[2]);
  const [locationCode, setLocationCode] = useState<string>(locationCodes[0]);
  const [reference, setReference] = useState("");
  const [formError, setFormError] = useState("");

  const internalMovements = useMemo(
    () => warehouseMovements.filter((movement) => movement.type === "Internal"),
    [warehouseMovements],
  );

  function submit() {
    const item = inventoryItems.find((inventoryItem) => inventoryItem.sku === sku);
    const quantity = Number(qty);
    if (!item || quantity <= 0) {
      setFormError("Select an item and enter a quantity greater than zero.");
      return;
    }
    if (fromArea === toArea) {
      setFormError("Source and destination bins must be different.");
      return;
    }

    createInternalMovement({
      fromArea,
      toArea,
      locationCode,
      reference: reference || "Manual movement",
      lines: [{ sku: item.sku, description: item.description, qty: quantity }],
    });

    setSku("");
    setQty("");
    setReference("");
    setFormError("");
  }

  function handleRegister(movementId: string) {
    if (!user) return;
    registerMovement(movementId, { id: user.id, name: user.name });
  }

  return (
    <RequireAuth permission="movements:view">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Warehouse</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Internal Inventory Movement</h2>
          <p className="mt-2 text-brand-gray">Move stock between bins within the same warehouse, then register the movement transaction.</p>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Create Internal Movement</h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-zinc-950">Item</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={sku} onChange={(event) => setSku(event.target.value)}>
                <option value="">Select item…</option>
                {inventoryItems.map((item) => <option key={item.sku} value={item.sku}>{item.sku} — {item.description}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Quantity</label>
              <input type="number" min={0} className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={qty} onChange={(event) => setQty(event.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Location</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={locationCode} onChange={(event) => setLocationCode(event.target.value)}>
                {locationCodes.map((code) => <option key={code} value={code}>{getLocationLabelFromCode(code)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Source Bin</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={fromArea} onChange={(event) => setFromArea(event.target.value)}>
                {warehouseAreas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Destination Bin</label>
              <select className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" value={toArea} onChange={(event) => setToArea(event.target.value)}>
                {warehouseAreas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Reference</label>
              <input className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none focus:border-brand-red" placeholder="Optional note" value={reference} onChange={(event) => setReference(event.target.value)} />
            </div>
          </div>
          {formError ? <p className="mt-3 text-sm text-brand-red">{formError}</p> : null}
          <div className="mt-4 flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700" onClick={submit} type="button">Create Movement</button>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-zinc-950">Internal Movements</h3>
          <p className="mt-1 text-sm text-brand-gray">Release and register movements as warehouse personnel execute them.</p>
          <div className="mt-5 overflow-hidden rounded-[20px] border border-zinc-200/80">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">From → To</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {internalMovements.map((movement) => (
                  <tr key={movement.id} className="bg-white">
                    <td className="px-4 py-4 font-semibold text-zinc-950">{movement.id}</td>
                    <td className="px-4 py-4 text-brand-gray">
                      {movement.lines.map((line) => `${line.description} ×${formatNumber(line.qty)}`).join(", ")}
                    </td>
                    <td className="px-4 py-4 text-brand-gray">{movement.fromArea} → {movement.toArea}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${movement.status === "Registered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{movement.status}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {movement.status === "Open" ? (
                        <button className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-3 text-sm font-semibold text-white transition hover:bg-red-700" onClick={() => handleRegister(movement.id)} type="button">Register</button>
                      ) : <span className="text-xs text-brand-gray">{movement.registeredBy}</span>}
                    </td>
                  </tr>
                ))}
                {internalMovements.length === 0 ? (
                  <tr><td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={5}>No internal movements yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </RequireAuth>
  );
}
