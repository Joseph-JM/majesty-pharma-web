import { createInitialWarehouseState } from "./warehouse";

export type SalesOrderStatus = "Open" | "Approval Request" | "Released" | "Post";

export type SalesOrderLine = {
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

export type SalesOrder = {
  id: string;
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
  paymentTermsCode: string;
  currencyCode: string;
  companyBankAccountCode: string;
  pricesIncludingVat: boolean;
  vatBusPostingGroup: string;
  paymentService: string;
  branch: string;
  department: string;
  paymentDiscountPercent: number;
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
  prepaymentPercent: number;
  compressPrepayment: boolean;
  prepaymentTermsCode: string;
  prepaymentDueDate: string;
  prepaymentPaymentDiscountPercent: number;
  prepaymentPaymentDiscountDate: string;
  salesperson: string;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
};

export type InventoryHealth = "Healthy" | "Low Stock" | "Critical";

export type InventoryItem = {
  sku: string;
  description: string;
  blocked: boolean;
  itemType: string;
  baseUnitOfMeasure: string;
  category: string;
  itemCategoryCode: string;
  variantMandatoryIfExists: string;
  location: string;
  shelfNo: string;
  onHand: number;
  allocated: number;
  qtyOnPurchOrder: number;
  reorderPoint: number;
  stockoutWarning: string;
  unitVolume: number;
  overReceiptCode: string;
  unitPrice: number;
  unitCost: number;
  profitPercent: number;
  salesPricesAndDiscounts: string;
  salesUnitOfMeasure: string;
  subscriptionOption: string;
  salesBlocked: boolean;
  replenishmentSystem: string;
  leadTimeCalculation: string;
  vendorNo: string;
  vendorItemNo: string;
  purchUnitOfMeasure: string;
  purchasingBlocked: boolean;
  usageDataSupplierReference: string;
  assemblyPolicy: string;
  assemblyBom: string;
  reorderingPolicy: string;
  orderTrackingPolicy: string;
  stockkeepingUnitExists: string;
  critical: boolean;
  safetyLeadTime: string;
  safetyStockQuantity: number;
  includeInventory: boolean;
  lotAccumulationPeriod: string;
  reschedulingPeriod: string;
  reorderQuantity: number;
  maximumInventory: number;
  minimumOrderQuantity: number;
  maximumOrderQuantity: number;
  orderMultiple: number;
  itemTrackingCode: string;
  serialNos: string;
  lotNos: string;
  expirationCalculation: string;
  warehouseClassCode: string;
  putAwayTemplateCode: string;
  putAwayUnitOfMeasureCode: string;
  physInvtCountingPeriodCode: string;
  lastPhysInvtDate: string;
  lastCountingPeriodUpdate: string;
  nextCountingStartDate: string;
  nextCountingEndDate: string;
  exciseTaxType: string;
  quantityForExciseTax: number;
  exciseTaxUnitOfMeasure: string;
  health: InventoryHealth;
  nextReceipt: string;
};

export type Customer = {
  id: string;
  name: string;
  balanceLcy: number;
  balanceLcyAsVendor: number;
  overdueBalanceLcy: number;
  creditLimitLcy: number;
  blocked: string;
  totalSalesFiscalYear: number;
  costsLcy: number;
  address: string;
  address2: string;
  countryRegionCode: string;
  city: string;
  postCode: string;
  phoneNo: string;
  mobilePhoneNo: string;
  email: string;
  homePage: string;
  contact: string;
  contactName: string;
  vatRegistrationNo: string;
  eoriNumber: string;
  useGlnInElectronicDocuments: boolean;
  copySellToAddrToQteFrom: string;
  genBusPostingGroup: string;
  customerPostingGroup: string;
  customerPriceGroup: string;
  customerDiscGroup: string;
  eDocumentServiceParticipant: number;
  paymentTermsCode: string;
  shipToCode: string;
  locationCode: string;
  combineSalesShipments: boolean;
  reserve: string;
  shippingAdvice: string;
  shipmentMethodCode: string;
  baseCalendarCode: string;
  customizedCalendar: string;
  defaultTransactionType: string;
  defaultTransactionTypeReturn: string;
  defaultTransportMethod: string;
  overduePayments: number;
  paymentsThisYearAsOf: number;
  postedInvoicesCount: number;
  postedCreditMemosCount: number;
  ongoingInvoicesCount: number;
  ongoingCreditMemosCount: number;
  totalSales: number;
  invoiceDiscounts: number;
};

export type SalesOrderSummary = {
  totalOpenAmount: number;
  releasedCount: number;
  approvalRequestCount: number;
  averageReservedPercent: number;
};

export type InventorySummary = {
  inventoryValue: number;
  lowStockCount: number;
  criticalCount: number;
  totalAvailableUnits: number;
};

export type CustomerSummary = {
  totalCustomers: number;
  blockedCustomers: number;
  totalBalanceLcy: number;
  overdueCustomers: number;
};

export type SalesOrderLineInput = {
  sku: string;
  itemReferenceNo: string;
  locationCode: string;
  quantity: number;
  qtyToShip: number;
  unitPrice: number;
  reservedQty?: number;
};

export type CreateSalesOrderInput = {
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
  paymentTermsCode: string;
  currencyCode: string;
  companyBankAccountCode: string;
  pricesIncludingVat: boolean;
  vatBusPostingGroup: string;
  paymentService: string;
  branch: string;
  department: string;
  paymentDiscountPercent: number;
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
  prepaymentPercent: number;
  compressPrepayment: boolean;
  prepaymentTermsCode: string;
  prepaymentDueDate: string;
  prepaymentPaymentDiscountPercent: number;
  prepaymentPaymentDiscountDate: string;
  salesperson: string;
  lines: SalesOrderLineInput[];
};

export type UpdateSalesOrderInput = CreateSalesOrderInput & {
  id: string;
  status: SalesOrderStatus;
};

export type CreateInventoryItemInput = Omit<InventoryItem, "health">;
export type UpdateInventoryItemInput = Omit<InventoryItem, "health">;
export type CreateCustomerInput = Customer;
export type UpdateCustomerInput = Customer;

export const locationCodes = ["MAIN", "CEBU", "COLD"] as const;
export const currencyCodes = ["PHP", "USD"] as const;
export const paymentTermsOptions = ["Immediate", "15 Days", "30 Days", "45 Days"] as const;
export const companyBankAccountOptions = ["BPI-MAIN", "BDO-TRADE", "METRO-COLD"] as const;
export const vatBusinessPostingGroups = ["DOMESTIC", "VAT-EXEMPT", "ZERO-RATED"] as const;
export const paymentServiceOptions = ["No payment service is made available.", "Bank Transfer", "Check", "GCash"] as const;
export const branchOptions = ["Metro Manila", "Cebu", "Cold Chain"] as const;
export const departmentOptions = ["Retail", "Hospital Accounts", "Key Accounts"] as const;
export const shipToOptions = ["Default (Sell-to Address)", "Warehouse Pickup", "Client Delivery Address"] as const;
export const billToOptions = ["Default (Customer)", "Parent Company", "Billing Address on File"] as const;
export const transactionSpecificationOptions = ["Domestic Sale", "Export Sale", "Transfer"] as const;
export const transactionTypeOptions = ["Regular", "Government", "Consignment"] as const;
export const transportMethodOptions = ["Truck", "Air Freight", "Cold Van"] as const;
export const exitPointOptions = ["N/A", "MNL Port", "CEB Port"] as const;
export const areaOptions = ["Luzon", "Visayas", "Mindanao"] as const;
export const inventoryLocationOptions = ["Main Warehouse", "Cebu Hub", "Cold Storage"] as const;
export const inventoryItemTypeOptions = ["Inventory", "Service", "Non-Inventory"] as const;
export const baseUnitOfMeasureOptions = ["PCS", "BOX", "VIAL", "BOTTLE", "PACK"] as const;
export const inventoryItemCategoryOptions = ["Analgesics", "Antibiotics", "Cold Chain", "Medical Supplies", "Supplements"] as const;
export const yesNoDefaultOptions = ["Default (Yes)", "No"] as const;
export const yesNoOptions = ["No", "Yes"] as const;
export const overReceiptCodeOptions = ["", "ALLOW-5%", "ALLOW-10%"] as const;
export const subscriptionOptions = ["No Subscription", "Subscription Required"] as const;
export const replenishmentSystemOptions = ["Purchase", "Prod. Order", "Assembly"] as const;
export const vendorOptions = ["UNILAB", "PFIZER", "ROCHE", "3M MEDICAL"] as const;
export const assemblyPolicyOptions = ["Assemble-to-Stock", "Assemble-to-Order"] as const;
export const reorderingPolicyOptions = ["None", "Fixed Reorder Qty.", "Maximum Qty.", "Lot-for-Lot"] as const;
export const orderTrackingPolicyOptions = ["None", "Tracking Only", "Tracking & Action Msg."] as const;
export const itemTrackingCodeOptions = ["", "LOT", "SERIAL", "LOT-SERIAL"] as const;
export const serialNumberOptions = ["", "SER-STD", "SER-COLD"] as const;
export const lotNumberOptions = ["", "LOT-STD", "LOT-COLD"] as const;
export const warehouseClassCodeOptions = ["GENERAL", "MEDICAL", "COLD"] as const;
export const putAwayTemplateOptions = ["", "PUT-MAIN", "PUT-CEBU", "PUT-COLD"] as const;
export const physInventoryCountingPeriodOptions = ["Monthly", "Quarterly", "Semi-Annual"] as const;
export const exciseTaxTypeOptions = ["None", "VAT", "Pharma Levy"] as const;
export const customerBlockedOptions = ["", "Ship", "Invoice", "All"] as const;
export const countryRegionCodeOptions = ["PH", "US", "SG"] as const;
export const copySellToAddressOptions = ["Company", "Person"] as const;
export const customerPostingGroupOptions = ["LOCAL", "CHAIN", "HOSPITAL"] as const;
export const customerPriceGroupOptions = ["STANDARD", "WHOLESALE", "KEY-ACCOUNT"] as const;
export const customerDiscGroupOptions = ["NONE", "RETAIL", "INSTITUTIONAL"] as const;
export const reserveOptions = ["Optional", "Always", "Never"] as const;
export const shippingAdviceOptions = ["Partial", "Complete"] as const;
export const shipmentMethodOptions = ["Truck", "Courier", "Pickup", "Cold Van"] as const;
export const baseCalendarOptions = ["MAIN-CAL", "CEBU-CAL", "COLD-CAL"] as const;
export const customerTransportMethodOptions = ["Truck", "Air Freight", "Cold Van"] as const;

function buildInitialCustomer(input: Customer) {
  return input;
}

function buildInitialInventoryItem(input: {
  sku: string;
  description: string;
  category: string;
  location: string;
  shelfNo: string;
  onHand: number;
  allocated: number;
  qtyOnPurchOrder: number;
  reorderPoint: number;
  unitCost: number;
  unitVolume: number;
  nextReceipt: string;
  vendorNo: string;
  vendorItemNo: string;
  baseUnitOfMeasure?: string;
  salesUnitOfMeasure?: string;
  purchUnitOfMeasure?: string;
  warehouseClassCode?: string;
  itemTrackingCode?: string;
  serialNos?: string;
  lotNos?: string;
  expirationCalculation?: string;
  physInvtCountingPeriodCode?: string;
}) {
  const baseUnitOfMeasure = input.baseUnitOfMeasure ?? "PCS";
  const unitPrice = Number((input.unitCost * 6.5).toFixed(2));
  const profitPercent = unitPrice > 0
    ? Number((((unitPrice - input.unitCost) / unitPrice) * 100).toFixed(2))
    : 0;

  return {
    sku: input.sku,
    description: input.description,
    blocked: false,
    itemType: "Inventory",
    baseUnitOfMeasure,
    category: input.category,
    itemCategoryCode: input.category,
    variantMandatoryIfExists: "Default (Yes)",
    location: input.location,
    shelfNo: input.shelfNo,
    onHand: input.onHand,
    allocated: input.allocated,
    qtyOnPurchOrder: input.qtyOnPurchOrder,
    reorderPoint: input.reorderPoint,
    stockoutWarning: "Default (Yes)",
    unitVolume: input.unitVolume,
    overReceiptCode: "",
    unitPrice,
    unitCost: input.unitCost,
    profitPercent,
    salesPricesAndDiscounts: "Create New...",
    salesUnitOfMeasure: input.salesUnitOfMeasure ?? baseUnitOfMeasure,
    subscriptionOption: subscriptionOptions[0],
    salesBlocked: false,
    replenishmentSystem: replenishmentSystemOptions[0],
    leadTimeCalculation: "7D",
    vendorNo: input.vendorNo,
    vendorItemNo: input.vendorItemNo,
    purchUnitOfMeasure: input.purchUnitOfMeasure ?? baseUnitOfMeasure,
    purchasingBlocked: false,
    usageDataSupplierReference: "No",
    assemblyPolicy: assemblyPolicyOptions[0],
    assemblyBom: "No",
    reorderingPolicy: reorderingPolicyOptions[0],
    orderTrackingPolicy: orderTrackingPolicyOptions[0],
    stockkeepingUnitExists: "No",
    critical: false,
    safetyLeadTime: "2D",
    safetyStockQuantity: Math.round(input.reorderPoint * 0.25),
    includeInventory: false,
    lotAccumulationPeriod: "1W",
    reschedulingPeriod: "1W",
    reorderQuantity: input.reorderPoint,
    maximumInventory: input.reorderPoint * 3,
    minimumOrderQuantity: Math.max(Math.round(input.reorderPoint * 0.5), 1),
    maximumOrderQuantity: input.reorderPoint * 4,
    orderMultiple: 10,
    itemTrackingCode: input.itemTrackingCode ?? "",
    serialNos: input.serialNos ?? "",
    lotNos: input.lotNos ?? "",
    expirationCalculation: input.expirationCalculation ?? "",
    warehouseClassCode: input.warehouseClassCode ?? warehouseClassCodeOptions[0],
    putAwayTemplateCode: input.location === "Cold Storage" ? putAwayTemplateOptions[3] : putAwayTemplateOptions[1],
    putAwayUnitOfMeasureCode: baseUnitOfMeasure,
    physInvtCountingPeriodCode: input.physInvtCountingPeriodCode ?? physInventoryCountingPeriodOptions[0],
    lastPhysInvtDate: "",
    lastCountingPeriodUpdate: "",
    nextCountingStartDate: "",
    nextCountingEndDate: "",
    exciseTaxType: exciseTaxTypeOptions[0],
    quantityForExciseTax: 0,
    exciseTaxUnitOfMeasure: baseUnitOfMeasure,
    health: "Healthy" as const,
    nextReceipt: input.nextReceipt,
  } satisfies InventoryItem;
}

const initialInventorySeed: InventoryItem[] = [
  buildInitialInventoryItem({
    sku: "ITEM-ACET-500",
    description: "Acetaminophen 500mg Tablets",
    category: inventoryItemCategoryOptions[0],
    location: inventoryLocationOptions[0],
    shelfNo: "A1-04",
    onHand: 8200,
    allocated: 2300,
    qtyOnPurchOrder: 1200,
    reorderPoint: 2500,
    unitCost: 1.85,
    unitVolume: 0.01,
    nextReceipt: "2026-06-28",
    vendorNo: vendorOptions[0],
    vendorItemNo: "ACET-500-UL",
  }),
  buildInitialInventoryItem({
    sku: "ITEM-AMOX-250",
    description: "Amoxicillin 250mg Capsules",
    category: inventoryItemCategoryOptions[1],
    location: inventoryLocationOptions[0],
    shelfNo: "B2-11",
    onHand: 1900,
    allocated: 450,
    qtyOnPurchOrder: 800,
    reorderPoint: 1500,
    unitCost: 4.2,
    unitVolume: 0.02,
    nextReceipt: "2026-06-24",
    vendorNo: vendorOptions[1],
    vendorItemNo: "AMOX-250-PF",
  }),
  buildInitialInventoryItem({
    sku: "ITEM-INSU-10",
    description: "Insulin 10ml Vials",
    category: inventoryItemCategoryOptions[2],
    location: inventoryLocationOptions[2],
    shelfNo: "COLD-02",
    onHand: 220,
    allocated: 60,
    qtyOnPurchOrder: 90,
    reorderPoint: 160,
    unitCost: 215,
    unitVolume: 0.12,
    nextReceipt: "2026-06-25",
    vendorNo: vendorOptions[2],
    vendorItemNo: "INSU-10-RC",
    baseUnitOfMeasure: "VIAL",
    salesUnitOfMeasure: "VIAL",
    purchUnitOfMeasure: "VIAL",
    warehouseClassCode: warehouseClassCodeOptions[2],
    itemTrackingCode: itemTrackingCodeOptions[1],
    lotNos: lotNumberOptions[2],
    expirationCalculation: "180D",
    physInvtCountingPeriodCode: physInventoryCountingPeriodOptions[1],
  }),
  buildInitialInventoryItem({
    sku: "ITEM-SURG-001",
    description: "Sterile Surgical Gloves",
    category: inventoryItemCategoryOptions[3],
    location: inventoryLocationOptions[1],
    shelfNo: "CEB-07",
    onHand: 540,
    allocated: 120,
    qtyOnPurchOrder: 400,
    reorderPoint: 600,
    unitCost: 18.5,
    unitVolume: 0.08,
    nextReceipt: "2026-06-30",
    vendorNo: vendorOptions[3],
    vendorItemNo: "SURG-GLV-3M",
    baseUnitOfMeasure: "BOX",
    salesUnitOfMeasure: "BOX",
    purchUnitOfMeasure: "BOX",
  }),
  buildInitialInventoryItem({
    sku: "ITEM-VITC-100",
    description: "Vitamin C 1000mg Tablets",
    category: inventoryItemCategoryOptions[4],
    location: inventoryLocationOptions[0],
    shelfNo: "A3-18",
    onHand: 4200,
    allocated: 700,
    qtyOnPurchOrder: 1500,
    reorderPoint: 1000,
    unitCost: 3.1,
    unitVolume: 0.02,
    nextReceipt: "2026-07-02",
    vendorNo: vendorOptions[0],
    vendorItemNo: "VITC-100-UL",
  }),
];

function getLocationCodeFromLabel(location: string) {
  if (location === "Cebu Hub") return "CEBU";
  if (location === "Cold Storage") return "COLD";
  return "MAIN";
}

export function getLocationLabelFromCode(locationCode: string) {
  if (locationCode === "CEBU") return "Cebu Hub";
  if (locationCode === "COLD") return "Cold Storage";
  return "Main Warehouse";
}

function buildInitialLine(
  sku: string,
  description: string,
  locationCode: string,
  quantity: number,
  reservedQty: number,
  unitPrice: number,
): SalesOrderLine {
  return {
    type: "Item",
    sku,
    itemReferenceNo: `REF-${sku.replace("ITEM-", "")}`,
    description,
    locationCode,
    quantity,
    qtyToShip: quantity,
    reservedQty,
    unitPrice,
  };
}

export const initialSalesOrders: SalesOrder[] = [
  {
    id: "SO-100241",
    customerName: "Mercury Drug Makati",
    contact: "Ana Dela Cruz",
    documentDate: "2026-06-18",
    postingDate: "2026-06-18",
    orderDate: "2026-06-18",
    dueDate: "2026-07-18",
    requestedDeliveryDate: "2026-06-21",
    externalDocumentNo: "PO-44821",
    locationCode: "MAIN",
    shipmentDate: "2026-06-21",
    paymentTermsCode: "30 Days",
    currencyCode: "PHP",
    companyBankAccountCode: "BPI-MAIN",
    pricesIncludingVat: false,
    vatBusPostingGroup: "DOMESTIC",
    paymentService: "Bank Transfer",
    branch: "Metro Manila",
    department: "Retail",
    paymentDiscountPercent: 0,
    eu3PartyTrade: false,
    directDebitMandateId: "",
    shipTo: "Default (Sell-to Address)",
    billTo: "Default (Customer)",
    phoneNo: "0917-550-2410",
    shippingContact: "Ana Dela Cruz",
    transactionSpecification: "Domestic Sale",
    transactionType: "Regular",
    transportMethod: "Truck",
    exitPoint: "N/A",
    area: "Luzon",
    prepaymentPercent: 0,
    compressPrepayment: false,
    prepaymentTermsCode: "Immediate",
    prepaymentDueDate: "2026-06-21",
    prepaymentPaymentDiscountPercent: 0,
    prepaymentPaymentDiscountDate: "2026-06-21",
    salesperson: "Bianca Reyes",
    status: "Released",
    lines: [
      buildInitialLine("ITEM-ACET-500", "Acetaminophen 500mg Tablets", "MAIN", 1500, 1500, 12),
      buildInitialLine("ITEM-VITC-100", "Vitamin C 1000mg Tablets", "MAIN", 700, 700, 15),
      buildInitialLine("ITEM-AMOX-250", "Amoxicillin 250mg Capsules", "MAIN", 600, 450, 24),
    ],
  },
  {
    id: "SO-100242",
    customerName: "South Star Drug Cebu",
    contact: "Jessa Lim",
    documentDate: "2026-06-19",
    postingDate: "2026-06-19",
    orderDate: "2026-06-19",
    dueDate: "2026-07-04",
    requestedDeliveryDate: "2026-06-22",
    externalDocumentNo: "PO-99207",
    locationCode: "CEBU",
    shipmentDate: "2026-06-22",
    paymentTermsCode: "15 Days",
    currencyCode: "PHP",
    companyBankAccountCode: "BDO-TRADE",
    pricesIncludingVat: false,
    vatBusPostingGroup: "DOMESTIC",
    paymentService: "Check",
    branch: "Cebu",
    department: "Retail",
    paymentDiscountPercent: 1,
    eu3PartyTrade: false,
    directDebitMandateId: "",
    shipTo: "Client Delivery Address",
    billTo: "Default (Customer)",
    phoneNo: "0917-550-2420",
    shippingContact: "Jessa Lim",
    transactionSpecification: "Domestic Sale",
    transactionType: "Regular",
    transportMethod: "Truck",
    exitPoint: "CEB Port",
    area: "Visayas",
    prepaymentPercent: 0,
    compressPrepayment: false,
    prepaymentTermsCode: "Immediate",
    prepaymentDueDate: "2026-06-22",
    prepaymentPaymentDiscountPercent: 0,
    prepaymentPaymentDiscountDate: "2026-06-22",
    salesperson: "Miguel Santos",
    status: "Released",
    lines: [
      buildInitialLine("ITEM-SURG-001", "Sterile Surgical Gloves", "CEBU", 120, 120, 38),
      buildInitialLine("ITEM-INSU-10", "Insulin 10ml Vials", "CEBU", 60, 60, 850),
      buildInitialLine("ITEM-ACET-500", "Acetaminophen 500mg Tablets", "CEBU", 800, 800, 12),
    ],
  },
  {
    id: "SO-100243",
    customerName: "The Generics Pharmacy QC",
    contact: "Paolo Garcia",
    documentDate: "2026-06-19",
    postingDate: "2026-06-19",
    orderDate: "2026-06-19",
    dueDate: "2026-07-19",
    requestedDeliveryDate: "2026-06-23",
    externalDocumentNo: "PO-12088",
    locationCode: "MAIN",
    shipmentDate: "2026-06-23",
    paymentTermsCode: "30 Days",
    currencyCode: "PHP",
    companyBankAccountCode: "BPI-MAIN",
    pricesIncludingVat: false,
    vatBusPostingGroup: "DOMESTIC",
    paymentService: "Bank Transfer",
    branch: "Metro Manila",
    department: "Key Accounts",
    paymentDiscountPercent: 2,
    eu3PartyTrade: false,
    directDebitMandateId: "",
    shipTo: "Default (Sell-to Address)",
    billTo: "Default (Customer)",
    phoneNo: "0917-550-2430",
    shippingContact: "Paolo Garcia",
    transactionSpecification: "Domestic Sale",
    transactionType: "Regular",
    transportMethod: "Cold Van",
    exitPoint: "N/A",
    area: "Luzon",
    prepaymentPercent: 0,
    compressPrepayment: false,
    prepaymentTermsCode: "Immediate",
    prepaymentDueDate: "2026-06-23",
    prepaymentPaymentDiscountPercent: 0,
    prepaymentPaymentDiscountDate: "2026-06-23",
    salesperson: "Pat Torres",
    status: "Approval Request",
    lines: [
      buildInitialLine("ITEM-INSU-10", "Insulin 10ml Vials", "COLD", 140, 0, 850),
      buildInitialLine("ITEM-AMOX-250", "Amoxicillin 250mg Capsules", "MAIN", 500, 0, 24),
    ],
  },
  {
    id: "SO-100244",
    customerName: "St. Luke's BGC",
    contact: "Erika Velasco",
    documentDate: "2026-06-20",
    postingDate: "2026-06-20",
    orderDate: "2026-06-20",
    dueDate: "2026-06-20",
    requestedDeliveryDate: "2026-06-20",
    externalDocumentNo: "ER-00654",
    locationCode: "COLD",
    shipmentDate: "2026-06-20",
    paymentTermsCode: "Immediate",
    currencyCode: "PHP",
    companyBankAccountCode: "METRO-COLD",
    pricesIncludingVat: false,
    vatBusPostingGroup: "DOMESTIC",
    paymentService: "Bank Transfer",
    branch: "Cold Chain",
    department: "Hospital Accounts",
    paymentDiscountPercent: 0,
    eu3PartyTrade: false,
    directDebitMandateId: "",
    shipTo: "Client Delivery Address",
    billTo: "Default (Customer)",
    phoneNo: "0917-550-2440",
    shippingContact: "Erika Velasco",
    transactionSpecification: "Domestic Sale",
    transactionType: "Regular",
    transportMethod: "Cold Van",
    exitPoint: "N/A",
    area: "Luzon",
    prepaymentPercent: 10,
    compressPrepayment: true,
    prepaymentTermsCode: "Immediate",
    prepaymentDueDate: "2026-06-20",
    prepaymentPaymentDiscountPercent: 0,
    prepaymentPaymentDiscountDate: "2026-06-20",
    salesperson: "Bianca Reyes",
    status: "Open",
    lines: [
      buildInitialLine("ITEM-SURG-001", "Sterile Surgical Gloves", "CEBU", 200, 0, 38),
      buildInitialLine("ITEM-VITC-100", "Vitamin C 1000mg Tablets", "MAIN", 900, 0, 15),
    ],
  },
];

export const initialCustomers: Customer[] = [
  buildInitialCustomer({
    id: "CUST-1001",
    name: "Mercury Drug Makati",
    balanceLcy: 148500,
    balanceLcyAsVendor: 0,
    overdueBalanceLcy: 24500,
    creditLimitLcy: 250000,
    blocked: "",
    totalSalesFiscalYear: 1820000,
    costsLcy: 1395000,
    address: "Ayala Avenue",
    address2: "Legazpi Village",
    countryRegionCode: "PH",
    city: "Makati",
    postCode: "1229",
    phoneNo: "02-8812-4401",
    mobilePhoneNo: "0917-550-2410",
    email: "makati@mercurydrug.ph",
    homePage: "https://www.mercurydrug.com",
    contact: "Accounts Payable",
    contactName: "Ana Dela Cruz",
    vatRegistrationNo: "VAT-1001-44821",
    eoriNumber: "EORI-PH-1001",
    useGlnInElectronicDocuments: false,
    copySellToAddrToQteFrom: copySellToAddressOptions[0],
    genBusPostingGroup: vatBusinessPostingGroups[0],
    customerPostingGroup: customerPostingGroupOptions[1],
    customerPriceGroup: customerPriceGroupOptions[1],
    customerDiscGroup: customerDiscGroupOptions[1],
    eDocumentServiceParticipant: 0,
    paymentTermsCode: paymentTermsOptions[2],
    shipToCode: shipToOptions[0],
    locationCode: locationCodes[0],
    combineSalesShipments: false,
    reserve: reserveOptions[0],
    shippingAdvice: shippingAdviceOptions[0],
    shipmentMethodCode: shipmentMethodOptions[0],
    baseCalendarCode: baseCalendarOptions[0],
    customizedCalendar: yesNoOptions[0],
    defaultTransactionType: transactionTypeOptions[0],
    defaultTransactionTypeReturn: transactionTypeOptions[0],
    defaultTransportMethod: customerTransportMethodOptions[0],
    overduePayments: 24500,
    paymentsThisYearAsOf: 560000,
    postedInvoicesCount: 18,
    postedCreditMemosCount: 1,
    ongoingInvoicesCount: 3,
    ongoingCreditMemosCount: 0,
    totalSales: 1820000,
    invoiceDiscounts: 14500,
  }),
  buildInitialCustomer({
    id: "CUST-1002",
    name: "South Star Drug Cebu",
    balanceLcy: 96500,
    balanceLcyAsVendor: 0,
    overdueBalanceLcy: 0,
    creditLimitLcy: 180000,
    blocked: "",
    totalSalesFiscalYear: 1125000,
    costsLcy: 845000,
    address: "Osmena Boulevard",
    address2: "Capitol Site",
    countryRegionCode: "PH",
    city: "Cebu City",
    postCode: "6000",
    phoneNo: "032-412-2210",
    mobilePhoneNo: "0917-550-2420",
    email: "cebu@southstar.ph",
    homePage: "https://www.southstardrug.com.ph",
    contact: "Branch Procurement",
    contactName: "Jessa Lim",
    vatRegistrationNo: "VAT-1002-99207",
    eoriNumber: "EORI-PH-1002",
    useGlnInElectronicDocuments: true,
    copySellToAddrToQteFrom: copySellToAddressOptions[0],
    genBusPostingGroup: vatBusinessPostingGroups[0],
    customerPostingGroup: customerPostingGroupOptions[1],
    customerPriceGroup: customerPriceGroupOptions[1],
    customerDiscGroup: customerDiscGroupOptions[1],
    eDocumentServiceParticipant: 1,
    paymentTermsCode: paymentTermsOptions[1],
    shipToCode: shipToOptions[2],
    locationCode: locationCodes[1],
    combineSalesShipments: true,
    reserve: reserveOptions[0],
    shippingAdvice: shippingAdviceOptions[0],
    shipmentMethodCode: shipmentMethodOptions[0],
    baseCalendarCode: baseCalendarOptions[1],
    customizedCalendar: yesNoOptions[0],
    defaultTransactionType: transactionTypeOptions[0],
    defaultTransactionTypeReturn: transactionTypeOptions[0],
    defaultTransportMethod: customerTransportMethodOptions[0],
    overduePayments: 0,
    paymentsThisYearAsOf: 430000,
    postedInvoicesCount: 12,
    postedCreditMemosCount: 0,
    ongoingInvoicesCount: 2,
    ongoingCreditMemosCount: 0,
    totalSales: 1125000,
    invoiceDiscounts: 9800,
  }),
  buildInitialCustomer({
    id: "CUST-1003",
    name: "The Generics Pharmacy QC",
    balanceLcy: 214000,
    balanceLcyAsVendor: 0,
    overdueBalanceLcy: 64000,
    creditLimitLcy: 300000,
    blocked: "",
    totalSalesFiscalYear: 1945000,
    costsLcy: 1510000,
    address: "Aurora Boulevard",
    address2: "Cubao",
    countryRegionCode: "PH",
    city: "Quezon City",
    postCode: "1109",
    phoneNo: "02-8460-7712",
    mobilePhoneNo: "0917-550-2430",
    email: "qc@genericspharmacy.ph",
    homePage: "https://www.tgp.com.ph",
    contact: "Finance Team",
    contactName: "Paolo Garcia",
    vatRegistrationNo: "VAT-1003-12088",
    eoriNumber: "EORI-PH-1003",
    useGlnInElectronicDocuments: false,
    copySellToAddrToQteFrom: copySellToAddressOptions[0],
    genBusPostingGroup: vatBusinessPostingGroups[0],
    customerPostingGroup: customerPostingGroupOptions[0],
    customerPriceGroup: customerPriceGroupOptions[2],
    customerDiscGroup: customerDiscGroupOptions[2],
    eDocumentServiceParticipant: 0,
    paymentTermsCode: paymentTermsOptions[2],
    shipToCode: shipToOptions[0],
    locationCode: locationCodes[0],
    combineSalesShipments: false,
    reserve: reserveOptions[0],
    shippingAdvice: shippingAdviceOptions[1],
    shipmentMethodCode: shipmentMethodOptions[3],
    baseCalendarCode: baseCalendarOptions[0],
    customizedCalendar: yesNoOptions[0],
    defaultTransactionType: transactionTypeOptions[0],
    defaultTransactionTypeReturn: transactionTypeOptions[0],
    defaultTransportMethod: customerTransportMethodOptions[2],
    overduePayments: 64000,
    paymentsThisYearAsOf: 620000,
    postedInvoicesCount: 21,
    postedCreditMemosCount: 2,
    ongoingInvoicesCount: 4,
    ongoingCreditMemosCount: 1,
    totalSales: 1945000,
    invoiceDiscounts: 18800,
  }),
  buildInitialCustomer({
    id: "CUST-1004",
    name: "St. Luke's BGC",
    balanceLcy: 338000,
    balanceLcyAsVendor: 0,
    overdueBalanceLcy: 125000,
    creditLimitLcy: 450000,
    blocked: "",
    totalSalesFiscalYear: 2860000,
    costsLcy: 2215000,
    address: "Rizal Drive",
    address2: "Bonifacio Global City",
    countryRegionCode: "PH",
    city: "Taguig",
    postCode: "1634",
    phoneNo: "02-8789-7700",
    mobilePhoneNo: "0917-550-2440",
    email: "procurement@stlukes.com.ph",
    homePage: "https://www.stlukes.com.ph",
    contact: "Hospital Purchasing",
    contactName: "Erika Velasco",
    vatRegistrationNo: "VAT-1004-00654",
    eoriNumber: "EORI-PH-1004",
    useGlnInElectronicDocuments: true,
    copySellToAddrToQteFrom: copySellToAddressOptions[0],
    genBusPostingGroup: vatBusinessPostingGroups[0],
    customerPostingGroup: customerPostingGroupOptions[2],
    customerPriceGroup: customerPriceGroupOptions[2],
    customerDiscGroup: customerDiscGroupOptions[2],
    eDocumentServiceParticipant: 2,
    paymentTermsCode: paymentTermsOptions[0],
    shipToCode: shipToOptions[2],
    locationCode: locationCodes[2],
    combineSalesShipments: false,
    reserve: reserveOptions[1],
    shippingAdvice: shippingAdviceOptions[0],
    shipmentMethodCode: shipmentMethodOptions[3],
    baseCalendarCode: baseCalendarOptions[2],
    customizedCalendar: yesNoOptions[0],
    defaultTransactionType: transactionTypeOptions[0],
    defaultTransactionTypeReturn: transactionTypeOptions[0],
    defaultTransportMethod: customerTransportMethodOptions[2],
    overduePayments: 125000,
    paymentsThisYearAsOf: 910000,
    postedInvoicesCount: 28,
    postedCreditMemosCount: 1,
    ongoingInvoicesCount: 5,
    ongoingCreditMemosCount: 0,
    totalSales: 2860000,
    invoiceDiscounts: 24750,
  }),
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function toISODate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function addDaysToISODate(dateString: string, days: number) {
  const nextDate = new Date(dateString);
  nextDate.setDate(nextDate.getDate() + days);
  return toISODate(nextDate);
}

export function getPaymentTermDays(paymentTermsCode: string) {
  if (paymentTermsCode === "Immediate") return 0;

  const match = paymentTermsCode.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function getSuggestedDueDate(documentDate: string, paymentTermsCode: string) {
  return addDaysToISODate(documentDate, getPaymentTermDays(paymentTermsCode));
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

export function normalizeInventoryRecord(item: Partial<InventoryItem>) {
  const baseUnitOfMeasure = item.baseUnitOfMeasure ?? item.salesUnitOfMeasure ?? item.purchUnitOfMeasure ?? baseUnitOfMeasureOptions[0];
  const category = item.itemCategoryCode ?? item.category ?? inventoryItemCategoryOptions[0];
  const location = item.location ?? inventoryLocationOptions[0];
  const unitCost = item.unitCost ?? 0;
  const unitPrice = item.unitPrice ?? Number((unitCost * 6.5).toFixed(2));
  const profitPercent = item.profitPercent ?? (unitPrice > 0
    ? Number((((unitPrice - unitCost) / unitPrice) * 100).toFixed(2))
    : 0);

  return {
    sku: item.sku ?? "ITEM-UNKNOWN",
    description: item.description ?? "Unnamed Item",
    blocked: item.blocked ?? false,
    itemType: item.itemType ?? inventoryItemTypeOptions[0],
    baseUnitOfMeasure,
    category,
    itemCategoryCode: category,
    variantMandatoryIfExists: item.variantMandatoryIfExists ?? yesNoDefaultOptions[0],
    location,
    shelfNo: item.shelfNo ?? "",
    onHand: item.onHand ?? 0,
    allocated: item.allocated ?? 0,
    qtyOnPurchOrder: item.qtyOnPurchOrder ?? 0,
    reorderPoint: item.reorderPoint ?? 0,
    stockoutWarning: item.stockoutWarning ?? yesNoDefaultOptions[0],
    unitVolume: item.unitVolume ?? 0,
    overReceiptCode: item.overReceiptCode ?? overReceiptCodeOptions[0],
    unitPrice,
    unitCost,
    profitPercent,
    salesPricesAndDiscounts: item.salesPricesAndDiscounts ?? "Create New...",
    salesUnitOfMeasure: item.salesUnitOfMeasure ?? baseUnitOfMeasure,
    subscriptionOption: item.subscriptionOption ?? subscriptionOptions[0],
    salesBlocked: item.salesBlocked ?? false,
    replenishmentSystem: item.replenishmentSystem ?? replenishmentSystemOptions[0],
    leadTimeCalculation: item.leadTimeCalculation ?? "7D",
    vendorNo: item.vendorNo ?? vendorOptions[0],
    vendorItemNo: item.vendorItemNo ?? "",
    purchUnitOfMeasure: item.purchUnitOfMeasure ?? baseUnitOfMeasure,
    purchasingBlocked: item.purchasingBlocked ?? false,
    usageDataSupplierReference: item.usageDataSupplierReference ?? "No",
    assemblyPolicy: item.assemblyPolicy ?? assemblyPolicyOptions[0],
    assemblyBom: item.assemblyBom ?? yesNoOptions[0],
    reorderingPolicy: item.reorderingPolicy ?? reorderingPolicyOptions[0],
    orderTrackingPolicy: item.orderTrackingPolicy ?? orderTrackingPolicyOptions[0],
    stockkeepingUnitExists: item.stockkeepingUnitExists ?? yesNoOptions[0],
    critical: item.critical ?? false,
    safetyLeadTime: item.safetyLeadTime ?? "2D",
    safetyStockQuantity: item.safetyStockQuantity ?? 0,
    includeInventory: item.includeInventory ?? false,
    lotAccumulationPeriod: item.lotAccumulationPeriod ?? "1W",
    reschedulingPeriod: item.reschedulingPeriod ?? "1W",
    reorderQuantity: item.reorderQuantity ?? item.reorderPoint ?? 0,
    maximumInventory: item.maximumInventory ?? (item.reorderPoint ?? 0) * 3,
    minimumOrderQuantity: item.minimumOrderQuantity ?? 1,
    maximumOrderQuantity: item.maximumOrderQuantity ?? (item.reorderPoint ?? 0) * 4,
    orderMultiple: item.orderMultiple ?? 10,
    itemTrackingCode: item.itemTrackingCode ?? itemTrackingCodeOptions[0],
    serialNos: item.serialNos ?? serialNumberOptions[0],
    lotNos: item.lotNos ?? lotNumberOptions[0],
    expirationCalculation: item.expirationCalculation ?? "",
    warehouseClassCode: item.warehouseClassCode ?? warehouseClassCodeOptions[0],
    putAwayTemplateCode: item.putAwayTemplateCode ?? putAwayTemplateOptions[0],
    putAwayUnitOfMeasureCode: item.putAwayUnitOfMeasureCode ?? baseUnitOfMeasure,
    physInvtCountingPeriodCode: item.physInvtCountingPeriodCode ?? physInventoryCountingPeriodOptions[0],
    lastPhysInvtDate: item.lastPhysInvtDate ?? "",
    lastCountingPeriodUpdate: item.lastCountingPeriodUpdate ?? "",
    nextCountingStartDate: item.nextCountingStartDate ?? "",
    nextCountingEndDate: item.nextCountingEndDate ?? "",
    exciseTaxType: item.exciseTaxType ?? exciseTaxTypeOptions[0],
    quantityForExciseTax: item.quantityForExciseTax ?? 0,
    exciseTaxUnitOfMeasure: item.exciseTaxUnitOfMeasure ?? baseUnitOfMeasure,
    health: "Healthy" as const,
    nextReceipt: item.nextReceipt ?? "",
  } satisfies InventoryItem;
}

export function normalizeInventoryItem(item: Partial<InventoryItem>): InventoryItem {
  const normalizedItem = normalizeInventoryRecord(item);

  return {
    ...normalizedItem,
    health: getInventoryHealth(normalizedItem),
  };
}

export function getSuggestedUnitPrice(item: InventoryItem) {
  return Number((item.unitCost * 6.5).toFixed(2));
}

export function calculateSalesOrderAmount(order: SalesOrder) {
  return order.lines.reduce((total, line) => total + (line.quantity * line.unitPrice), 0);
}

export function calculateSalesOrderSubtotal(order: SalesOrder) {
  return calculateSalesOrderAmount(order);
}

export function calculateSalesOrderInvoiceDiscount(order: SalesOrder) {
  return calculateSalesOrderSubtotal(order) * (order.paymentDiscountPercent / 100);
}

export function calculateSalesOrderTotalExclVat(order: SalesOrder) {
  return calculateSalesOrderSubtotal(order) - calculateSalesOrderInvoiceDiscount(order);
}

export function calculateSalesOrderVat(order: SalesOrder) {
  return calculateSalesOrderTotalExclVat(order) * 0.12;
}

export function calculateSalesOrderTotalInclVat(order: SalesOrder) {
  return calculateSalesOrderTotalExclVat(order) + calculateSalesOrderVat(order);
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
  const activeOrders = orders.filter((order) => order.status !== "Post");

  return {
    totalOpenAmount: activeOrders.reduce((total, order) => total + calculateSalesOrderTotalInclVat(order), 0),
    releasedCount: activeOrders.filter((order) => order.status === "Released").length,
    approvalRequestCount: activeOrders.filter((order) => order.status === "Approval Request").length,
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

export function buildCustomerSummary(customers: Customer[]): CustomerSummary {
  return {
    totalCustomers: customers.length,
    blockedCustomers: customers.filter((customer) => customer.blocked !== "").length,
    totalBalanceLcy: customers.reduce((total, customer) => total + customer.balanceLcy, 0),
    overdueCustomers: customers.filter((customer) => customer.overdueBalanceLcy > 0).length,
  };
}

export function getCustomerUsageOfCreditLimit(customer: Customer) {
  if (customer.creditLimitLcy <= 0) return 0;
  return Math.min(Math.round((customer.balanceLcy / customer.creditLimitLcy) * 100), 999);
}

export function getCustomerMoneyOwedCurrent(customer: Customer) {
  return Math.max(customer.balanceLcy - customer.overdueBalanceLcy, 0);
}

export function buildDemandBySku(orders: SalesOrder[]) {
  return orders
    .filter((order) => order.status !== "Post")
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

export function createInitialCustomers() {
  return initialCustomers.map((customer) => ({ ...customer }));
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
    customers: createInitialCustomers(),
    inventoryItems: createInitialInventoryItems(),
    activityLog: [...initialRecentBusinessActivity],
    ...createInitialWarehouseState(),
  };
}

export function getNextSalesOrderId(orders: SalesOrder[]) {
  const maxId = orders.reduce((highest, order) => {
    const numericPart = Number(order.id.replace("SO-", ""));
    return Number.isNaN(numericPart) ? highest : Math.max(highest, numericPart);
  }, 100240);

  return `SO-${maxId + 1}`;
}

export function getNextCustomerId(customers: Customer[]) {
  const maxId = customers.reduce((highest, customer) => {
    const numericPart = Number(customer.id.replace("CUST-", ""));
    return Number.isNaN(numericPart) ? highest : Math.max(highest, numericPart);
  }, 1000);

  return `CUST-${maxId + 1}`;
}

export function addActivity(activityLog: string[], message: string) {
  return [message, ...activityLog].slice(0, 12);
}

export function getDefaultLocationCodeForSku(sku: string) {
  const inventoryItem = initialInventorySeed.find((item) => item.sku === sku);
  return inventoryItem ? getLocationCodeFromLabel(inventoryItem.location) : "MAIN";
}

export function normalizeSalesOrderLineRecord(line: Partial<SalesOrderLine>, fallbackLocationCode: string): SalesOrderLine {
  const sku = line.sku ?? "ITEM-UNKNOWN";

  return {
    type: "Item",
    sku,
    itemReferenceNo: line.itemReferenceNo ?? `REF-${sku.replace("ITEM-", "")}`,
    description: line.description ?? sku,
    locationCode: line.locationCode ?? fallbackLocationCode,
    quantity: line.quantity ?? 0,
    qtyToShip: line.qtyToShip ?? line.quantity ?? 0,
    reservedQty: line.reservedQty ?? 0,
    unitPrice: line.unitPrice ?? 0,
  };
}

export function normalizeSalesOrderStatus(status: string | undefined): SalesOrderStatus {
  if (status === "Approval Request" || status === "Pending Approval") return "Approval Request";
  if (status === "Released" || status === "Ready to Ship") return "Released";
  if (status === "Post" || status === "Posted") return "Post";
  return "Open";
}

export function normalizeSalesOrderRecord(order: Partial<SalesOrder> & { customer?: string; location?: string; paymentTerms?: string }) {
  const documentDate = order.documentDate ?? order.orderDate ?? toISODate();
  const paymentTermsCode = order.paymentTermsCode ?? order.paymentTerms ?? paymentTermsOptions[2];
  const locationCode = order.locationCode ?? getLocationCodeFromLabel(order.location ?? "Main Warehouse");
  const shipmentDate = order.shipmentDate ?? order.requestedDeliveryDate ?? documentDate;

  return {
    id: order.id ?? "SO-UNKNOWN",
    customerName: order.customerName ?? order.customer ?? "Unnamed Customer",
    contact: order.contact ?? "",
    documentDate,
    postingDate: order.postingDate ?? documentDate,
    orderDate: order.orderDate ?? documentDate,
    dueDate: order.dueDate ?? getSuggestedDueDate(documentDate, paymentTermsCode),
    requestedDeliveryDate: order.requestedDeliveryDate ?? shipmentDate,
    externalDocumentNo: order.externalDocumentNo ?? "",
    locationCode,
    shipmentDate,
    paymentTermsCode,
    currencyCode: order.currencyCode ?? currencyCodes[0],
    companyBankAccountCode: order.companyBankAccountCode ?? companyBankAccountOptions[0],
    pricesIncludingVat: order.pricesIncludingVat ?? false,
    vatBusPostingGroup: order.vatBusPostingGroup ?? vatBusinessPostingGroups[0],
    paymentService: order.paymentService ?? paymentServiceOptions[0],
    branch: order.branch ?? branchOptions[0],
    department: order.department ?? departmentOptions[0],
    paymentDiscountPercent: order.paymentDiscountPercent ?? 0,
    eu3PartyTrade: order.eu3PartyTrade ?? false,
    directDebitMandateId: order.directDebitMandateId ?? "",
    shipTo: order.shipTo ?? shipToOptions[0],
    billTo: order.billTo ?? billToOptions[0],
    phoneNo: order.phoneNo ?? "",
    shippingContact: order.shippingContact ?? order.contact ?? "",
    transactionSpecification: order.transactionSpecification ?? transactionSpecificationOptions[0],
    transactionType: order.transactionType ?? transactionTypeOptions[0],
    transportMethod: order.transportMethod ?? transportMethodOptions[0],
    exitPoint: order.exitPoint ?? exitPointOptions[0],
    area: order.area ?? areaOptions[0],
    prepaymentPercent: order.prepaymentPercent ?? 0,
    compressPrepayment: order.compressPrepayment ?? false,
    prepaymentTermsCode: order.prepaymentTermsCode ?? paymentTermsOptions[0],
    prepaymentDueDate: order.prepaymentDueDate ?? shipmentDate,
    prepaymentPaymentDiscountPercent: order.prepaymentPaymentDiscountPercent ?? 0,
    prepaymentPaymentDiscountDate: order.prepaymentPaymentDiscountDate ?? shipmentDate,
    salesperson: order.salesperson ?? "Unassigned",
    status: normalizeSalesOrderStatus(order.status),
    lines: (order.lines ?? []).map((line) => normalizeSalesOrderLineRecord(line, locationCode)),
  } satisfies SalesOrder;
}

export function normalizeCustomerRecord(customer: Partial<Customer>) {
  return {
    id: customer.id ?? "CUST-UNKNOWN",
    name: customer.name ?? "Unnamed Customer",
    balanceLcy: customer.balanceLcy ?? 0,
    balanceLcyAsVendor: customer.balanceLcyAsVendor ?? 0,
    overdueBalanceLcy: customer.overdueBalanceLcy ?? 0,
    creditLimitLcy: customer.creditLimitLcy ?? 0,
    blocked: customer.blocked ?? customerBlockedOptions[0],
    totalSalesFiscalYear: customer.totalSalesFiscalYear ?? 0,
    costsLcy: customer.costsLcy ?? 0,
    address: customer.address ?? "",
    address2: customer.address2 ?? "",
    countryRegionCode: customer.countryRegionCode ?? countryRegionCodeOptions[0],
    city: customer.city ?? "",
    postCode: customer.postCode ?? "",
    phoneNo: customer.phoneNo ?? "",
    mobilePhoneNo: customer.mobilePhoneNo ?? "",
    email: customer.email ?? "",
    homePage: customer.homePage ?? "",
    contact: customer.contact ?? "",
    contactName: customer.contactName ?? "",
    vatRegistrationNo: customer.vatRegistrationNo ?? "",
    eoriNumber: customer.eoriNumber ?? "",
    useGlnInElectronicDocuments: customer.useGlnInElectronicDocuments ?? false,
    copySellToAddrToQteFrom: customer.copySellToAddrToQteFrom ?? copySellToAddressOptions[0],
    genBusPostingGroup: customer.genBusPostingGroup ?? vatBusinessPostingGroups[0],
    customerPostingGroup: customer.customerPostingGroup ?? customerPostingGroupOptions[0],
    customerPriceGroup: customer.customerPriceGroup ?? customerPriceGroupOptions[0],
    customerDiscGroup: customer.customerDiscGroup ?? customerDiscGroupOptions[0],
    eDocumentServiceParticipant: customer.eDocumentServiceParticipant ?? 0,
    paymentTermsCode: customer.paymentTermsCode ?? paymentTermsOptions[2],
    shipToCode: customer.shipToCode ?? shipToOptions[0],
    locationCode: customer.locationCode ?? locationCodes[0],
    combineSalesShipments: customer.combineSalesShipments ?? false,
    reserve: customer.reserve ?? reserveOptions[0],
    shippingAdvice: customer.shippingAdvice ?? shippingAdviceOptions[0],
    shipmentMethodCode: customer.shipmentMethodCode ?? shipmentMethodOptions[0],
    baseCalendarCode: customer.baseCalendarCode ?? baseCalendarOptions[0],
    customizedCalendar: customer.customizedCalendar ?? yesNoOptions[0],
    defaultTransactionType: customer.defaultTransactionType ?? transactionTypeOptions[0],
    defaultTransactionTypeReturn: customer.defaultTransactionTypeReturn ?? transactionTypeOptions[0],
    defaultTransportMethod: customer.defaultTransportMethod ?? customerTransportMethodOptions[0],
    overduePayments: customer.overduePayments ?? customer.overdueBalanceLcy ?? 0,
    paymentsThisYearAsOf: customer.paymentsThisYearAsOf ?? 0,
    postedInvoicesCount: customer.postedInvoicesCount ?? 0,
    postedCreditMemosCount: customer.postedCreditMemosCount ?? 0,
    ongoingInvoicesCount: customer.ongoingInvoicesCount ?? 0,
    ongoingCreditMemosCount: customer.ongoingCreditMemosCount ?? 0,
    totalSales: customer.totalSales ?? customer.totalSalesFiscalYear ?? 0,
    invoiceDiscounts: customer.invoiceDiscounts ?? 0,
  } satisfies Customer;
}
