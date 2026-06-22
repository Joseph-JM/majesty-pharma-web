export type SalesOrderStatus = "Open" | "Released" | "Pending Approval" | "Ready to Ship" | "Posted";

export type SalesOrderLine = {
  sku: string;
  description: string;
  quantity: number;
  reservedQty: number;
  unitPrice: number;
};

export type SalesOrder = {
  id: string;
  customer: string;
  location: string;
  orderDate: string;
  shipmentDate: string;
  paymentTerms: string;
  salesperson: string;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
};

export type InventoryHealth = "Healthy" | "Low Stock" | "Critical";

export type InventoryItem = {
  sku: string;
  description: string;
  category: string;
  location: string;
  onHand: number;
  allocated: number;
  reorderPoint: number;
  unitCost: number;
  health: InventoryHealth;
  nextReceipt: string;
};

export type SalesOrderSummary = {
  totalOpenAmount: number;
  readyToShip: number;
  awaitingApproval: number;
  averageReservedPercent: number;
};

export type InventorySummary = {
  inventoryValue: number;
  lowStockCount: number;
  criticalCount: number;
  totalAvailableUnits: number;
};

export type CreateSalesOrderInput = {
  customer: string;
  location: string;
  shipmentDate: string;
  paymentTerms: string;
  salesperson: string;
  lines: Array<{
    sku: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export const locations = ["Main Warehouse", "Cebu Hub", "Cold Storage"] as const;

export const paymentTermsOptions = ["Immediate", "15 Days", "30 Days", "45 Days"] as const;

const initialInventorySeed: InventoryItem[] = [
  {
    sku: "ITEM-ACET-500",
    description: "Acetaminophen 500mg Tablets",
    category: "Analgesics",
    location: "Main Warehouse",
    onHand: 8200,
    allocated: 2300,
    reorderPoint: 2500,
    unitCost: 1.85,
    health: "Healthy",
    nextReceipt: "2026-06-28",
  },
  {
    sku: "ITEM-AMOX-250",
    description: "Amoxicillin 250mg Capsules",
    category: "Antibiotics",
    location: "Main Warehouse",
    onHand: 1900,
    allocated: 450,
    reorderPoint: 1500,
    unitCost: 4.2,
    health: "Low Stock",
    nextReceipt: "2026-06-24",
  },
  {
    sku: "ITEM-INSU-10",
    description: "Insulin 10ml Vials",
    category: "Cold Chain",
    location: "Cold Storage",
    onHand: 220,
    allocated: 60,
    reorderPoint: 160,
    unitCost: 215,
    health: "Low Stock",
    nextReceipt: "2026-06-25",
  },
  {
    sku: "ITEM-SURG-001",
    description: "Sterile Surgical Gloves",
    category: "Medical Supplies",
    location: "Cebu Hub",
    onHand: 540,
    allocated: 120,
    reorderPoint: 600,
    unitCost: 18.5,
    health: "Critical",
    nextReceipt: "2026-06-30",
  },
  {
    sku: "ITEM-VITC-100",
    description: "Vitamin C 1000mg Tablets",
    category: "Supplements",
    location: "Main Warehouse",
    onHand: 4200,
    allocated: 700,
    reorderPoint: 1000,
    unitCost: 3.1,
    health: "Healthy",
    nextReceipt: "2026-07-02",
  },
];

export const initialSalesOrders: SalesOrder[] = [
  {
    id: "SO-100241",
    customer: "Mercury Drug Makati",
    location: "Main Warehouse",
    orderDate: "2026-06-18",
    shipmentDate: "2026-06-21",
    paymentTerms: "30 Days",
    salesperson: "Bianca Reyes",
    status: "Released",
    lines: [
      { sku: "ITEM-ACET-500", description: "Acetaminophen 500mg Tablets", quantity: 1500, reservedQty: 1500, unitPrice: 12 },
      { sku: "ITEM-VITC-100", description: "Vitamin C 1000mg Tablets", quantity: 700, reservedQty: 700, unitPrice: 15 },
      { sku: "ITEM-AMOX-250", description: "Amoxicillin 250mg Capsules", quantity: 600, reservedQty: 450, unitPrice: 24 },
    ],
  },
  {
    id: "SO-100242",
    customer: "South Star Drug Cebu",
    location: "Cebu Hub",
    orderDate: "2026-06-19",
    shipmentDate: "2026-06-22",
    paymentTerms: "15 Days",
    salesperson: "Miguel Santos",
    status: "Ready to Ship",
    lines: [
      { sku: "ITEM-SURG-001", description: "Sterile Surgical Gloves", quantity: 120, reservedQty: 120, unitPrice: 38 },
      { sku: "ITEM-INSU-10", description: "Insulin 10ml Vials", quantity: 60, reservedQty: 60, unitPrice: 850 },
      { sku: "ITEM-ACET-500", description: "Acetaminophen 500mg Tablets", quantity: 800, reservedQty: 800, unitPrice: 12 },
    ],
  },
  {
    id: "SO-100243",
    customer: "The Generics Pharmacy QC",
    location: "Main Warehouse",
    orderDate: "2026-06-19",
    shipmentDate: "2026-06-23",
    paymentTerms: "30 Days",
    salesperson: "Pat Torres",
    status: "Pending Approval",
    lines: [
      { sku: "ITEM-INSU-10", description: "Insulin 10ml Vials", quantity: 140, reservedQty: 0, unitPrice: 850 },
      { sku: "ITEM-AMOX-250", description: "Amoxicillin 250mg Capsules", quantity: 500, reservedQty: 0, unitPrice: 24 },
    ],
  },
  {
    id: "SO-100244",
    customer: "St. Luke's BGC",
    location: "Cold Storage",
    orderDate: "2026-06-20",
    shipmentDate: "2026-06-20",
    paymentTerms: "Immediate",
    salesperson: "Bianca Reyes",
    status: "Open",
    lines: [
      { sku: "ITEM-SURG-001", description: "Sterile Surgical Gloves", quantity: 200, reservedQty: 0, unitPrice: 38 },
      { sku: "ITEM-VITC-100", description: "Vitamin C 1000mg Tablets", quantity: 900, reservedQty: 0, unitPrice: 15 },
    ],
  },
];

export const initialRecentBusinessActivity = [
  "Sales order SO-100242 released to warehouse picking",
  "Insulin replenishment PO linked to Cold Storage demand",
  "Credit approval requested for SO-100243",
  "Surgical gloves availability dropped below reorder point",
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function toISODate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getInventoryAvailable(item: InventoryItem) {
  return Math.max(item.onHand - item.allocated, 0);
}

export function getInventoryHealth(item: InventoryItem): InventoryHealth {
  const available = getInventoryAvailable(item);

  if (available <= item.reorderPoint * 0.75) return "Critical";
  if (available <= item.reorderPoint) return "Low Stock";
  return "Healthy";
}

export function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    health: getInventoryHealth(item),
  };
}

export function getSuggestedUnitPrice(item: InventoryItem) {
  return Number((item.unitCost * 6.5).toFixed(2));
}

export function calculateSalesOrderAmount(order: SalesOrder) {
  return order.lines.reduce((total, line) => total + (line.quantity * line.unitPrice), 0);
}

export function calculateSalesOrderLineCount(order: SalesOrder) {
  return order.lines.length;
}

export function calculateReservedPercent(order: SalesOrder) {
  const totalQty = order.lines.reduce((total, line) => total + line.quantity, 0);
  if (!totalQty) return 0;

  const reservedQty = order.lines.reduce((total, line) => total + Math.min(line.reservedQty, line.quantity), 0);
  return Math.round((reservedQty / totalQty) * 100);
}

export function buildSalesOrderSummary(orders: SalesOrder[]): SalesOrderSummary {
  const activeOrders = orders.filter((order) => order.status !== "Posted");

  return {
    totalOpenAmount: activeOrders.reduce((total, order) => total + calculateSalesOrderAmount(order), 0),
    readyToShip: activeOrders.filter((order) => order.status === "Ready to Ship").length,
    awaitingApproval: activeOrders.filter((order) => order.status === "Pending Approval").length,
    averageReservedPercent: activeOrders.length
      ? Math.round(activeOrders.reduce((total, order) => total + calculateReservedPercent(order), 0) / activeOrders.length)
      : 0,
  };
}

export function buildInventorySummary(items: InventoryItem[]): InventorySummary {
  return {
    inventoryValue: items.reduce((total, item) => total + (item.onHand * item.unitCost), 0),
    lowStockCount: items.filter((item) => getInventoryHealth(item) !== "Healthy").length,
    criticalCount: items.filter((item) => getInventoryHealth(item) === "Critical").length,
    totalAvailableUnits: items.reduce((total, item) => total + getInventoryAvailable(item), 0),
  };
}

export function buildDemandBySku(orders: SalesOrder[]) {
  return orders
    .filter((order) => order.status !== "Posted")
    .reduce<Record<string, number>>((demand, order) => {
      for (const line of order.lines) {
        demand[line.sku] = (demand[line.sku] ?? 0) + line.quantity;
      }

      return demand;
    }, {});
}

export function createInitialInventoryItems() {
  return initialInventorySeed.map((item) => normalizeInventoryItem({ ...item }));
}

export function createInitialSalesOrders() {
  return initialSalesOrders.map((order) => ({
    ...order,
    lines: order.lines.map((line) => ({ ...line })),
  }));
}

export function createInitialBusinessState() {
  return {
    salesOrders: createInitialSalesOrders(),
    inventoryItems: createInitialInventoryItems(),
    activityLog: [...initialRecentBusinessActivity],
  };
}

export function getNextSalesOrderId(orders: SalesOrder[]) {
  const maxId = orders.reduce((highest, order) => {
    const numericPart = Number(order.id.replace("SO-", ""));
    return Number.isNaN(numericPart) ? highest : Math.max(highest, numericPart);
  }, 100240);

  return `SO-${maxId + 1}`;
}

export function addActivity(activityLog: string[], message: string) {
  return [message, ...activityLog].slice(0, 12);
}
