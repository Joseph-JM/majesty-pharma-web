"use client";

import { useMemo, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { RequireAuth } from "@/components/RequireAuth";
import {
  assemblyPolicyOptions,
  baseUnitOfMeasureOptions,
  exciseTaxTypeOptions,
  formatCurrency,
  formatNumber,
  getInventoryAvailable,
  getInventoryHealth,
  inventoryItemCategoryOptions,
  inventoryItemTypeOptions,
  inventoryLocationOptions,
  itemTrackingCodeOptions,
  lotNumberOptions,
  orderTrackingPolicyOptions,
  overReceiptCodeOptions,
  physInventoryCountingPeriodOptions,
  putAwayTemplateOptions,
  replenishmentSystemOptions,
  reorderingPolicyOptions,
  serialNumberOptions,
  subscriptionOptions,
  toISODate,
  vendorOptions,
  warehouseClassCodeOptions,
  yesNoDefaultOptions,
  yesNoOptions,
  type CreateInventoryItemInput,
  type InventoryItem,
} from "@/lib/business";

const inventoryHealthStyles = {
  Healthy: "bg-emerald-50 text-emerald-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-brand-red",
};

const selectClass =
  "mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none transition focus:border-brand-red focus:ring-4 focus:ring-red-50";

const toolbarSelectClass =
  "h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-brand-red focus:ring-4 focus:ring-red-50";

const sectionCardClass =
  "rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(24,24,27,0.05)] sm:p-5";

const sectionTitleClass = "text-base font-semibold tracking-tight text-zinc-950";
const sectionDescriptionClass = "mt-1 text-sm leading-5 text-brand-gray";

type InventoryDraft = Omit<InventoryItem, "health">;

function calculateProfitPercent(unitPrice: number, unitCost: number) {
  if (unitPrice <= 0) return 0;
  return Number((((unitPrice - unitCost) / unitPrice) * 100).toFixed(2));
}

function getDefaultInventoryDraft(): InventoryDraft {
  return {
    sku: "",
    description: "",
    blocked: false,
    itemType: inventoryItemTypeOptions[0],
    baseUnitOfMeasure: baseUnitOfMeasureOptions[0],
    category: inventoryItemCategoryOptions[0],
    itemCategoryCode: inventoryItemCategoryOptions[0],
    variantMandatoryIfExists: yesNoDefaultOptions[0],
    location: inventoryLocationOptions[0],
    shelfNo: "",
    onHand: 0,
    allocated: 0,
    qtyOnPurchOrder: 0,
    reorderPoint: 0,
    stockoutWarning: yesNoDefaultOptions[0],
    unitVolume: 0,
    overReceiptCode: overReceiptCodeOptions[0],
    unitPrice: 0,
    unitCost: 0,
    profitPercent: 0,
    salesPricesAndDiscounts: "Create New...",
    salesUnitOfMeasure: baseUnitOfMeasureOptions[0],
    subscriptionOption: subscriptionOptions[0],
    salesBlocked: false,
    replenishmentSystem: replenishmentSystemOptions[0],
    leadTimeCalculation: "7D",
    vendorNo: vendorOptions[0],
    vendorItemNo: "",
    purchUnitOfMeasure: baseUnitOfMeasureOptions[0],
    purchasingBlocked: false,
    usageDataSupplierReference: "No",
    assemblyPolicy: assemblyPolicyOptions[0],
    assemblyBom: yesNoOptions[0],
    reorderingPolicy: reorderingPolicyOptions[0],
    orderTrackingPolicy: orderTrackingPolicyOptions[0],
    stockkeepingUnitExists: yesNoOptions[0],
    critical: false,
    safetyLeadTime: "2D",
    safetyStockQuantity: 0,
    includeInventory: false,
    lotAccumulationPeriod: "1W",
    reschedulingPeriod: "1W",
    reorderQuantity: 0,
    maximumInventory: 0,
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 0,
    orderMultiple: 1,
    itemTrackingCode: itemTrackingCodeOptions[0],
    serialNos: serialNumberOptions[0],
    lotNos: lotNumberOptions[0],
    expirationCalculation: "",
    warehouseClassCode: warehouseClassCodeOptions[0],
    putAwayTemplateCode: putAwayTemplateOptions[0],
    putAwayUnitOfMeasureCode: baseUnitOfMeasureOptions[0],
    physInvtCountingPeriodCode: physInventoryCountingPeriodOptions[0],
    lastPhysInvtDate: "",
    lastCountingPeriodUpdate: "",
    nextCountingStartDate: "",
    nextCountingEndDate: "",
    exciseTaxType: exciseTaxTypeOptions[0],
    quantityForExciseTax: 0,
    exciseTaxUnitOfMeasure: baseUnitOfMeasureOptions[0],
    nextReceipt: toISODate(),
  };
}

function mapItemToDraft(item: InventoryItem): InventoryDraft {
  const { health: _health, ...draft } = item;
  return draft;
}

function buildInventoryPayload(draft: InventoryDraft): CreateInventoryItemInput {
  const profitPercent = calculateProfitPercent(draft.unitPrice, draft.unitCost);
  const baseUnit = draft.baseUnitOfMeasure || baseUnitOfMeasureOptions[0];

  return {
    ...draft,
    sku: draft.sku.trim().toUpperCase(),
    description: draft.description.trim(),
    category: draft.itemCategoryCode,
    itemCategoryCode: draft.itemCategoryCode,
    profitPercent,
    salesUnitOfMeasure: draft.salesUnitOfMeasure || baseUnit,
    purchUnitOfMeasure: draft.purchUnitOfMeasure || baseUnit,
    putAwayUnitOfMeasureCode: draft.putAwayUnitOfMeasureCode || baseUnit,
    exciseTaxUnitOfMeasure: draft.exciseTaxUnitOfMeasure || baseUnit,
    nextReceipt: draft.nextReceipt || toISODate(),
  };
}

function hasInventoryDraftChanges(item: InventoryItem | null, draft: InventoryDraft) {
  if (!item) return false;
  return JSON.stringify(mapItemToDraft(item)) !== JSON.stringify(buildInventoryPayload(draft));
}

export default function InventoryPage() {
  const { createInventoryItem, demandBySku, inventoryItems, inventorySummary, receiveInventory, updateInventoryItem } = useBusiness();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<"All" | InventoryItem["health"]>("All");
  const [locationFilter, setLocationFilter] = useState<"All" | (typeof inventoryLocationOptions)[number]>("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<InventoryDraft>(getDefaultInventoryDraft);
  const [receiptQuantity, setReceiptQuantity] = useState("100");

  const editingItem = editingSku ? inventoryItems.find((item) => item.sku === editingSku) ?? null : null;
  const isEditMode = Boolean(editingItem);
  const demandForDraft = draft.sku ? demandBySku[draft.sku] ?? 0 : 0;
  const draftAvailable = Math.max(draft.onHand - draft.allocated, 0);
  const computedProfitPercent = calculateProfitPercent(draft.unitPrice, draft.unitCost);
  const draftHealth = getInventoryHealth({
    ...draft,
    category: draft.itemCategoryCode,
    itemCategoryCode: draft.itemCategoryCode,
    profitPercent: computedProfitPercent,
    health: "Healthy",
  });
  const itemValue = draft.onHand * draft.unitCost;
  const skuAlreadyExists = !isEditMode && draft.sku.trim().length > 0 && inventoryItems.some((item) => item.sku === draft.sku.trim().toUpperCase());
  const hasUnsavedChanges = hasInventoryDraftChanges(editingItem, draft);
  const modalPrimaryActionLabel = isEditMode ? "Save Changes" : "Create Item";
  const modalActionDescription = isEditMode
    ? "Review the loaded item values, save any updates, and use the receipt area when stock lands."
    : "Complete the key item card details first, then create the record to make it available for inventory operations.";
  const filteredInventoryItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return inventoryItems.filter((item) => {
      const matchesQuery = normalizedQuery.length === 0 || [
        item.sku,
        item.description,
        item.itemCategoryCode,
        item.location,
        item.vendorNo,
        item.shelfNo,
        item.health,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

      const matchesHealth = healthFilter === "All" || item.health === healthFilter;
      const matchesLocation = locationFilter === "All" || item.location === locationFilter;

      return matchesQuery && matchesHealth && matchesLocation;
    });
  }, [healthFilter, inventoryItems, locationFilter, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredInventoryItems.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedInventoryItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;

    return filteredInventoryItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventoryItems, itemsPerPage, safeCurrentPage]);
  const pageStartItem = filteredInventoryItems.length === 0 ? 0 : ((safeCurrentPage - 1) * itemsPerPage) + 1;
  const pageEndItem = filteredInventoryItems.length === 0 ? 0 : Math.min(safeCurrentPage * itemsPerPage, filteredInventoryItems.length);

  function updateDraftField<Key extends keyof InventoryDraft>(field: Key, value: InventoryDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetDraft() {
    setDraft(getDefaultInventoryDraft());
    setEditingSku(null);
    setReceiptQuantity("100");
  }

  function openCreateModal() {
    resetDraft();
    setIsItemModalOpen(true);
  }

  function openItemModal(item: InventoryItem) {
    setEditingSku(item.sku);
    setDraft(mapItemToDraft(item));
    setReceiptQuantity("100");
    setIsItemModalOpen(true);
  }

  function closeItemModal() {
    setIsItemModalOpen(false);
    resetDraft();
  }

  function submitItem() {
    const payload = buildInventoryPayload(draft);
    if (!payload.sku || !payload.description || skuAlreadyExists) return;

    if (isEditMode) {
      updateInventoryItem(payload);
    } else {
      createInventoryItem(payload);
    }

    closeItemModal();
  }

  function submitReceipt() {
    if (!editingItem) return;

    const quantity = Number(receiptQuantity);
    if (!quantity || quantity <= 0) return;

    receiveInventory(editingItem.sku, quantity);
    setDraft((current) => ({
      ...current,
      onHand: current.onHand + quantity,
      nextReceipt: toISODate(),
    }));
    setReceiptQuantity("100");
  }

  const lowStockItems = useMemo(
    () => inventoryItems.filter((item) => item.health !== "Healthy"),
    [inventoryItems],
  );

  return (
    <RequireAuth permission="inventory:view">
      <>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Warehouse</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Inventory</h2>
            <p className="mt-2 text-brand-gray">Maintain item cards, review planning and warehouse details, and adjust live stock from one inventory workspace.</p>
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

          <div className="grid gap-4 xl:grid-cols-[1.35fr,0.65fr]">
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950">Item List</h3>
                  <p className="mt-1 text-sm text-brand-gray">The list reflects the Item Card references you shared, while each item opens into a full editable modal.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="rounded-xl bg-zinc-50 px-4 py-2 text-sm text-brand-gray">
                    {formatNumber(inventoryItems.length)} tracked SKUs
                  </div>
                  <Button onClick={openCreateModal} type="button">
                    Create Item
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
                <div>
                  <label className="text-sm font-medium text-zinc-950">Search</label>
                  <Input
                    className="mt-2 rounded-2xl"
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search item no., description, category, vendor, location..."
                    value={searchQuery}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-950">Health</label>
                  <select
                    className={toolbarSelectClass}
                    onChange={(event) => {
                      setHealthFilter(event.target.value as "All" | InventoryItem["health"]);
                      setCurrentPage(1);
                    }}
                    value={healthFilter}
                  >
                    <option value="All">All Health</option>
                    <option value="Healthy">Healthy</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-950">Location</label>
                  <select
                    className={toolbarSelectClass}
                    onChange={(event) => {
                      setLocationFilter(event.target.value as "All" | (typeof inventoryLocationOptions)[number]);
                      setCurrentPage(1);
                    }}
                    value={locationFilter}
                  >
                    <option value="All">All Locations</option>
                    {inventoryLocationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-950">Rows Per Page</label>
                  <select
                    className={toolbarSelectClass}
                    onChange={(event) => {
                      setItemsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    value={itemsPerPage}
                  >
                    {[5, 10, 20].map((size) => (
                      <option key={size} value={size}>
                        {size} rows
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-zinc-200/80 bg-zinc-50/70 px-4 py-4 text-sm text-brand-gray sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing {formatNumber(pageStartItem)} to {formatNumber(pageEndItem)} of {formatNumber(filteredInventoryItems.length)} filtered items
                </p>
                <p>
                  Total items: <span className="font-semibold text-zinc-950">{formatNumber(inventoryItems.length)}</span> / Page{" "}
                  <span className="font-semibold text-zinc-950">{formatNumber(safeCurrentPage)}</span> of{" "}
                  <span className="font-semibold text-zinc-950">{formatNumber(totalPages)}</span>
                </p>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.14em] text-brand-gray">
                    <tr>
                      <th className="px-4 py-3">No.</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Base Unit</th>
                      <th className="px-4 py-3">Item Category Code</th>
                      <th className="px-4 py-3">Shelf No.</th>
                      <th className="px-4 py-3 text-right">Inventory</th>
                      <th className="px-4 py-3 text-right">Qty. on Purch. Order</th>
                      <th className="px-4 py-3 text-right">Qty. on Sales Order</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3">Blocked</th>
                      <th className="px-4 py-3">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedInventoryItems.map((item) => (
                      <tr key={item.sku} className="bg-white">
                        <td className="px-4 py-4 font-semibold text-zinc-950">
                          <button
                            className="rounded-md text-left text-brand-red underline-offset-4 transition hover:underline focus:outline-none focus:ring-2 focus:ring-red-100"
                            onClick={() => openItemModal(item)}
                            type="button"
                          >
                            {item.sku}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-zinc-950">{item.description}</p>
                          <p className="mt-1 text-xs text-brand-gray">
                            {item.location} / Vendor {item.vendorNo} / Next receipt {item.nextReceipt || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-brand-gray">{item.baseUnitOfMeasure}</td>
                        <td className="px-4 py-4 text-brand-gray">{item.itemCategoryCode}</td>
                        <td className="px-4 py-4 text-brand-gray">{item.shelfNo || "-"}</td>
                        <td className="px-4 py-4 text-right text-zinc-950">{formatNumber(item.onHand)}</td>
                        <td className="px-4 py-4 text-right text-brand-gray">{formatNumber(item.qtyOnPurchOrder)}</td>
                        <td className="px-4 py-4 text-right text-brand-gray">{formatNumber(demandBySku[item.sku] ?? 0)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-zinc-950">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-4 text-brand-gray">{item.blocked ? "Yes" : "No"}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inventoryHealthStyles[item.health]}`}>
                            {item.health}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {paginatedInventoryItems.length === 0 ? (
                      <tr>
                        <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={11}>
                          No inventory items matched your current search and filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-brand-gray">
                  Page <span className="font-semibold text-zinc-950">{formatNumber(safeCurrentPage)}</span> of{" "}
                  <span className="font-semibold text-zinc-950">{formatNumber(totalPages)}</span>
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    className="h-10 rounded-2xl bg-white px-4 text-zinc-900 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    Previous
                  </Button>
                  <Button
                    className="h-10 rounded-2xl px-4 disabled:opacity-50"
                    disabled={safeCurrentPage === totalPages || filteredInventoryItems.length === 0}
                    onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                    type="button"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-zinc-950">Replenishment Watch</h3>
              <p className="mt-1 text-sm text-brand-gray">Items below healthy coverage stay visible here so the team can jump straight into the item card and update them.</p>
              <div className="mt-5 space-y-3">
                {lowStockItems.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-5 text-sm text-brand-gray">
                    All tracked items are currently healthy.
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <button
                      key={item.sku}
                      className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-left transition hover:border-zinc-200 hover:bg-white"
                      onClick={() => openItemModal(item)}
                      type="button"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-zinc-950">{item.description}</p>
                          <p className="mt-1 text-sm text-brand-gray">
                            Available {formatNumber(getInventoryAvailable(item))} / Reorder Point {formatNumber(item.reorderPoint)}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inventoryHealthStyles[item.health]}`}>
                          {item.health}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        <Modal
          allowFullscreen
          description={
            isEditMode
              ? "Full Item Card details are loaded here so the team can review and update inventory, sales, planning, warehouse, and tax fields in one place."
              : "This create form follows your Item Card reference: Item, Inventory, Prices & Sales, Replenishment, Planning, Item Tracking, Warehouse, and Excise Tax."
          }
          isOpen={isItemModalOpen}
          onClose={closeItemModal}
          title={isEditMode ? `Item Card ${draft.sku}` : "New Item Card"}
        >
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[24px] border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(227,187,75,0.20),_transparent_36%),linear-gradient(135deg,#fffdf8,#f8f3ea)] p-4 shadow-[0_10px_24px_rgba(24,24,27,0.05)] sm:p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inventoryHealthStyles[draftHealth]}`}>
                      {draftHealth}
                    </span>
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-inset ring-white/80">
                      {draft.location}
                    </span>
                    {isEditMode ? (
                      <span
                        className={hasUnsavedChanges
                          ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200"
                          : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"}
                      >
                        {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-gold">Action Center</p>
                  <h4 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                    {isEditMode ? `Inspect and update ${draft.sku}` : "Build the item card with full operating details"}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-brand-gray">
                    {modalActionDescription}
                  </p>
                  {skuAlreadyExists ? (
                    <p className="mt-3 text-sm font-medium text-amber-700">This item number already exists. Use a unique No. before creating the record.</p>
                  ) : isEditMode && hasUnsavedChanges ? (
                    <p className="mt-3 text-sm font-medium text-brand-gray">There are unsaved changes in this item card.</p>
                  ) : null}
                </div>
                <div className="w-full max-w-lg space-y-3">
                  <div className="rounded-[20px] border border-white/80 bg-white/88 p-3.5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button className="w-full rounded-2xl" disabled={!draft.sku.trim() || !draft.description.trim() || skuAlreadyExists} onClick={submitItem} type="button">
                        {modalPrimaryActionLabel}
                      </Button>
                      <Button className="w-full rounded-2xl bg-zinc-900 hover:bg-zinc-700 focus:ring-zinc-200" onClick={closeItemModal} type="button">
                        {isEditMode ? "Close" : "Cancel"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Available</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{formatNumber(draftAvailable)}</p>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Demand</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{formatNumber(demandForDraft)}</p>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Health</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{draftHealth}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_300px]">
              <div className="space-y-5">
                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Item</h4>
                  <p className={sectionDescriptionClass}>Core master data for the item number, description, category, location, and baseline card settings.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">No.</label>
                      <Input
                        className="mt-2 rounded-2xl"
                        disabled={isEditMode}
                        onChange={(event) => updateDraftField("sku", event.target.value.toUpperCase())}
                        placeholder="ITEM-XXXX"
                        value={draft.sku}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Base Unit of Measure</label>
                      <select
                        className={selectClass}
                        onChange={(event) => {
                          const baseUnit = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            baseUnitOfMeasure: baseUnit,
                            salesUnitOfMeasure: current.salesUnitOfMeasure || baseUnit,
                            purchUnitOfMeasure: current.purchUnitOfMeasure || baseUnit,
                            putAwayUnitOfMeasureCode: current.putAwayUnitOfMeasureCode || baseUnit,
                            exciseTaxUnitOfMeasure: current.exciseTaxUnitOfMeasure || baseUnit,
                          }));
                        }}
                        value={draft.baseUnitOfMeasure}
                      >
                        {baseUnitOfMeasureOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Description</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("description", event.target.value)} value={draft.description} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Item Category Code</label>
                      <select
                        className={selectClass}
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            category: value,
                            itemCategoryCode: value,
                          }));
                        }}
                        value={draft.itemCategoryCode}
                      >
                        {inventoryItemCategoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.blocked} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="blocked" onChange={(event) => updateDraftField("blocked", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="blocked">
                          Blocked
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Turn this on when the item should stay inactive for new operational use.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Variant Mandatory if Exists</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("variantMandatoryIfExists", event.target.value)} value={draft.variantMandatoryIfExists}>
                        {yesNoDefaultOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Type</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("itemType", event.target.value)} value={draft.itemType}>
                        {inventoryItemTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Location</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("location", event.target.value)} value={draft.location}>
                        {inventoryLocationOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Inventory</h4>
                  <p className={sectionDescriptionClass}>Operational stock values, reorder setup, and inventory-specific handling details.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Shelf No.</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("shelfNo", event.target.value)} value={draft.shelfNo} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Stockout Warning</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("stockoutWarning", event.target.value)} value={draft.stockoutWarning}>
                        {yesNoDefaultOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Inventory</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("onHand", Number(event.target.value) || 0)} type="number" value={draft.onHand} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Unit Volume</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("unitVolume", Number(event.target.value) || 0)} step="0.01" type="number" value={draft.unitVolume} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Qty. on Purch. Order</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("qtyOnPurchOrder", Number(event.target.value) || 0)} type="number" value={draft.qtyOnPurchOrder} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Over-Receipt Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("overReceiptCode", event.target.value)} value={draft.overReceiptCode}>
                        {overReceiptCodeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option || "None"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Qty. on Sales Order</label>
                      <Input className="mt-2 rounded-2xl bg-zinc-50" readOnly value={demandForDraft} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Reorder Point</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("reorderPoint", Number(event.target.value) || 0)} type="number" value={draft.reorderPoint} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Prices & Sales</h4>
                  <p className={sectionDescriptionClass}>Sales-facing pricing, discounts, and commercial flags used for customer transactions.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Unit Price</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("unitPrice", Number(event.target.value) || 0)} step="0.01" type="number" value={draft.unitPrice} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Sales Unit of Measure</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("salesUnitOfMeasure", event.target.value)} value={draft.salesUnitOfMeasure}>
                        {baseUnitOfMeasureOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Profit %</label>
                      <Input className="mt-2 rounded-2xl bg-zinc-50" readOnly value={computedProfitPercent} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Subscription Option</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("subscriptionOption", event.target.value)} value={draft.subscriptionOption}>
                        {subscriptionOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Sales Prices & Discounts</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("salesPricesAndDiscounts", event.target.value)} value={draft.salesPricesAndDiscounts} />
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.salesBlocked} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="salesBlocked" onChange={(event) => updateDraftField("salesBlocked", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="salesBlocked">
                          Sales Blocked
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Use this when the item should stay visible but cannot be sold right now.</p>
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Replenishment</h4>
                  <p className={sectionDescriptionClass}>Purchasing and assembly references used to replenish the item consistently.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Replenishment System</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("replenishmentSystem", event.target.value)} value={draft.replenishmentSystem}>
                        {replenishmentSystemOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Assembly Policy</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("assemblyPolicy", event.target.value)} value={draft.assemblyPolicy}>
                        {assemblyPolicyOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Lead Time Calculation</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("leadTimeCalculation", event.target.value)} value={draft.leadTimeCalculation} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Assembly BOM</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("assemblyBom", event.target.value)} value={draft.assemblyBom}>
                        {yesNoOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Vendor No.</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("vendorNo", event.target.value)} value={draft.vendorNo}>
                        {vendorOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Vendor Item No.</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("vendorItemNo", event.target.value)} value={draft.vendorItemNo} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Purch. Unit of Measure</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("purchUnitOfMeasure", event.target.value)} value={draft.purchUnitOfMeasure}>
                        {baseUnitOfMeasureOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.purchasingBlocked} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="purchasingBlocked" onChange={(event) => updateDraftField("purchasingBlocked", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="purchasingBlocked">
                          Purchasing Blocked
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Useful when replenishment should be paused even though the item still exists on file.</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-950">Usage Data Supplier Reference</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("usageDataSupplierReference", event.target.value)} value={draft.usageDataSupplierReference} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Planning</h4>
                  <p className={sectionDescriptionClass}>Planning policies, safety controls, and order modifiers used for replenishment decisions.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Reordering Policy</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("reorderingPolicy", event.target.value)} value={draft.reorderingPolicy}>
                        {reorderingPolicyOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Reorder Quantity</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("reorderQuantity", Number(event.target.value) || 0)} type="number" value={draft.reorderQuantity} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Order Tracking Policy</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("orderTrackingPolicy", event.target.value)} value={draft.orderTrackingPolicy}>
                        {orderTrackingPolicyOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Maximum Inventory</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("maximumInventory", Number(event.target.value) || 0)} type="number" value={draft.maximumInventory} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Stockkeeping Unit Exists</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("stockkeepingUnitExists", event.target.value)} value={draft.stockkeepingUnitExists}>
                        {yesNoOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Minimum Order Quantity</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("minimumOrderQuantity", Number(event.target.value) || 0)} type="number" value={draft.minimumOrderQuantity} />
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.critical} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="critical" onChange={(event) => updateDraftField("critical", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="critical">
                          Critical
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Marks the item as extra sensitive for planning and replenishment reviews.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Maximum Order Quantity</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("maximumOrderQuantity", Number(event.target.value) || 0)} type="number" value={draft.maximumOrderQuantity} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Safety Lead Time</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("safetyLeadTime", event.target.value)} value={draft.safetyLeadTime} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Order Multiple</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("orderMultiple", Number(event.target.value) || 0)} type="number" value={draft.orderMultiple} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Safety Stock Quantity</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("safetyStockQuantity", Number(event.target.value) || 0)} type="number" value={draft.safetyStockQuantity} />
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.includeInventory} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="includeInventory" onChange={(event) => updateDraftField("includeInventory", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="includeInventory">
                          Include Inventory
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Enable this when planning should include current stock as part of the supply policy.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Lot Accumulation Period</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("lotAccumulationPeriod", event.target.value)} value={draft.lotAccumulationPeriod} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Rescheduling Period</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("reschedulingPeriod", event.target.value)} value={draft.reschedulingPeriod} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Item Tracking</h4>
                  <p className={sectionDescriptionClass}>Tracking rules for serial, lot, and expiration-sensitive items.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Item Tracking Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("itemTrackingCode", event.target.value)} value={draft.itemTrackingCode}>
                        {itemTrackingCodeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option || "None"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Lot Nos.</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("lotNos", event.target.value)} value={draft.lotNos}>
                        {lotNumberOptions.map((option) => (
                          <option key={option} value={option}>
                            {option || "None"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Serial Nos.</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("serialNos", event.target.value)} value={draft.serialNos}>
                        {serialNumberOptions.map((option) => (
                          <option key={option} value={option}>
                            {option || "None"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Expiration Calculation</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("expirationCalculation", event.target.value)} placeholder="e.g. 180D" value={draft.expirationCalculation} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Warehouse</h4>
                  <p className={sectionDescriptionClass}>Put-away and counting settings for physical warehouse execution.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Warehouse Class Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("warehouseClassCode", event.target.value)} value={draft.warehouseClassCode}>
                        {warehouseClassCodeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Last Phys. Invt. Date</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("lastPhysInvtDate", event.target.value)} type="date" value={draft.lastPhysInvtDate} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Put-away Template Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("putAwayTemplateCode", event.target.value)} value={draft.putAwayTemplateCode}>
                        {putAwayTemplateOptions.map((option) => (
                          <option key={option} value={option}>
                            {option || "None"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Last Counting Period Update</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("lastCountingPeriodUpdate", event.target.value)} type="date" value={draft.lastCountingPeriodUpdate} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Put-away Unit of Measure</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("putAwayUnitOfMeasureCode", event.target.value)} value={draft.putAwayUnitOfMeasureCode}>
                        {baseUnitOfMeasureOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Next Counting Start Date</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("nextCountingStartDate", event.target.value)} type="date" value={draft.nextCountingStartDate} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Phys Invt Counting Period Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("physInvtCountingPeriodCode", event.target.value)} value={draft.physInvtCountingPeriodCode}>
                        {physInventoryCountingPeriodOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Next Counting End Date</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("nextCountingEndDate", event.target.value)} type="date" value={draft.nextCountingEndDate} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Excise Tax</h4>
                  <p className={sectionDescriptionClass}>Tax-specific references for items that require excise tax tracking and measurement.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Excise Tax Type</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("exciseTaxType", event.target.value)} value={draft.exciseTaxType}>
                        {exciseTaxTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Excise Tax Unit of Measure</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("exciseTaxUnitOfMeasure", event.target.value)} value={draft.exciseTaxUnitOfMeasure}>
                        {baseUnitOfMeasureOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-950">Quantity for Excise Tax</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("quantityForExciseTax", Number(event.target.value) || 0)} type="number" value={draft.quantityForExciseTax} />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="space-y-3.5 xl:sticky xl:top-24 xl:self-start">
                <div className="overflow-hidden rounded-[22px] border border-zinc-200/80 bg-white shadow-[0_10px_26px_rgba(24,24,27,0.06)]">
                  <div className="bg-[linear-gradient(135deg,#18181b,#32323a)] px-4 py-3 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Item Snapshot</p>
                    <p className="mt-1.5 text-xl font-semibold">{draft.sku || "New Item"}</p>
                    <p className="mt-1 text-sm text-white/75">{formatCurrency(itemValue)} current inventory value based on on-hand and unit cost.</p>
                  </div>
                  <div className="space-y-2.5 px-4 py-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Unit Cost</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draft.unitCost)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Unit Price</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draft.unitPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Profit %</span>
                      <span className="font-semibold text-zinc-950">{computedProfitPercent}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Allocated</span>
                      <span className="font-semibold text-zinc-950">{formatNumber(draft.allocated)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3">
                      <span className="text-brand-gray">Available</span>
                      <span className="font-semibold text-zinc-950">{formatNumber(draftAvailable)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(24,24,27,0.06)]">
                  <h5 className="text-base font-semibold text-zinc-950">Status</h5>
                  <div className="mt-3 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Health</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inventoryHealthStyles[draftHealth]}`}>
                        {draftHealth}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Blocked</span>
                      <span className="font-semibold text-zinc-950">{draft.blocked ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Sales Blocked</span>
                      <span className="font-semibold text-zinc-950">{draft.salesBlocked ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Purchasing Blocked</span>
                      <span className="font-semibold text-zinc-950">{draft.purchasingBlocked ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Next Receipt</span>
                      <span className="font-semibold text-zinc-950">{draft.nextReceipt || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(24,24,27,0.06)]">
                  <h5 className="text-base font-semibold text-zinc-950">Quick Stock Receipt</h5>
                  <p className="mt-2 text-sm leading-6 text-brand-gray">
                    {isEditMode
                      ? "Post a quick inventory receipt here while keeping the rest of the item card open for review."
                      : "Save the new item first, then you can post receipts directly inside this modal."}
                  </p>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Qty Received</label>
                      <Input className="mt-2 rounded-2xl" disabled={!isEditMode} min="1" onChange={(event) => setReceiptQuantity(event.target.value)} type="number" value={receiptQuantity} />
                    </div>
                    <Button className="w-full rounded-2xl" disabled={!isEditMode} onClick={submitReceipt} type="button">
                      Post Receipt
                    </Button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </Modal>
      </>
    </RequireAuth>
  );
}
