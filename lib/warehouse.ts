import { getLocationLabelFromCode, toISODate } from "./business";

// ---------------------------------------------------------------------------
// Warehouse areas & shared constants
// ---------------------------------------------------------------------------

export const warehouseAreas = [
  "Receiving Dock",
  "Storage",
  "Picking Bins",
  "Checking Area",
  "Pre-Dispatch Area",
  "BO Area",
  "Outbound Staging",
] as const;

export type WarehouseArea = (typeof warehouseAreas)[number];

export const warehouseUomOptions = ["PCS", "BOX", "VIAL", "BOTTLE", "PACK"] as const;

// Daily order cut-off: orders released after 15:00 are scheduled next-day dispatch.
export const CUTOFF_HOUR = 15;

export type DispatchSchedule = "Today" | "Next Day";

export function resolveDispatchSchedule(date = new Date()): DispatchSchedule {
  return date.getHours() >= CUTOFF_HOUR ? "Next Day" : "Today";
}

// ---------------------------------------------------------------------------
// Purchase Orders (inbound source document)
// ---------------------------------------------------------------------------

export type PurchaseOrderStatus = "Open" | "Released" | "Partially Received" | "Received";

export type PurchaseOrderLine = {
  sku: string;
  description: string;
  uom: string;
  quantity: number;
  qtyReceived: number;
};

export type PurchaseOrder = {
  id: string;
  vendorNo: string;
  vendorName: string;
  orderDate: string;
  expectedReceiptDate: string;
  locationCode: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
};

// ---------------------------------------------------------------------------
// Warehouse Receipts (inbound from PO or Sales Return)
// ---------------------------------------------------------------------------

export type ReceiptSourceType = "Purchase" | "SalesReturn";
export type WarehouseReceiptStatus = "Open" | "Posted";

export type WarehouseReceiptLine = {
  sku: string;
  description: string;
  uom: string;
  qtyExpected: number;
  qtyReceived: number;
  discrepancy: string;
};

export type WarehouseReceipt = {
  id: string;
  sourceType: ReceiptSourceType;
  sourceId: string;
  partyName: string;
  receiptDate: string;
  locationCode: string;
  status: WarehouseReceiptStatus;
  lines: WarehouseReceiptLine[];
};

// ---------------------------------------------------------------------------
// Warehouse Put-aways (generated when a receipt is posted)
// ---------------------------------------------------------------------------

export type PutAwayStatus = "Open" | "Posted";
export type PutAwayTargetArea = "Storage" | "BO Area";

export type WarehousePutAwayLine = {
  sku: string;
  description: string;
  qty: number;
  fromArea: "Receiving Dock";
  toBin: string;
};

export type WarehousePutAway = {
  id: string;
  receiptId: string;
  sourceType: ReceiptSourceType;
  toArea: PutAwayTargetArea;
  status: PutAwayStatus;
  lines: WarehousePutAwayLine[];
};

// ---------------------------------------------------------------------------
// Warehouse Shipments (central outbound document: Open -> Picked -> Checked -> Shipped)
// ---------------------------------------------------------------------------

export type ShipmentSourceType = "Sales" | "PurchaseReturn";
export type WarehouseShipmentStatus = "Open" | "Picked" | "Checked" | "Shipped";

export type WarehouseShipmentLine = {
  sku: string;
  description: string;
  qty: number;
  fromBin: string;
};

export type WarehouseShipment = {
  id: string;
  sourceType: ShipmentSourceType;
  sourceId: string;
  partyName: string;
  shipmentDate: string;
  locationCode: string;
  status: WarehouseShipmentStatus;
  dispatchSchedule: DispatchSchedule;
  pickerId: string;
  pickerName: string;
  pickedAt: string;
  checkerId: string;
  checkerName: string;
  checkedAt: string;
  dispatchId: string;
  dispatchName: string;
  shippedAt: string;
  lines: WarehouseShipmentLine[];
};

// ---------------------------------------------------------------------------
// Warehouse Movements (replenishment, internal, checking/packing)
// ---------------------------------------------------------------------------

export type WarehouseMovementType = "Replenishment" | "Internal" | "Checking";
export type WarehouseMovementStatus = "Open" | "Registered";

export type WarehouseMovementLine = {
  sku: string;
  description: string;
  qty: number;
};

export type WarehouseMovement = {
  id: string;
  type: WarehouseMovementType;
  status: WarehouseMovementStatus;
  fromArea: string;
  toArea: string;
  locationCode: string;
  reference: string;
  registeredBy: string;
  registeredAt: string;
  lines: WarehouseMovementLine[];
};

// ---------------------------------------------------------------------------
// Return orders
// ---------------------------------------------------------------------------

export type SalesReturnStatus = "Open" | "Released" | "Received";
export type ReturnDisposition = "BO" | "Resale";

export type ReturnLine = {
  sku: string;
  description: string;
  qty: number;
};

export type SalesReturnOrder = {
  id: string;
  customerName: string;
  returnDate: string;
  locationCode: string;
  status: SalesReturnStatus;
  disposition: ReturnDisposition;
  lines: ReturnLine[];
};

export type PurchaseReturnStatus = "Open" | "Released" | "Shipped";

export type PurchaseReturnOrder = {
  id: string;
  vendorNo: string;
  vendorName: string;
  returnDate: string;
  locationCode: string;
  status: PurchaseReturnStatus;
  lines: ReturnLine[];
};

// BO (Blocked / Bad Order) area stock, tracked per SKU.
export type BoStock = Record<string, number>;

// ---------------------------------------------------------------------------
// Aggregate warehouse state shape (merged into the business state)
// ---------------------------------------------------------------------------

export type WarehouseState = {
  purchaseOrders: PurchaseOrder[];
  warehouseReceipts: WarehouseReceipt[];
  putAways: WarehousePutAway[];
  warehouseShipments: WarehouseShipment[];
  warehouseMovements: WarehouseMovement[];
  salesReturnOrders: SalesReturnOrder[];
  purchaseReturnOrders: PurchaseReturnOrder[];
  boStock: BoStock;
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-200118",
    vendorNo: "UNILAB",
    vendorName: "United Laboratories",
    orderDate: "2026-06-20",
    expectedReceiptDate: "2026-06-28",
    locationCode: "MAIN",
    status: "Released",
    lines: [
      { sku: "ITEM-ACET-500", description: "Acetaminophen 500mg Tablets", uom: "PCS", quantity: 1200, qtyReceived: 0 },
      { sku: "ITEM-VITC-100", description: "Vitamin C 1000mg Tablets", uom: "PCS", quantity: 1500, qtyReceived: 0 },
    ],
  },
  {
    id: "PO-200119",
    vendorNo: "PFIZER",
    vendorName: "Pfizer Inc.",
    orderDate: "2026-06-21",
    expectedReceiptDate: "2026-06-24",
    locationCode: "MAIN",
    status: "Released",
    lines: [
      { sku: "ITEM-AMOX-250", description: "Amoxicillin 250mg Capsules", uom: "PCS", quantity: 800, qtyReceived: 0 },
    ],
  },
  {
    id: "PO-200120",
    vendorNo: "ROCHE",
    vendorName: "Roche Pharma",
    orderDate: "2026-06-22",
    expectedReceiptDate: "2026-06-25",
    locationCode: "COLD",
    status: "Open",
    lines: [
      { sku: "ITEM-INSU-10", description: "Insulin 10ml Vials", uom: "VIAL", quantity: 90, qtyReceived: 0 },
    ],
  },
];

const initialSalesReturnOrders: SalesReturnOrder[] = [
  {
    id: "SRO-300045",
    customerName: "Mercury Drug Makati",
    returnDate: "2026-06-22",
    locationCode: "MAIN",
    status: "Released",
    disposition: "Resale",
    lines: [
      { sku: "ITEM-VITC-100", description: "Vitamin C 1000mg Tablets", qty: 120 },
    ],
  },
];

const initialPurchaseReturnOrders: PurchaseReturnOrder[] = [
  {
    id: "PRO-400022",
    vendorNo: "3M MEDICAL",
    vendorName: "3M Medical",
    returnDate: "2026-06-21",
    locationCode: "CEBU",
    status: "Open",
    lines: [
      { sku: "ITEM-SURG-001", description: "Sterile Surgical Gloves", qty: 40 },
    ],
  },
];

const initialBoStock: BoStock = {
  "ITEM-SURG-001": 40,
};

export function createInitialWarehouseState(): WarehouseState {
  return {
    purchaseOrders: initialPurchaseOrders.map((order) => ({ ...order, lines: order.lines.map((line) => ({ ...line })) })),
    warehouseReceipts: [],
    putAways: [],
    warehouseShipments: [],
    warehouseMovements: [],
    salesReturnOrders: initialSalesReturnOrders.map((order) => ({ ...order, lines: order.lines.map((line) => ({ ...line })) })),
    purchaseReturnOrders: initialPurchaseReturnOrders.map((order) => ({ ...order, lines: order.lines.map((line) => ({ ...line })) })),
    boStock: { ...initialBoStock },
  };
}

// ---------------------------------------------------------------------------
// Id generators (mirror getNextSalesOrderId pattern)
// ---------------------------------------------------------------------------

function nextSequentialId(ids: string[], prefix: string, base: number) {
  const maxId = ids.reduce((highest, id) => {
    const numericPart = Number(id.replace(prefix, ""));
    return Number.isNaN(numericPart) ? highest : Math.max(highest, numericPart);
  }, base);

  return `${prefix}${maxId + 1}`;
}

export function getNextPurchaseOrderId(orders: PurchaseOrder[]) {
  return nextSequentialId(orders.map((order) => order.id), "PO-", 200120);
}

export function getNextReceiptId(receipts: WarehouseReceipt[]) {
  return nextSequentialId(receipts.map((receipt) => receipt.id), "WR-", 500000);
}

export function getNextPutAwayId(putAways: WarehousePutAway[]) {
  return nextSequentialId(putAways.map((putAway) => putAway.id), "PA-", 600000);
}

export function getNextShipmentId(shipments: WarehouseShipment[]) {
  return nextSequentialId(shipments.map((shipment) => shipment.id), "WS-", 700000);
}

export function getNextMovementId(movements: WarehouseMovement[]) {
  return nextSequentialId(movements.map((movement) => movement.id), "WM-", 800000);
}

export function getNextSalesReturnId(orders: SalesReturnOrder[]) {
  return nextSequentialId(orders.map((order) => order.id), "SRO-", 300045);
}

export function getNextPurchaseReturnId(orders: PurchaseReturnOrder[]) {
  return nextSequentialId(orders.map((order) => order.id), "PRO-", 400022);
}

// ---------------------------------------------------------------------------
// Normalizers (defensive hydration from localStorage)
// ---------------------------------------------------------------------------

export function normalizePurchaseOrder(order: Partial<PurchaseOrder>): PurchaseOrder {
  return {
    id: order.id ?? "PO-UNKNOWN",
    vendorNo: order.vendorNo ?? "",
    vendorName: order.vendorName ?? order.vendorNo ?? "Unknown Vendor",
    orderDate: order.orderDate ?? toISODate(),
    expectedReceiptDate: order.expectedReceiptDate ?? toISODate(),
    locationCode: order.locationCode ?? "MAIN",
    status: order.status ?? "Open",
    lines: (order.lines ?? []).map((line) => ({
      sku: line.sku ?? "ITEM-UNKNOWN",
      description: line.description ?? line.sku ?? "Item",
      uom: line.uom ?? "PCS",
      quantity: line.quantity ?? 0,
      qtyReceived: line.qtyReceived ?? 0,
    })),
  };
}

export function normalizeWarehouseReceipt(receipt: Partial<WarehouseReceipt>): WarehouseReceipt {
  return {
    id: receipt.id ?? "WR-UNKNOWN",
    sourceType: receipt.sourceType ?? "Purchase",
    sourceId: receipt.sourceId ?? "",
    partyName: receipt.partyName ?? "",
    receiptDate: receipt.receiptDate ?? toISODate(),
    locationCode: receipt.locationCode ?? "MAIN",
    status: receipt.status ?? "Open",
    lines: (receipt.lines ?? []).map((line) => ({
      sku: line.sku ?? "ITEM-UNKNOWN",
      description: line.description ?? line.sku ?? "Item",
      uom: line.uom ?? "PCS",
      qtyExpected: line.qtyExpected ?? 0,
      qtyReceived: line.qtyReceived ?? line.qtyExpected ?? 0,
      discrepancy: line.discrepancy ?? "",
    })),
  };
}

export function normalizePutAway(putAway: Partial<WarehousePutAway>): WarehousePutAway {
  return {
    id: putAway.id ?? "PA-UNKNOWN",
    receiptId: putAway.receiptId ?? "",
    sourceType: putAway.sourceType ?? "Purchase",
    toArea: putAway.toArea ?? "Storage",
    status: putAway.status ?? "Open",
    lines: (putAway.lines ?? []).map((line) => ({
      sku: line.sku ?? "ITEM-UNKNOWN",
      description: line.description ?? line.sku ?? "Item",
      qty: line.qty ?? 0,
      fromArea: "Receiving Dock",
      toBin: line.toBin ?? "STORAGE",
    })),
  };
}

export function normalizeWarehouseShipment(shipment: Partial<WarehouseShipment>): WarehouseShipment {
  return {
    id: shipment.id ?? "WS-UNKNOWN",
    sourceType: shipment.sourceType ?? "Sales",
    sourceId: shipment.sourceId ?? "",
    partyName: shipment.partyName ?? "",
    shipmentDate: shipment.shipmentDate ?? toISODate(),
    locationCode: shipment.locationCode ?? "MAIN",
    status: shipment.status ?? "Open",
    dispatchSchedule: shipment.dispatchSchedule ?? "Today",
    pickerId: shipment.pickerId ?? "",
    pickerName: shipment.pickerName ?? "",
    pickedAt: shipment.pickedAt ?? "",
    checkerId: shipment.checkerId ?? "",
    checkerName: shipment.checkerName ?? "",
    checkedAt: shipment.checkedAt ?? "",
    dispatchId: shipment.dispatchId ?? "",
    dispatchName: shipment.dispatchName ?? "",
    shippedAt: shipment.shippedAt ?? "",
    lines: (shipment.lines ?? []).map((line) => ({
      sku: line.sku ?? "ITEM-UNKNOWN",
      description: line.description ?? line.sku ?? "Item",
      qty: line.qty ?? 0,
      fromBin: line.fromBin ?? "PICK",
    })),
  };
}

export function normalizeWarehouseMovement(movement: Partial<WarehouseMovement>): WarehouseMovement {
  return {
    id: movement.id ?? "WM-UNKNOWN",
    type: movement.type ?? "Internal",
    status: movement.status ?? "Open",
    fromArea: movement.fromArea ?? "",
    toArea: movement.toArea ?? "",
    locationCode: movement.locationCode ?? "MAIN",
    reference: movement.reference ?? "",
    registeredBy: movement.registeredBy ?? "",
    registeredAt: movement.registeredAt ?? "",
    lines: (movement.lines ?? []).map((line) => ({
      sku: line.sku ?? "ITEM-UNKNOWN",
      description: line.description ?? line.sku ?? "Item",
      qty: line.qty ?? 0,
    })),
  };
}

export function normalizeSalesReturnOrder(order: Partial<SalesReturnOrder>): SalesReturnOrder {
  return {
    id: order.id ?? "SRO-UNKNOWN",
    customerName: order.customerName ?? "Unknown Customer",
    returnDate: order.returnDate ?? toISODate(),
    locationCode: order.locationCode ?? "MAIN",
    status: order.status ?? "Open",
    disposition: order.disposition ?? "BO",
    lines: (order.lines ?? []).map((line) => ({
      sku: line.sku ?? "ITEM-UNKNOWN",
      description: line.description ?? line.sku ?? "Item",
      qty: line.qty ?? 0,
    })),
  };
}

export function normalizePurchaseReturnOrder(order: Partial<PurchaseReturnOrder>): PurchaseReturnOrder {
  return {
    id: order.id ?? "PRO-UNKNOWN",
    vendorNo: order.vendorNo ?? "",
    vendorName: order.vendorName ?? order.vendorNo ?? "Unknown Vendor",
    returnDate: order.returnDate ?? toISODate(),
    locationCode: order.locationCode ?? "MAIN",
    status: order.status ?? "Open",
    lines: (order.lines ?? []).map((line) => ({
      sku: line.sku ?? "ITEM-UNKNOWN",
      description: line.description ?? line.sku ?? "Item",
      qty: line.qty ?? 0,
    })),
  };
}

export function normalizeBoStock(boStock: unknown): BoStock {
  if (!boStock || typeof boStock !== "object") return {};

  return Object.entries(boStock as Record<string, unknown>).reduce<BoStock>((acc, [sku, qty]) => {
    const numericQty = typeof qty === "number" ? qty : Number(qty);
    if (sku && Number.isFinite(numericQty) && numericQty > 0) {
      acc[sku] = numericQty;
    }
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export function getBoStockTotal(boStock: BoStock) {
  return Object.values(boStock).reduce((total, qty) => total + qty, 0);
}

export function getShipmentLineTotal(shipment: Pick<WarehouseShipment, "lines">) {
  return shipment.lines.reduce((total, line) => total + line.qty, 0);
}

export function getLocationLabel(locationCode: string) {
  return getLocationLabelFromCode(locationCode);
}
