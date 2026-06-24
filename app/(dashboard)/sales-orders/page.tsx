"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
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
  areaOptions,
  billToOptions,
  branchOptions,
  calculateReservedPercent,
  calculateSalesOrderLineCount,
  calculateSalesOrderTotalInclVat,
  companyBankAccountOptions,
  currencyCodes,
  departmentOptions,
  exitPointOptions,
  formatCurrency,
  formatNumber,
  getSuggestedDueDate,
  getSuggestedUnitPrice,
  locationCodes,
  MIN_GROSS_PROFIT_PERCENT,
  paymentServiceOptions,
  paymentTermsOptions,
  shipToOptions,
  toISODate,
  transactionSpecificationOptions,
  transactionTypeOptions,
  transportMethodOptions,
  vatBusinessPostingGroups,
  type Customer,
  type InventoryItem,
  type SalesOrder,
} from "@/lib/business";

const salesOrderStatusStyles = {
  Open: "bg-amber-50 text-amber-700",
  "Approval Request": "bg-zinc-100 text-zinc-700",
  Released: "bg-blue-50 text-blue-700",
  Post: "bg-zinc-900 text-white",
};

const selectClass =
  "mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none transition focus:border-brand-red focus:ring-4 focus:ring-red-50";

const toolbarSelectClass =
  "h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-brand-red focus:ring-4 focus:ring-red-50";

const sectionCardClass =
  "rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(24,24,27,0.05)] sm:p-5";

const sectionTitleClass = "text-base font-semibold tracking-tight text-zinc-950";
const sectionDescriptionClass = "mt-1 text-sm leading-5 text-brand-gray";

const PICKER_PER_PAGE = 10;
const LINES_PER_PAGE = 5;

type ValidationResult = {
  key: string;
  label: string;
  passed: boolean;
  reason: string;
};

function runOrderValidations(
  draft: SalesOrderDraft,
  draftLines: DraftSalesOrderLine[],
  customers: Customer[],
  inventoryItems: InventoryItem[],
  orderTotal: number,
): ValidationResult[] {
  const customer = customers.find((c) => c.name === draft.customerName);

  const locationSet = new Set(draftLines.map((l) => l.locationCode));
  const oneLocation = locationSet.size <= 1;

  const availableCredit = customer && customer.creditLimitLcy > 0
    ? Math.max(customer.creditLimitLcy - customer.balanceLcy, 0)
    : null;
  const withinCredit = availableCredit === null ? true : orderTotal <= availableCredit;

  const priceNotModified = draftLines.every((line) => {
    const item = inventoryItems.find((i) => i.sku === line.sku);
    if (!item) return true;
    return Math.abs(line.unitPrice - getSuggestedUnitPrice(item)) < 0.01;
  });

  const withinGP = draftLines.every((line) => {
    const item = inventoryItems.find((i) => i.sku === line.sku);
    if (!item) return true;
    const gp = line.unitPrice > 0 ? ((line.unitPrice - item.unitCost) / line.unitPrice) * 100 : -Infinity;
    return gp >= MIN_GROSS_PROFIT_PERCENT;
  });

  return [
    {
      key: "oneLocation",
      label: "One Location",
      passed: oneLocation,
      reason: oneLocation ? "" : `Multiple locations used: ${[...locationSet].join(", ")}`,
    },
    {
      key: "withinCredit",
      label: "Within Credit Terms",
      passed: withinCredit,
      reason: withinCredit
        ? ""
        : `Order total ${formatCurrency(orderTotal)} exceeds available credit ${formatCurrency(availableCredit ?? 0)}`,
    },
    {
      key: "priceNotModified",
      label: "Unit Price Not Modified",
      passed: priceNotModified,
      reason: priceNotModified ? "" : "One or more lines have a modified unit price",
    },
    {
      key: "withinGP",
      label: `Within Gross Profit (≥${MIN_GROSS_PROFIT_PERCENT}%)`,
      passed: withinGP,
      reason: withinGP ? "" : `One or more lines fall below the ${MIN_GROSS_PROFIT_PERCENT}% minimum gross profit`,
    },
  ];
}

type DraftLine = {
  sku: string;
  quantity: string;
  unitPrice: string;
  locationCode: string;
};

type DraftSalesOrderLine = {
  type: "Item";
  sku: string;
  itemReferenceNo: string;
  description: string;
  locationCode: string;
  quantity: number;
  qtyToShip: number;
  reservedQty: number;
  unitPrice: number;
};

type SalesOrderDraft = {
  customerName: string;
  contact: string;
  documentDate: string;
  postingDate: string;
  orderDate: string;
  dueDate: string;
  requestedDeliveryDate: string;
  externalDocumentNo: string;
  locationCode: string;
  shipmentDate: string;
  currencyCode: string;
  companyBankAccountCode: string;
  pricesIncludingVat: boolean;
  vatBusPostingGroup: string;
  paymentTermsCode: string;
  paymentService: string;
  branch: string;
  department: string;
  paymentDiscountPercent: string;
  eu3PartyTrade: boolean;
  directDebitMandateId: string;
  shipTo: string;
  billTo: string;
  phoneNo: string;
  shippingContact: string;
  transactionSpecification: string;
  transactionType: string;
  transportMethod: string;
  exitPoint: string;
  area: string;
  prepaymentPercent: string;
  compressPrepayment: boolean;
  prepaymentTermsCode: string;
  prepaymentDueDate: string;
  prepaymentPaymentDiscountPercent: string;
  prepaymentPaymentDiscountDate: string;
};

function getDefaultShipmentDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toISODate(tomorrow);
}

function getDefaultSalesOrderDraft(): SalesOrderDraft {
  const today = toISODate();
  const shipmentDate = getDefaultShipmentDate();
  const paymentTermsCode = paymentTermsOptions[2];

  return {
    customerName: "",
    contact: "",
    documentDate: today,
    postingDate: today,
    orderDate: today,
    dueDate: getSuggestedDueDate(today, paymentTermsCode),
    requestedDeliveryDate: shipmentDate,
    externalDocumentNo: "",
    locationCode: locationCodes[0],
    shipmentDate,
    currencyCode: currencyCodes[0],
    companyBankAccountCode: companyBankAccountOptions[0],
    pricesIncludingVat: false,
    vatBusPostingGroup: vatBusinessPostingGroups[0],
    paymentTermsCode,
    paymentService: paymentServiceOptions[0],
    branch: branchOptions[0],
    department: departmentOptions[0],
    paymentDiscountPercent: "0",
    eu3PartyTrade: false,
    directDebitMandateId: "",
    shipTo: shipToOptions[0],
    billTo: billToOptions[0],
    phoneNo: "",
    shippingContact: "",
    transactionSpecification: transactionSpecificationOptions[0],
    transactionType: transactionTypeOptions[0],
    transportMethod: transportMethodOptions[0],
    exitPoint: exitPointOptions[0],
    area: areaOptions[0],
    prepaymentPercent: "0",
    compressPrepayment: false,
    prepaymentTermsCode: paymentTermsOptions[0],
    prepaymentDueDate: shipmentDate,
    prepaymentPaymentDiscountPercent: "0",
    prepaymentPaymentDiscountDate: shipmentDate,
  };
}

function mapOrderToDraft(order: SalesOrder): SalesOrderDraft {
  return {
    customerName: order.customerName,
    contact: order.contact,
    documentDate: order.documentDate,
    postingDate: order.postingDate,
    orderDate: order.orderDate,
    dueDate: order.dueDate,
    requestedDeliveryDate: order.requestedDeliveryDate,
    externalDocumentNo: order.externalDocumentNo,
    locationCode: order.locationCode,
    shipmentDate: order.shipmentDate,
    currencyCode: order.currencyCode,
    companyBankAccountCode: order.companyBankAccountCode,
    pricesIncludingVat: order.pricesIncludingVat,
    vatBusPostingGroup: order.vatBusPostingGroup,
    paymentTermsCode: order.paymentTermsCode,
    paymentService: order.paymentService,
    branch: order.branch,
    department: order.department,
    paymentDiscountPercent: String(order.paymentDiscountPercent),
    eu3PartyTrade: order.eu3PartyTrade,
    directDebitMandateId: order.directDebitMandateId,
    shipTo: order.shipTo,
    billTo: order.billTo,
    phoneNo: order.phoneNo,
    shippingContact: order.shippingContact,
    transactionSpecification: order.transactionSpecification,
    transactionType: order.transactionType,
    transportMethod: order.transportMethod,
    exitPoint: order.exitPoint,
    area: order.area,
    prepaymentPercent: String(order.prepaymentPercent),
    compressPrepayment: order.compressPrepayment,
    prepaymentTermsCode: order.prepaymentTermsCode,
    prepaymentDueDate: order.prepaymentDueDate,
    prepaymentPaymentDiscountPercent: String(order.prepaymentPaymentDiscountPercent),
    prepaymentPaymentDiscountDate: order.prepaymentPaymentDiscountDate,
  };
}

function mapOrderToDraftLines(order: SalesOrder): DraftSalesOrderLine[] {
  return order.lines.map((line) => ({
    type: "Item",
    sku: line.sku,
    itemReferenceNo: line.itemReferenceNo,
    description: line.description,
    locationCode: line.locationCode,
    quantity: line.quantity,
    qtyToShip: line.qtyToShip,
    reservedQty: line.reservedQty,
    unitPrice: line.unitPrice,
  }));
}

function hasOrderDraftChanges(order: SalesOrder | null, draft: SalesOrderDraft, draftLines: DraftSalesOrderLine[]) {
  if (!order) return false;

  return JSON.stringify(mapOrderToDraft(order)) !== JSON.stringify(draft)
    || JSON.stringify(mapOrderToDraftLines(order)) !== JSON.stringify(draftLines);
}

export default function SalesOrdersPage() {
  const { user } = useAuth();
  const { createSalesOrder, customers, updateSalesOrder, inventoryItems, reserveSalesOrder, salesOrders, salesOrderSummary, postSalesOrder } = useBusiness();

  useSyncExternalStore(subscribeToRoleDefinitionStore, readRoleDefinitionsSnapshot, getServerRoleDefinitionsSnapshot);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | SalesOrder["status"]>("All");
  const [locationFilter, setLocationFilter] = useState<"All" | (typeof locationCodes)[number]>("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<SalesOrderDraft>(getDefaultSalesOrderDraft);
  const [draftLine, setDraftLine] = useState<DraftLine>({
    sku: "",
    quantity: "1",
    unitPrice: "",
    locationCode: locationCodes[0],
  });
  const [draftLines, setDraftLines] = useState<DraftSalesOrderLine[]>([]);
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [itemPickerSearch, setItemPickerSearch] = useState("");
  const [itemPickerLocation, setItemPickerLocation] = useState<"All" | string>("All");
  const [itemPickerPage, setItemPickerPage] = useState(1);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [customerPickerSearch, setCustomerPickerSearch] = useState("");
  const [customerPickerPage, setCustomerPickerPage] = useState(1);
  const [linesPage, setLinesPage] = useState(1);

  const selectedSku = draftLine.sku || inventoryItems[0]?.sku || "";
  const selectedItem = inventoryItems.find((item) => item.sku === selectedSku);
  const computedPrice = draftLine.unitPrice || (selectedItem ? String(getSuggestedUnitPrice(selectedItem)) : "");
  const draftSubtotal = useMemo(
    () => draftLines.reduce((total, line) => total + (line.quantity * line.unitPrice), 0),
    [draftLines],
  );
  const draftInvoiceDiscountAmount = draftSubtotal * ((Number(draft.paymentDiscountPercent) || 0) / 100);
  const draftTotalExclVat = draftSubtotal - draftInvoiceDiscountAmount;
  const draftTotalVat = draftTotalExclVat * 0.12;
  const draftTotalInclVat = draftTotalExclVat + draftTotalVat;
  const orderValidations = useMemo(() => {
    if (editingOrderId || !draft.customerName.trim() || draftLines.length === 0) return [];
    return runOrderValidations(draft, draftLines, customers, inventoryItems, draftTotalInclVat);
  }, [customers, draft, draftLines, draftTotalInclVat, editingOrderId, inventoryItems]);
  const orderNeedsApproval = orderValidations.some((v) => !v.passed);
  const editingOrder = editingOrderId ? salesOrders.find((order) => order.id === editingOrderId) ?? null : null;
  const isEditMode = Boolean(editingOrder);
  const isPostedView = editingOrder?.status === "Post";
  const canManageOrders = user ? canAccess(user.role, "sales-orders:manage") : false;
  const canApproveOrders = user ? canAccess(user.role, "sales-orders:approve") : false;
  const userLocationCode = user ? getUserLocationCode(user) : null;
  const hasUnsavedChanges = hasOrderDraftChanges(editingOrder, draft, draftLines);
  const modalWorkflowActionLabel =
    editingOrder?.status === "Open"
      ? "Request Approval"
      : editingOrder?.status === "Approval Request"
        ? "Release Order"
        : editingOrder?.status === "Released"
          ? "Post Order"
          : null;
  const canRunWorkflowAction = editingOrder?.status === "Open"
    ? canManageOrders
    : editingOrder?.status === "Approval Request"
      ? canApproveOrders
      : editingOrder?.status === "Released"
        ? canManageOrders
        : false;
  const modalPrimaryActionLabel = editingOrder
    ? "Save Changes"
    : orderNeedsApproval
      ? "Create → For Approval"
      : "Create Sales Order";
  const modalActionDescription = editingOrder
    ? isPostedView
      ? "This record can be reviewed in full here, but posted orders are locked from edits."
      : "Review the loaded values, save any edits, then use the workflow action below based on the current status."
    : "Once the draft looks right, create the order and move it through Approval Request, Released, and Post from this action deck.";

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return salesOrders.filter((order) => {
      const matchesQuery = normalizedQuery.length === 0 || [
        order.id,
        order.customerName,
        order.contact,
        order.externalDocumentNo,
        order.locationCode,
        order.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      const matchesLocation = locationFilter === "All" || order.locationCode === locationFilter;
      const matchesUserScope = !userLocationCode || order.locationCode === userLocationCode;

      return matchesQuery && matchesStatus && matchesLocation && matchesUserScope;
    });
  }, [locationFilter, salesOrders, searchQuery, statusFilter, userLocationCode]);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;

    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, itemsPerPage, safeCurrentPage]);
  const pageStartItem = filteredOrders.length === 0 ? 0 : ((safeCurrentPage - 1) * itemsPerPage) + 1;
  const pageEndItem = filteredOrders.length === 0 ? 0 : Math.min(safeCurrentPage * itemsPerPage, filteredOrders.length);
  const filteredPickerItems = useMemo(() => {
    const q = itemPickerSearch.trim().toLowerCase();
    return inventoryItems.filter((item) => {
      const matchesSearch = !q || item.sku.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      const matchesLocation = itemPickerLocation === "All" || item.location === itemPickerLocation;
      return matchesSearch && matchesLocation;
    });
  }, [inventoryItems, itemPickerSearch, itemPickerLocation]);
  const safeItemPickerPage = Math.min(itemPickerPage, Math.max(1, Math.ceil(filteredPickerItems.length / PICKER_PER_PAGE)));
  const paginatedPickerItems = filteredPickerItems.slice((safeItemPickerPage - 1) * PICKER_PER_PAGE, safeItemPickerPage * PICKER_PER_PAGE);
  const totalItemPickerPages = Math.max(1, Math.ceil(filteredPickerItems.length / PICKER_PER_PAGE));

  const filteredCustomerItems = useMemo(() => {
    const q = customerPickerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.city.toLowerCase().includes(q),
    );
  }, [customers, customerPickerSearch]);
  const safeCustomerPage = Math.min(customerPickerPage, Math.max(1, Math.ceil(filteredCustomerItems.length / PICKER_PER_PAGE)));
  const paginatedCustomerItems = filteredCustomerItems.slice((safeCustomerPage - 1) * PICKER_PER_PAGE, safeCustomerPage * PICKER_PER_PAGE);
  const totalCustomerPages = Math.max(1, Math.ceil(filteredCustomerItems.length / PICKER_PER_PAGE));

  const safeLinesPage = Math.min(linesPage, Math.max(1, Math.ceil(draftLines.length / LINES_PER_PAGE)));
  const paginatedDraftLines = draftLines.slice((safeLinesPage - 1) * LINES_PER_PAGE, safeLinesPage * LINES_PER_PAGE);
  const totalLinesPages = Math.max(1, Math.ceil(draftLines.length / LINES_PER_PAGE));

  function updateDraftField<Key extends keyof SalesOrderDraft>(field: Key, value: SalesOrderDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetDraftForm() {
    setDraft(getDefaultSalesOrderDraft());
    setEditingOrderId(null);
    setDraftLine({
      sku: "",
      quantity: "1",
      unitPrice: "",
      locationCode: locationCodes[0],
    });
    setDraftLines([]);
  }

  function openCreateModal() {
    if (!canManageOrders) return;
    resetDraftForm();
    setIsCreateOpen(true);
  }

  function openOrderModal(order: SalesOrder) {
    setEditingOrderId(order.id);
    setDraft(mapOrderToDraft(order));
    setDraftLine({
      sku: order.lines[0]?.sku ?? "",
      quantity: "1",
      unitPrice: "",
      locationCode: order.lines[0]?.locationCode ?? order.locationCode,
    });
    setDraftLines(mapOrderToDraftLines(order));
    setIsCreateOpen(true);
  }

  function closeOrderModal() {
    setIsCreateOpen(false);
    resetDraftForm();
  }

  function runModalWorkflowAction() {
    if (!editingOrder || hasUnsavedChanges || !canRunWorkflowAction) return;

    if (editingOrder.status === "Released") {
      postSalesOrder(editingOrder.id);
      return;
    }

    reserveSalesOrder(editingOrder.id);
  }

  function addDraftLine() {
    if (!selectedItem) return;

    const quantity = Number(draftLine.quantity);
    const unitPrice = Number(computedPrice);
    if (!quantity || quantity <= 0 || !unitPrice || unitPrice <= 0) return;

    const locationCode = draftLine.locationCode || draft.locationCode;

    setDraftLines((current) => {
      const existingIndex = current.findIndex(
        (l) => l.sku === selectedItem.sku && l.locationCode === locationCode,
      );
      if (existingIndex !== -1) {
        return current.map((l, i) =>
          i === existingIndex
            ? { ...l, quantity: l.quantity + quantity, qtyToShip: l.qtyToShip + quantity }
            : l,
        );
      }
      return [
        ...current,
        {
          type: "Item",
          sku: selectedItem.sku,
          itemReferenceNo: `REF-${selectedItem.sku.replace("ITEM-", "")}`,
          description: selectedItem.description,
          locationCode,
          quantity,
          qtyToShip: quantity,
          reservedQty: 0,
          unitPrice,
        },
      ];
    });
    setDraftLine({
      sku: "",
      quantity: "1",
      unitPrice: "",
      locationCode: draft.locationCode,
    });
  }

  function removeDraftLine(index: number) {
    setDraftLines((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function selectPickerItem(item: import("@/lib/business").InventoryItem) {
    setDraftLine((current) => ({
      ...current,
      sku: item.sku,
      locationCode: item.location || current.locationCode,
      unitPrice: String(getSuggestedUnitPrice(item)),
    }));
    setIsItemPickerOpen(false);
    setItemPickerSearch("");
    setItemPickerLocation("All");
    setItemPickerPage(1);
  }

  function selectCustomerPickerItem(customer: import("@/lib/business").Customer) {
    updateDraftField("customerName", customer.name);
    setIsCustomerPickerOpen(false);
    setCustomerPickerSearch("");
    setCustomerPickerPage(1);
  }

  function submitOrder() {
    if (!draft.customerName.trim() || draftLines.length === 0 || !user || !canManageOrders) return;

    if (editingOrder) {
      updateSalesOrder({
        id: editingOrder.id,
        status: editingOrder.status,
        customerName: draft.customerName.trim(),
        contact: draft.contact.trim(),
        documentDate: draft.documentDate,
        postingDate: draft.postingDate,
        orderDate: draft.orderDate,
        dueDate: draft.dueDate,
        requestedDeliveryDate: draft.requestedDeliveryDate,
        externalDocumentNo: draft.externalDocumentNo.trim(),
        locationCode: draft.locationCode,
        shipmentDate: draft.shipmentDate,
        paymentTermsCode: draft.paymentTermsCode,
        currencyCode: draft.currencyCode,
        companyBankAccountCode: draft.companyBankAccountCode,
        pricesIncludingVat: draft.pricesIncludingVat,
        vatBusPostingGroup: draft.vatBusPostingGroup,
        paymentService: draft.paymentService,
        branch: draft.branch,
        department: draft.department,
        paymentDiscountPercent: Number(draft.paymentDiscountPercent) || 0,
        eu3PartyTrade: draft.eu3PartyTrade,
        directDebitMandateId: draft.directDebitMandateId.trim(),
        shipTo: draft.shipTo,
        billTo: draft.billTo,
        phoneNo: draft.phoneNo.trim(),
        shippingContact: draft.shippingContact.trim(),
        transactionSpecification: draft.transactionSpecification,
        transactionType: draft.transactionType,
        transportMethod: draft.transportMethod,
        exitPoint: draft.exitPoint,
        area: draft.area,
        prepaymentPercent: Number(draft.prepaymentPercent) || 0,
        compressPrepayment: draft.compressPrepayment,
        prepaymentTermsCode: draft.prepaymentTermsCode,
        prepaymentDueDate: draft.prepaymentDueDate,
        prepaymentPaymentDiscountPercent: Number(draft.prepaymentPaymentDiscountPercent) || 0,
        prepaymentPaymentDiscountDate: draft.prepaymentPaymentDiscountDate,
        salesperson: editingOrder.salesperson,
        lines: draftLines.map((line) => ({
          sku: line.sku,
          itemReferenceNo: line.itemReferenceNo,
          locationCode: line.locationCode,
          quantity: line.quantity,
          qtyToShip: line.qtyToShip,
          unitPrice: line.unitPrice,
          reservedQty: line.reservedQty,
        })),
      });

      closeOrderModal();
      return;
    }

    createSalesOrder({
      customerName: draft.customerName.trim(),
      contact: draft.contact.trim(),
      documentDate: draft.documentDate,
      postingDate: draft.postingDate,
      orderDate: draft.orderDate,
      dueDate: draft.dueDate,
      requestedDeliveryDate: draft.requestedDeliveryDate,
      externalDocumentNo: draft.externalDocumentNo.trim(),
      locationCode: draft.locationCode,
      shipmentDate: draft.shipmentDate,
      paymentTermsCode: draft.paymentTermsCode,
      currencyCode: draft.currencyCode,
      companyBankAccountCode: draft.companyBankAccountCode,
      pricesIncludingVat: draft.pricesIncludingVat,
      vatBusPostingGroup: draft.vatBusPostingGroup,
      paymentService: draft.paymentService,
      branch: draft.branch,
      department: draft.department,
      paymentDiscountPercent: Number(draft.paymentDiscountPercent) || 0,
      eu3PartyTrade: draft.eu3PartyTrade,
      directDebitMandateId: draft.directDebitMandateId.trim(),
      shipTo: draft.shipTo,
      billTo: draft.billTo,
      phoneNo: draft.phoneNo.trim(),
      shippingContact: draft.shippingContact.trim(),
      transactionSpecification: draft.transactionSpecification,
      transactionType: draft.transactionType,
      transportMethod: draft.transportMethod,
      exitPoint: draft.exitPoint,
      area: draft.area,
      prepaymentPercent: Number(draft.prepaymentPercent) || 0,
      compressPrepayment: draft.compressPrepayment,
      prepaymentTermsCode: draft.prepaymentTermsCode,
      prepaymentDueDate: draft.prepaymentDueDate,
      prepaymentPaymentDiscountPercent: Number(draft.prepaymentPaymentDiscountPercent) || 0,
      prepaymentPaymentDiscountDate: draft.prepaymentPaymentDiscountDate,
      salesperson: user.name,
      initialStatus: orderNeedsApproval ? "Approval Request" : "Open",
      approvalReasons: orderNeedsApproval
        ? orderValidations.filter((v) => !v.passed).map((v) => v.reason)
        : [],
      lines: draftLines.map((line) => ({
        sku: line.sku,
        itemReferenceNo: line.itemReferenceNo,
        locationCode: line.locationCode,
        quantity: line.quantity,
        qtyToShip: line.qtyToShip,
        unitPrice: line.unitPrice,
        reservedQty: line.reservedQty,
      })),
    });

    closeOrderModal();
  }

  return (
    <RequireAuth permission="sales-orders:view">
      <>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Sales</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Sales Orders</h2>
            <p className="mt-2 text-brand-gray">Sales orders now move through the lifecycle you set: Open, Approval Request, Released, then Post.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-brand-gray">Open Order Value</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatCurrency(salesOrderSummary.totalOpenAmount)}</p>
            </Card>
            <Card>
              <p className="text-sm text-brand-gray">Released</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(salesOrderSummary.releasedCount)}</p>
            </Card>
            <Card>
              <p className="text-sm text-brand-gray">Approval Requests</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(salesOrderSummary.approvalRequestCount)}</p>
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
                <p className="mt-1 text-sm text-brand-gray">Use the list actions to move each document from Open to Approval Request, then Released, and finally Post.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-xl bg-zinc-50 px-4 py-2 text-sm text-brand-gray">
                  {formatNumber(salesOrders.filter((order) => order.status !== "Post").length)} active documents
                </div>
                <Button disabled={!canManageOrders} onClick={openCreateModal} type="button">
                  Create Sales Order
                </Button>
              </div>
            </div>

            <div className={`mt-6 grid gap-4 ${userLocationCode ? "xl:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]" : "xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"}`}>
              <div>
                <label className="text-sm font-medium text-zinc-950">Search</label>
                <Input
                  className="mt-2 rounded-2xl"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search order no., customer, contact, reference, status..."
                  value={searchQuery}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-950">Status</label>
                <select
                  className={toolbarSelectClass}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as "All" | SalesOrder["status"]);
                    setCurrentPage(1);
                  }}
                  value={statusFilter}
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Approval Request">Approval Request</option>
                  <option value="Released">Released</option>
                  <option value="Post">Post</option>
                </select>
              </div>
              {!userLocationCode && (
                <div>
                  <label className="text-sm font-medium text-zinc-950">Location</label>
                  <select
                    className={toolbarSelectClass}
                    onChange={(event) => {
                      setLocationFilter(event.target.value as "All" | (typeof locationCodes)[number]);
                      setCurrentPage(1);
                    }}
                    value={locationFilter}
                  >
                    <option value="All">All Locations</option>
                    {locationCodes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                Showing {formatNumber(pageStartItem)} to {formatNumber(pageEndItem)} of {formatNumber(filteredOrders.length)} filtered orders
              </p>
              <p>
                Total items: <span className="font-semibold text-zinc-950">{formatNumber(salesOrders.length)}</span> / Page{" "}
                <span className="font-semibold text-zinc-950">{formatNumber(safeCurrentPage)}</span> of{" "}
                <span className="font-semibold text-zinc-950">{formatNumber(totalPages)}</span>
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.14em] text-brand-gray">
                  <tr>
                    <th className="px-4 py-3">Order No.</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Requested Delivery</th>
                    <th className="px-4 py-3">External Document No.</th>
                    <th className="px-4 py-3">Location Code</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Total Incl. VAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paginatedOrders.map((order) => {
                    const reservedPercent = calculateReservedPercent(order);

                    return (
                      <tr key={order.id} className="bg-white">
                        <td className="px-4 py-4 font-semibold text-zinc-950">
                          <button
                            className="rounded-md text-left text-brand-red underline-offset-4 transition hover:underline focus:outline-none focus:ring-2 focus:ring-red-100"
                            onClick={() => openOrderModal(order)}
                            type="button"
                          >
                            {order.id}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-zinc-950">{order.customerName}</p>
                          <p className="mt-1 text-xs text-brand-gray">
                            {order.paymentTermsCode} / {calculateSalesOrderLineCount(order)} lines / {order.salesperson}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-brand-gray">{order.contact || "-"}</td>
                        <td className="px-4 py-4 text-brand-gray">{order.dueDate}</td>
                        <td className="px-4 py-4 text-brand-gray">{order.requestedDeliveryDate}</td>
                        <td className="px-4 py-4 text-brand-gray">{order.externalDocumentNo || "-"}</td>
                        <td className="px-4 py-4 text-brand-gray">{order.locationCode}</td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${salesOrderStatusStyles[order.status]}`}>
                              {order.status}
                            </span>
                            <div className="w-28">
                              <div className="flex items-center justify-between text-[11px] text-brand-gray">
                                <span>{reservedPercent}%</span>
                                <span>{formatNumber(order.lines.reduce((total, line) => total + line.reservedQty, 0))}</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-zinc-100">
                                <div className="h-2 rounded-full bg-brand-red" style={{ width: `${reservedPercent}%` }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-zinc-950">{formatCurrency(calculateSalesOrderTotalInclVat(order))}</td>
                      </tr>
                    );
                  })}
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={9}>
                        No sales orders matched your current search and filters.
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
                  disabled={safeCurrentPage === totalPages || filteredOrders.length === 0}
                  onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                  type="button"
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>

        </div>

        <Modal
          allowFullscreen
          description={
            isEditMode
              ? "Full Sales Order details are loaded here for review and editing. Posted documents remain view-only to protect the inventory history."
              : "This create form follows the Sales Order fields from your sample: General, Lines, Invoice Details, Shipping and Billing, Foreign Trade, and Prepayment."
          }
          isOpen={isCreateOpen}
          onClose={closeOrderModal}
          title={editingOrder ? `Sales Order ${editingOrder.id}` : "New Sales Order"}
        >
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[24px] border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(227,187,75,0.20),_transparent_36%),linear-gradient(135deg,#fffdf8,#f8f3ea)] p-4 shadow-[0_10px_24px_rgba(24,24,27,0.05)] sm:p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${salesOrderStatusStyles[editingOrder?.status ?? "Open"]}`}>
                      Status: {editingOrder?.status ?? "Open"}
                    </span>
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-inset ring-white/80">
                      {draftLines.length > 0 ? `${formatNumber(draftLines.length)} line items` : "No lines yet"}
                    </span>
                    {editingOrder ? (
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
                    {editingOrder ? `Inspect, update, and move ${editingOrder.id}` : "Build and submit the sales order from one place"}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-brand-gray">
                    {modalActionDescription}
                  </p>
                  {editingOrder && !isPostedView && hasUnsavedChanges ? (
                    <p className="mt-3 text-sm font-medium text-amber-700">Save changes before moving this order to the next status.</p>
                  ) : editingOrder && !isPostedView && modalWorkflowActionLabel && !canRunWorkflowAction ? (
                    <p className="mt-3 text-sm font-medium text-brand-gray">Your current persona does not have permission for this workflow step.</p>
                  ) : null}
                </div>
                <div className="w-full max-w-lg space-y-3">
                  <div className="rounded-[20px] border border-white/80 bg-white/88 p-3.5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        className="w-full rounded-2xl"
                        disabled={isPostedView || !canManageOrders || !draft.customerName.trim() || draftLines.length === 0}
                        onClick={submitOrder}
                        type="button"
                      >
                        {modalPrimaryActionLabel}
                      </Button>
                      {editingOrder && !isPostedView && modalWorkflowActionLabel ? (
                        <Button
                          className="w-full rounded-2xl bg-white text-zinc-900 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
                          disabled={hasUnsavedChanges || !canRunWorkflowAction}
                          onClick={runModalWorkflowAction}
                          type="button"
                        >
                          {modalWorkflowActionLabel}
                        </Button>
                      ) : null}
                      <Button className="w-full rounded-2xl bg-zinc-900 hover:bg-zinc-700 focus:ring-zinc-200" onClick={closeOrderModal} type="button">
                        {isPostedView ? "Close" : "Cancel"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Lines</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{formatNumber(draftLines.length)}</p>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Location</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{draft.locationCode}</p>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Total</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{formatCurrency(draftTotalInclVat)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_300px]">
              <fieldset className="space-y-5 min-w-0" disabled={isPostedView || !canManageOrders}>
                <section className={sectionCardClass}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className={sectionTitleClass}>General</h4>
                      <p className={sectionDescriptionClass}>Core document information, customer identity, and order timing.</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${salesOrderStatusStyles[editingOrder?.status ?? "Open"]}`}>
                      Status: {editingOrder?.status ?? "Open"}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Customer Name</label>
                      <button
                        className="mt-2 flex h-10 w-full items-center rounded-xl border border-zinc-200 bg-white px-3.5 text-left text-sm text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-brand-red focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isPostedView || !canManageOrders}
                        onClick={() => setIsCustomerPickerOpen(true)}
                        type="button"
                      >
                        {draft.customerName
                          ? <span className="truncate">{draft.customerName}</span>
                          : <span className="text-brand-gray">Browse customers...</span>}
                      </button>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Due Date</label>
                      <Input className="mt-2 rounded-2xl" type="date" value={draft.dueDate} onChange={(event) => updateDraftField("dueDate", event.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Contact</label>
                      <Input className="mt-2 rounded-2xl" value={draft.contact} onChange={(event) => updateDraftField("contact", event.target.value)} placeholder="Primary contact" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Requested Delivery Date</label>
                      <Input className="mt-2 rounded-2xl" type="date" value={draft.requestedDeliveryDate} onChange={(event) => updateDraftField("requestedDeliveryDate", event.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Document Date</label>
                      <Input
                        className="mt-2 rounded-2xl"
                        type="date"
                        value={draft.documentDate}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            documentDate: nextDate,
                            dueDate: getSuggestedDueDate(nextDate, current.paymentTermsCode),
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">External Document No.</label>
                      <Input className="mt-2 rounded-2xl" value={draft.externalDocumentNo} onChange={(event) => updateDraftField("externalDocumentNo", event.target.value)} placeholder="PO / reference number" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Posting Date</label>
                      <Input className="mt-2 rounded-2xl" type="date" value={draft.postingDate} onChange={(event) => updateDraftField("postingDate", event.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Order Date</label>
                      <Input className="mt-2 rounded-2xl" type="date" value={draft.orderDate} onChange={(event) => updateDraftField("orderDate", event.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-950">Location Code</label>
                      <select
                        value={draft.locationCode}
                        onChange={(event) => {
                          const nextLocationCode = event.target.value;
                          setDraft((current) => ({ ...current, locationCode: nextLocationCode }));
                          setDraftLine((current) => ({ ...current, locationCode: nextLocationCode }));
                        }}
                        className={selectClass}
                      >
                        {locationCodes.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className={sectionTitleClass}>Lines</h4>
                      <p className={sectionDescriptionClass}>Add sellable items, route them to a location code, and review the shipment quantity before posting.</p>
                    </div>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {draftLines.length === 0 ? "Waiting for items" : `${formatNumber(draftLines.length)} line items`}
                    </span>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-zinc-200/80 bg-[linear-gradient(180deg,#fff,#faf7f1)] p-4 shadow-inner sm:p-5">
                    <div className="grid gap-4 md:grid-cols-[1.45fr,0.9fr,0.8fr,0.8fr,auto]">
                      <div>
                        <label className="text-sm font-medium text-zinc-950">No.</label>
                        <button
                          className="mt-2 flex h-10 w-full items-center truncate rounded-xl border border-zinc-200 bg-white px-3.5 text-left text-sm text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-brand-red focus:ring-4 focus:ring-red-50"
                          onClick={() => setIsItemPickerOpen(true)}
                          type="button"
                        >
                          {selectedSku
                            ? <span className="truncate">{selectedSku}{selectedItem ? ` — ${selectedItem.description}` : ""}</span>
                            : <span className="text-brand-gray">Browse items...</span>}
                        </button>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-zinc-950">Location Code</label>
                        <select
                          value={draftLine.locationCode}
                          onChange={(event) => setDraftLine((current) => ({ ...current, locationCode: event.target.value }))}
                          className={selectClass}
                        >
                          {locationCodes.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-zinc-950">Quantity</label>
                        <Input className="mt-2 rounded-2xl" min="1" type="number" value={draftLine.quantity} onChange={(event) => setDraftLine((current) => ({ ...current, quantity: event.target.value }))} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-zinc-950">Unit Price</label>
                        <Input className="mt-2 rounded-2xl" min="1" step="0.01" type="number" value={computedPrice} onChange={(event) => setDraftLine((current) => ({ ...current, unitPrice: event.target.value }))} />
                      </div>
                      <div className="self-end">
                        <Button className="w-full rounded-2xl md:w-auto" onClick={addDraftLine} type="button">
                          Add Line
                        </Button>
                      </div>
                    </div>
                    {selectedItem ? (
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white px-3 py-1 font-medium text-brand-gray shadow-sm">Selected: {selectedItem.description}</span>
                        <span className="rounded-full bg-white px-3 py-1 font-medium text-brand-gray shadow-sm">SKU: {selectedItem.sku}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white">
                    <div className="border-b border-zinc-100 bg-zinc-50/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-gray">
                      Order Lines
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                          <tr>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">No.</th>
                            <th className="px-4 py-3">Item Reference No.</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Location Code</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3 text-right">Qty. to Ship</th>
                            <th className="px-4 py-3 text-right">Reserved Qty</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 bg-white">
                          {draftLines.length === 0 ? (
                            <tr>
                              <td className="px-4 py-10" colSpan={11}>
                                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-8 text-center">
                                  <p className="text-sm font-medium text-zinc-950">No lines added yet</p>
                                  <p className="mt-2 text-sm text-brand-gray">Choose an item, set the quantity, and click `Add Line` to start building this order.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            paginatedDraftLines.map((line, pageIndex) => {
                              const index = (safeLinesPage - 1) * LINES_PER_PAGE + pageIndex;
                              return (
                                <tr key={`${line.sku}-${line.locationCode}`} className="hover:bg-zinc-50/60">
                                  <td className="px-4 py-4 text-zinc-950">{line.type}</td>
                                  <td className="px-4 py-4 font-medium text-zinc-950">{line.sku}</td>
                                  <td className="px-4 py-4 text-brand-gray">{line.itemReferenceNo}</td>
                                  <td className="px-4 py-4 text-zinc-950">{line.description}</td>
                                  <td className="px-4 py-4 text-brand-gray">{line.locationCode}</td>
                                  <td className="px-4 py-4 text-right text-zinc-950">{formatNumber(line.quantity)}</td>
                                  <td className="px-4 py-4 text-right text-zinc-950">{formatNumber(line.qtyToShip)}</td>
                                  <td className="px-4 py-4 text-right text-zinc-950">{formatNumber(line.reservedQty)}</td>
                                  <td className="px-4 py-4 text-right text-zinc-950">{formatCurrency(line.unitPrice)}</td>
                                  <td className="px-4 py-4 text-right font-semibold text-zinc-950">{formatCurrency(line.quantity * line.unitPrice)}</td>
                                  <td className="px-4 py-4 text-right">
                                    <button className="rounded-full px-3 py-1 text-sm font-semibold text-brand-red transition hover:bg-red-50" onClick={() => removeDraftLine(index)} type="button">
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalLinesPages > 1 && (
                      <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm text-brand-gray">
                        <span>{formatNumber((safeLinesPage - 1) * LINES_PER_PAGE + 1)}–{formatNumber(Math.min(safeLinesPage * LINES_PER_PAGE, draftLines.length))} of {formatNumber(draftLines.length)} lines</span>
                        <div className="flex items-center gap-2">
                          <button className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 disabled:opacity-40" disabled={safeLinesPage === 1} onClick={() => setLinesPage((p) => Math.max(1, p - 1))} type="button">Prev</button>
                          <button className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 disabled:opacity-40" disabled={safeLinesPage === totalLinesPages} onClick={() => setLinesPage((p) => Math.min(totalLinesPages, p + 1))} type="button">Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Invoice Details</h4>
                  <p className={sectionDescriptionClass}>Commercial controls that shape pricing, VAT treatment, and collection setup.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Currency Code</label>
                      <select value={draft.currencyCode} onChange={(event) => updateDraftField("currencyCode", event.target.value)} className={selectClass}>
                        {currencyCodes.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Payment Service</label>
                      <select value={draft.paymentService} onChange={(event) => updateDraftField("paymentService", event.target.value)} className={selectClass}>
                        {paymentServiceOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Company Bank Account Code</label>
                      <select value={draft.companyBankAccountCode} onChange={(event) => updateDraftField("companyBankAccountCode", event.target.value)} className={selectClass}>
                        {companyBankAccountOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Branch</label>
                      <select value={draft.branch} onChange={(event) => updateDraftField("branch", event.target.value)} className={selectClass}>
                        {branchOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.pricesIncludingVat} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="pricesIncludingVat" onChange={(event) => updateDraftField("pricesIncludingVat", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="pricesIncludingVat">
                          Prices Including VAT
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Turn this on when line prices already include VAT in the quoted commercial value.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Department</label>
                      <select value={draft.department} onChange={(event) => updateDraftField("department", event.target.value)} className={selectClass}>
                        {departmentOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">VAT Bus. Posting Group</label>
                      <select value={draft.vatBusPostingGroup} onChange={(event) => updateDraftField("vatBusPostingGroup", event.target.value)} className={selectClass}>
                        {vatBusinessPostingGroups.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Payment Discount %</label>
                      <Input className="mt-2 rounded-2xl" min="0" step="0.01" type="number" value={draft.paymentDiscountPercent} onChange={(event) => updateDraftField("paymentDiscountPercent", event.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Payment Terms Code</label>
                      <select
                        value={draft.paymentTermsCode}
                        onChange={(event) => {
                          const nextPaymentTerms = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            paymentTermsCode: nextPaymentTerms,
                            dueDate: getSuggestedDueDate(current.documentDate, nextPaymentTerms),
                          }));
                        }}
                        className={selectClass}
                      >
                        {paymentTermsOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.eu3PartyTrade} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="eu3PartyTrade" onChange={(event) => updateDraftField("eu3PartyTrade", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="eu3PartyTrade">
                          EU 3-Party Trade
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Keep this off for standard local orders and only enable it for the specific trade flow.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Direct Debit Mandate ID</label>
                      <Input className="mt-2 rounded-2xl" value={draft.directDebitMandateId} onChange={(event) => updateDraftField("directDebitMandateId", event.target.value)} placeholder="Optional mandate reference" />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Shipping and Billing</h4>
                  <p className={sectionDescriptionClass}>Delivery routing, billing selection, and shipping point-of-contact details.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Ship-to</label>
                      <select value={draft.shipTo} onChange={(event) => updateDraftField("shipTo", event.target.value)} className={selectClass}>
                        {shipToOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Bill-to</label>
                      <select value={draft.billTo} onChange={(event) => updateDraftField("billTo", event.target.value)} className={selectClass}>
                        {billToOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Phone No.</label>
                      <Input className="mt-2 rounded-2xl" value={draft.phoneNo} onChange={(event) => updateDraftField("phoneNo", event.target.value)} placeholder="Mobile or landline" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Location Code</label>
                      <select value={draft.locationCode} onChange={(event) => updateDraftField("locationCode", event.target.value)} className={selectClass}>
                        {locationCodes.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Contact</label>
                      <Input className="mt-2 rounded-2xl" value={draft.shippingContact} onChange={(event) => updateDraftField("shippingContact", event.target.value)} placeholder="Shipping contact" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Shipment Date</label>
                      <Input className="mt-2 rounded-2xl" type="date" value={draft.shipmentDate} onChange={(event) => updateDraftField("shipmentDate", event.target.value)} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Foreign Trade</h4>
                  <p className={sectionDescriptionClass}>Trade classification fields used when the order needs export or special routing data.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Transaction Specification</label>
                      <select value={draft.transactionSpecification} onChange={(event) => updateDraftField("transactionSpecification", event.target.value)} className={selectClass}>
                        {transactionSpecificationOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Exit Point</label>
                      <select value={draft.exitPoint} onChange={(event) => updateDraftField("exitPoint", event.target.value)} className={selectClass}>
                        {exitPointOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Transaction Type</label>
                      <select value={draft.transactionType} onChange={(event) => updateDraftField("transactionType", event.target.value)} className={selectClass}>
                        {transactionTypeOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Area</label>
                      <select value={draft.area} onChange={(event) => updateDraftField("area", event.target.value)} className={selectClass}>
                        {areaOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-950">Transport Method</label>
                      <select value={draft.transportMethod} onChange={(event) => updateDraftField("transportMethod", event.target.value)} className={selectClass}>
                        {transportMethodOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Prepayment</h4>
                  <p className={sectionDescriptionClass}>Optional prepayment setup for customers who require deposits or discounted advance settlement.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Prepayment %</label>
                      <Input className="mt-2 rounded-2xl" min="0" step="0.01" type="number" value={draft.prepaymentPercent} onChange={(event) => updateDraftField("prepaymentPercent", event.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Prepayment Due Date</label>
                      <Input className="mt-2 rounded-2xl" type="date" value={draft.prepaymentDueDate} onChange={(event) => updateDraftField("prepaymentDueDate", event.target.value)} />
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.compressPrepayment} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="compressPrepayment" onChange={(event) => updateDraftField("compressPrepayment", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="compressPrepayment">
                          Compress Prepayment
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Useful when the team wants one tight prepayment posting flow instead of separate staged entries.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Prepayment Payment Discount %</label>
                      <Input className="mt-2 rounded-2xl" min="0" step="0.01" type="number" value={draft.prepaymentPaymentDiscountPercent} onChange={(event) => updateDraftField("prepaymentPaymentDiscountPercent", event.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Prepayment Terms Code</label>
                      <select value={draft.prepaymentTermsCode} onChange={(event) => updateDraftField("prepaymentTermsCode", event.target.value)} className={selectClass}>
                        {paymentTermsOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Prepayment Payment Discount Date</label>
                      <Input className="mt-2 rounded-2xl" type="date" value={draft.prepaymentPaymentDiscountDate} onChange={(event) => updateDraftField("prepaymentPaymentDiscountDate", event.target.value)} />
                    </div>
                  </div>
                </section>
              </fieldset>

              <aside className="space-y-3.5 xl:sticky xl:top-24 xl:self-start">
                <div className="overflow-hidden rounded-[22px] border border-zinc-200/80 bg-white shadow-[0_10px_26px_rgba(24,24,27,0.06)]">
                  <div className="bg-[linear-gradient(135deg,#18181b,#32323a)] px-4 py-3 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Order Snapshot</p>
                    <p className="mt-1.5 text-xl font-semibold">{formatCurrency(draftTotalInclVat)}</p>
                    <p className="mt-1 text-sm text-white/75">Total inclusive of VAT based on the current draft.</p>
                  </div>
                  <div className="space-y-2.5 px-4 py-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Subtotal Excl. VAT</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draftSubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Inv. Discount Amount</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draftInvoiceDiscountAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Total Excl. VAT</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draftTotalExclVat)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Total VAT</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draftTotalVat)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3">
                      <span className="text-brand-gray">Invoice Discount %</span>
                      <span className="font-semibold text-zinc-950">{Number(draft.paymentDiscountPercent) || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(24,24,27,0.06)]">
                  <h5 className="text-base font-semibold text-zinc-950">Readiness</h5>
                  <div className="mt-3 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Customer Name</span>
                      <span className={draft.customerName.trim() ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                        {draft.customerName.trim() ? "Ready" : "Needed"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Line Items</span>
                      <span className={draftLines.length > 0 ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                        {draftLines.length > 0 ? `${formatNumber(draftLines.length)} added` : "Add lines"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Terms / Due Date</span>
                      <span className="font-semibold text-zinc-950">{draft.paymentTermsCode}</span>
                    </div>
                    {editingOrder ? (
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                        <span className="text-brand-gray">Unsaved Changes</span>
                        <span className={hasUnsavedChanges ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                          {hasUnsavedChanges ? "Save first" : "None"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {!editingOrder && orderValidations.length > 0 && (
                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">Order Checks</p>
                      <div className="mt-2 space-y-2">
                        {orderValidations.map((v) => (
                          <div key={v.key} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3.5 py-2">
                            <span className="text-xs text-brand-gray">{v.label}</span>
                            <span className={v.passed ? "shrink-0 text-xs font-semibold text-emerald-700" : "shrink-0 text-xs font-semibold text-red-600"}>
                              {v.passed ? "Pass" : "Fail"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {orderNeedsApproval && (
                        <p className="mt-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium leading-5 text-amber-700 ring-1 ring-inset ring-amber-200">
                          One or more checks failed — order will be routed for approval.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-4 text-xs leading-5 text-brand-gray">
                    {isPostedView
                      ? "This posted document is view-only so the completed inventory movement stays protected."
                      : !canManageOrders
                        ? "This persona can review order details, but editing is limited by role-based permissions."
                        : "Lifecycle: Open to Approval Request to Released to Post."}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </Modal>

        <Modal
          description="Filter by location and search to find the item to add to this order."
          eyebrow="Sales Order"
          isOpen={isItemPickerOpen}
          onClose={() => { setIsItemPickerOpen(false); setItemPickerSearch(""); setItemPickerLocation("All"); setItemPickerPage(1); }}
          size="md"
          title="Select Item"
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <Input
                className="rounded-2xl"
                onChange={(event) => { setItemPickerSearch(event.target.value); setItemPickerPage(1); }}
                placeholder="Search SKU or description..."
                value={itemPickerSearch}
              />
              <select
                className="h-10 rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-brand-red focus:ring-4 focus:ring-red-50"
                onChange={(event) => { setItemPickerLocation(event.target.value); setItemPickerPage(1); }}
                value={itemPickerLocation}
              >
                <option value="All">All Locations</option>
                {locationCodes.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-zinc-200/80 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                    <tr>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">On Hand</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedPickerItems.map((item) => (
                      <tr key={item.sku} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3 font-medium text-zinc-950">{item.sku}</td>
                        <td className="px-4 py-3 text-brand-gray">{item.description}</td>
                        <td className="px-4 py-3 text-brand-gray">{item.location}</td>
                        <td className="px-4 py-3 text-right text-zinc-950">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right text-zinc-950">{formatNumber(item.onHand)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                            onClick={() => selectPickerItem(item)}
                            type="button"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredPickerItems.length === 0 && (
                      <tr>
                        <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={6}>
                          No items matched your search and location filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalItemPickerPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm text-brand-gray">
                  <span>{formatNumber((safeItemPickerPage - 1) * PICKER_PER_PAGE + 1)}–{formatNumber(Math.min(safeItemPickerPage * PICKER_PER_PAGE, filteredPickerItems.length))} of {formatNumber(filteredPickerItems.length)}</span>
                  <div className="flex items-center gap-2">
                    <button className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 disabled:opacity-40" disabled={safeItemPickerPage === 1} onClick={() => setItemPickerPage((p) => Math.max(1, p - 1))} type="button">Prev</button>
                    <button className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 disabled:opacity-40" disabled={safeItemPickerPage === totalItemPickerPages} onClick={() => setItemPickerPage((p) => Math.min(totalItemPickerPages, p + 1))} type="button">Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>

        <Modal
          description="Search by name, number, or city to find and select the customer for this order."
          eyebrow="Sales Order"
          isOpen={isCustomerPickerOpen}
          onClose={() => { setIsCustomerPickerOpen(false); setCustomerPickerSearch(""); setCustomerPickerPage(1); }}
          size="md"
          title="Select Customer"
        >
          <div className="space-y-4">
            <Input
              className="rounded-2xl"
              onChange={(event) => { setCustomerPickerSearch(event.target.value); setCustomerPickerPage(1); }}
              placeholder="Search name, customer number, or city..."
              value={customerPickerSearch}
            />
            <div className="overflow-hidden rounded-[20px] border border-zinc-200/80 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
                    <tr>
                      <th className="px-4 py-3">No.</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Payment Terms</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedCustomerItems.map((customer) => (
                      <tr key={customer.id} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3 font-medium text-zinc-950">{customer.id}</td>
                        <td className="px-4 py-3 text-zinc-950">{customer.name}</td>
                        <td className="px-4 py-3 text-brand-gray">{customer.city || "-"}</td>
                        <td className="px-4 py-3 text-brand-gray">{customer.email || "-"}</td>
                        <td className="px-4 py-3 text-brand-gray">{customer.paymentTermsCode}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                            onClick={() => selectCustomerPickerItem(customer)}
                            type="button"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomerItems.length === 0 && (
                      <tr>
                        <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={6}>
                          No customers matched your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalCustomerPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm text-brand-gray">
                  <span>{formatNumber((safeCustomerPage - 1) * PICKER_PER_PAGE + 1)}–{formatNumber(Math.min(safeCustomerPage * PICKER_PER_PAGE, filteredCustomerItems.length))} of {formatNumber(filteredCustomerItems.length)}</span>
                  <div className="flex items-center gap-2">
                    <button className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 disabled:opacity-40" disabled={safeCustomerPage === 1} onClick={() => setCustomerPickerPage((p) => Math.max(1, p - 1))} type="button">Prev</button>
                    <button className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 disabled:opacity-40" disabled={safeCustomerPage === totalCustomerPages} onClick={() => setCustomerPickerPage((p) => Math.min(totalCustomerPages, p + 1))} type="button">Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      </>
    </RequireAuth>
  );
}
