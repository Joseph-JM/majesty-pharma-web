"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import {
  addActivity,
  buildCustomerSummary,
  buildDemandBySku,
  buildInventorySummary,
  buildSalesOrderSummary,
  calculateReservedPercent,
  createInitialBusinessState,
  getNextCustomerId,
  getInventoryAvailable,
  getNextSalesOrderId,
  normalizeInventoryItem,
  normalizeCustomerRecord,
  normalizeSalesOrderRecord,
  toISODate,
  type CreateCustomerInput,
  type CreateSalesOrderInput,
  type CreateInventoryItemInput,
  type Customer,
  type InventoryItem,
  type SalesOrder,
  type UpdateCustomerInput,
  type UpdateInventoryItemInput,
  type UpdateSalesOrderInput,
} from "@/lib/business";
import {
  getNextMovementId,
  getNextPurchaseOrderId,
  getNextPurchaseReturnId,
  getNextPutAwayId,
  getNextReceiptId,
  getNextSalesReturnId,
  getNextShipmentId,
  normalizeBoStock,
  normalizePurchaseOrder,
  normalizePurchaseReturnOrder,
  normalizePutAway,
  normalizeSalesReturnOrder,
  normalizeWarehouseMovement,
  normalizeWarehouseReceipt,
  normalizeWarehouseShipment,
  resolveDispatchSchedule,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type PurchaseReturnOrder,
  type SalesReturnOrder,
  type WarehouseMovement,
  type WarehousePutAway,
  type WarehouseReceipt,
  type WarehouseShipment,
} from "@/lib/warehouse";

type BusinessState = ReturnType<typeof createInitialBusinessState>;

type WarehouseActor = { id: string; name: string };

type CreatePurchaseOrderInput = {
  vendorNo: string;
  vendorName: string;
  orderDate: string;
  expectedReceiptDate: string;
  locationCode: string;
  lines: { sku: string; description: string; uom: string; quantity: number }[];
};

type CreateSalesReturnInput = {
  customerName: string;
  returnDate: string;
  locationCode: string;
  disposition: "BO" | "Resale";
  lines: { sku: string; description: string; qty: number }[];
};

type CreatePurchaseReturnInput = {
  vendorNo: string;
  vendorName: string;
  returnDate: string;
  locationCode: string;
  lines: { sku: string; description: string; qty: number }[];
};

type CreateInternalMovementInput = {
  fromArea: string;
  toArea: string;
  locationCode: string;
  reference: string;
  lines: { sku: string; description: string; qty: number }[];
};

type CreateReplenishmentInput = {
  locationCode: string;
  lines: { sku: string; description: string; qty: number }[];
};

type BusinessContextValue = {
  salesOrders: SalesOrder[];
  customers: Customer[];
  inventoryItems: InventoryItem[];
  activityLog: string[];
  customerSummary: ReturnType<typeof buildCustomerSummary>;
  salesOrderSummary: ReturnType<typeof buildSalesOrderSummary>;
  inventorySummary: ReturnType<typeof buildInventorySummary>;
  demandBySku: Record<string, number>;
  createCustomer: (input: CreateCustomerInput) => void;
  updateCustomer: (input: UpdateCustomerInput) => void;
  createSalesOrder: (input: CreateSalesOrderInput) => void;
  updateSalesOrder: (input: UpdateSalesOrderInput) => void;
  createInventoryItem: (input: CreateInventoryItemInput) => void;
  updateInventoryItem: (input: UpdateInventoryItemInput) => void;
  reserveSalesOrder: (orderId: string) => void;
  postSalesOrder: (orderId: string) => void;
  receiveInventory: (sku: string, quantity: number) => void;
  purchaseOrders: PurchaseOrder[];
  warehouseReceipts: WarehouseReceipt[];
  putAways: WarehousePutAway[];
  warehouseShipments: WarehouseShipment[];
  warehouseMovements: WarehouseMovement[];
  salesReturnOrders: SalesReturnOrder[];
  purchaseReturnOrders: PurchaseReturnOrder[];
  boStock: Record<string, number>;
  createPurchaseOrder: (input: CreatePurchaseOrderInput) => void;
  releasePurchaseOrder: (poId: string) => void;
  createReceiptFromPO: (poId: string) => void;
  postWarehouseReceipt: (receiptId: string) => void;
  postPutAway: (putAwayId: string) => void;
  createShipmentFromSalesOrder: (orderId: string) => void;
  postPick: (shipmentId: string, actor: WarehouseActor) => void;
  postChecking: (shipmentId: string, actor: WarehouseActor) => void;
  postShipment: (shipmentId: string, actor: WarehouseActor) => void;
  createReplenishmentMovement: (input: CreateReplenishmentInput) => void;
  createInternalMovement: (input: CreateInternalMovementInput) => void;
  registerMovement: (movementId: string, actor: WarehouseActor) => void;
  createSalesReturnOrder: (input: CreateSalesReturnInput) => void;
  releaseSalesReturnOrder: (sroId: string) => void;
  createReceiptFromSRO: (sroId: string) => void;
  approveReturnForResale: (sroId: string, actor: WarehouseActor) => void;
  createPurchaseReturnOrder: (input: CreatePurchaseReturnInput) => void;
  releasePurchaseReturnOrder: (proId: string) => void;
  createShipmentFromPRO: (proId: string) => void;
};

const STORAGE_KEY = "majesty-pharma-business";
const businessListeners = new Set<() => void>();

const BusinessContext = createContext<BusinessContextValue | null>(null);

function emitBusinessChange() {
  businessListeners.forEach((listener) => listener());
}

function cloneInventoryItems(items: InventoryItem[]) {
  return items.map((item) => ({ ...item }));
}

function normalizeInventoryItems(items: InventoryItem[]) {
  return items.map((item) => normalizeInventoryItem(item));
}

function rebuildInventoryAllocations(inventoryItems: InventoryItem[], salesOrders: SalesOrder[]) {
  const rebuiltItems = inventoryItems.map((item) => ({
    ...item,
    allocated: 0,
  }));

  for (const order of salesOrders) {
    if (order.status === "Post") continue;

    for (const line of order.lines) {
      const inventoryItem = rebuiltItems.find((item) => item.sku === line.sku);
      if (!inventoryItem) continue;

      inventoryItem.allocated += Math.min(line.reservedQty, line.quantity);
    }
  }

  return normalizeInventoryItems(rebuiltItems);
}

function hydrateBusinessState(snapshot: string | null): BusinessState {
  const initialState = createInitialBusinessState();
  if (!snapshot) return initialState;

  try {
    const parsed = JSON.parse(snapshot) as Partial<BusinessState>;

    return {
      salesOrders: (parsed.salesOrders ?? initialState.salesOrders).map((order) => normalizeSalesOrderRecord(order)),
      customers: (parsed.customers ?? initialState.customers).map((customer) => normalizeCustomerRecord(customer)),
      inventoryItems: normalizeInventoryItems(parsed.inventoryItems ?? initialState.inventoryItems),
      activityLog: parsed.activityLog ?? initialState.activityLog,
      purchaseOrders: (parsed.purchaseOrders ?? initialState.purchaseOrders).map((order) => normalizePurchaseOrder(order)),
      warehouseReceipts: (parsed.warehouseReceipts ?? initialState.warehouseReceipts).map((receipt) => normalizeWarehouseReceipt(receipt)),
      putAways: (parsed.putAways ?? initialState.putAways).map((putAway) => normalizePutAway(putAway)),
      warehouseShipments: (parsed.warehouseShipments ?? initialState.warehouseShipments).map((shipment) => normalizeWarehouseShipment(shipment)),
      warehouseMovements: (parsed.warehouseMovements ?? initialState.warehouseMovements).map((movement) => normalizeWarehouseMovement(movement)),
      salesReturnOrders: (parsed.salesReturnOrders ?? initialState.salesReturnOrders).map((order) => normalizeSalesReturnOrder(order)),
      purchaseReturnOrders: (parsed.purchaseReturnOrders ?? initialState.purchaseReturnOrders).map((order) => normalizePurchaseReturnOrder(order)),
      boStock: parsed.boStock ? normalizeBoStock(parsed.boStock) : initialState.boStock,
    };
  } catch {
    return initialState;
  }
}

function readBusinessSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerBusinessSnapshot() {
  return null;
}

function writeBusinessState(state: BusinessState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emitBusinessChange();
}

function subscribeToBusinessStore(listener: () => void) {
  businessListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      businessListeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    businessListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToBusinessStore, readBusinessSnapshot, getServerBusinessSnapshot);
  const state = useMemo(() => hydrateBusinessState(snapshot), [snapshot]);

  const customerSummary = useMemo(() => buildCustomerSummary(state.customers), [state.customers]);
  const salesOrderSummary = useMemo(() => buildSalesOrderSummary(state.salesOrders), [state.salesOrders]);
  const inventorySummary = useMemo(() => buildInventorySummary(state.inventoryItems), [state.inventoryItems]);
  const demandBySku = useMemo(() => buildDemandBySku(state.salesOrders), [state.salesOrders]);

  function updateBusinessState(updater: (current: BusinessState) => BusinessState) {
    const currentState = hydrateBusinessState(readBusinessSnapshot());
    writeBusinessState(updater(currentState));
  }

  const value = useMemo<BusinessContextValue>(() => ({
    salesOrders: state.salesOrders,
    customers: state.customers,
    inventoryItems: state.inventoryItems,
    activityLog: state.activityLog,
    customerSummary,
    salesOrderSummary,
    inventorySummary,
    demandBySku,
    purchaseOrders: state.purchaseOrders,
    warehouseReceipts: state.warehouseReceipts,
    putAways: state.putAways,
    warehouseShipments: state.warehouseShipments,
    warehouseMovements: state.warehouseMovements,
    salesReturnOrders: state.salesReturnOrders,
    purchaseReturnOrders: state.purchaseReturnOrders,
    boStock: state.boStock,
    createCustomer: (input) => {
      updateBusinessState((current) => {
        const requestedId = input.id.trim().toUpperCase();
        if (requestedId && current.customers.some((customer) => customer.id === requestedId)) {
          return current;
        }

        const nextCustomer = normalizeCustomerRecord({
          ...input,
          id: requestedId || getNextCustomerId(current.customers),
        });

        return {
          ...current,
          customers: [nextCustomer, ...current.customers],
          activityLog: addActivity(current.activityLog, `Customer ${nextCustomer.id} created for ${nextCustomer.name}`),
        };
      });
    },
    updateCustomer: (input) => {
      updateBusinessState((current) => {
        const existingCustomer = current.customers.find((customer) => customer.id === input.id);
        if (!existingCustomer) return current;

        const customers = current.customers.map((customer) => (
          customer.id === input.id ? normalizeCustomerRecord(input) : customer
        ));

        return {
          ...current,
          customers,
          activityLog: addActivity(current.activityLog, `Customer ${input.id} updated for ${input.name}`),
        };
      });
    },
    createSalesOrder: (input) => {
      updateBusinessState((current) => {
        const nextOrder: SalesOrder = {
          id: getNextSalesOrderId(current.salesOrders),
          customerName: input.customerName,
          contact: input.contact,
          documentDate: input.documentDate,
          postingDate: input.postingDate,
          orderDate: input.orderDate,
          dueDate: input.dueDate,
          requestedDeliveryDate: input.requestedDeliveryDate,
          externalDocumentNo: input.externalDocumentNo,
          locationCode: input.locationCode,
          shipmentDate: input.shipmentDate,
          paymentTermsCode: input.paymentTermsCode,
          currencyCode: input.currencyCode,
          companyBankAccountCode: input.companyBankAccountCode,
          pricesIncludingVat: input.pricesIncludingVat,
          vatBusPostingGroup: input.vatBusPostingGroup,
          paymentService: input.paymentService,
          branch: input.branch,
          department: input.department,
          paymentDiscountPercent: input.paymentDiscountPercent,
          eu3PartyTrade: input.eu3PartyTrade,
          directDebitMandateId: input.directDebitMandateId,
          shipTo: input.shipTo,
          billTo: input.billTo,
          phoneNo: input.phoneNo,
          shippingContact: input.shippingContact,
          transactionSpecification: input.transactionSpecification,
          transactionType: input.transactionType,
          transportMethod: input.transportMethod,
          exitPoint: input.exitPoint,
          area: input.area,
          prepaymentPercent: input.prepaymentPercent,
          compressPrepayment: input.compressPrepayment,
          prepaymentTermsCode: input.prepaymentTermsCode,
          prepaymentDueDate: input.prepaymentDueDate,
          prepaymentPaymentDiscountPercent: input.prepaymentPaymentDiscountPercent,
          prepaymentPaymentDiscountDate: input.prepaymentPaymentDiscountDate,
          salesperson: input.salesperson,
          status: "Open",
          lines: input.lines.map((line) => {
            const item = current.inventoryItems.find((inventoryItem) => inventoryItem.sku === line.sku);
            return {
              type: "Item" as const,
              sku: line.sku,
              itemReferenceNo: line.itemReferenceNo,
              description: item?.description ?? line.sku,
              locationCode: line.locationCode,
              quantity: line.quantity,
              qtyToShip: line.qtyToShip,
              reservedQty: line.reservedQty ?? 0,
              unitPrice: line.unitPrice,
            };
          }),
        };

        nextOrder.status = "Open";

        return {
          ...current,
          salesOrders: [nextOrder, ...current.salesOrders],
          activityLog: addActivity(current.activityLog, `Sales order ${nextOrder.id} created for ${nextOrder.customerName}`),
        };
      });
    },
    updateSalesOrder: (input) => {
      updateBusinessState((current) => {
        const existingOrder = current.salesOrders.find((order) => order.id === input.id);
        if (!existingOrder) return current;

        const salesOrders = current.salesOrders.map((order) => {
          if (order.id !== input.id) return order;

          return {
            id: order.id,
            customerName: input.customerName,
            contact: input.contact,
            documentDate: input.documentDate,
            postingDate: input.postingDate,
            orderDate: input.orderDate,
            dueDate: input.dueDate,
            requestedDeliveryDate: input.requestedDeliveryDate,
            externalDocumentNo: input.externalDocumentNo,
            locationCode: input.locationCode,
            shipmentDate: input.shipmentDate,
            paymentTermsCode: input.paymentTermsCode,
            currencyCode: input.currencyCode,
            companyBankAccountCode: input.companyBankAccountCode,
            pricesIncludingVat: input.pricesIncludingVat,
            vatBusPostingGroup: input.vatBusPostingGroup,
            paymentService: input.paymentService,
            branch: input.branch,
            department: input.department,
            paymentDiscountPercent: input.paymentDiscountPercent,
            eu3PartyTrade: input.eu3PartyTrade,
            directDebitMandateId: input.directDebitMandateId,
            shipTo: input.shipTo,
            billTo: input.billTo,
            phoneNo: input.phoneNo,
            shippingContact: input.shippingContact,
            transactionSpecification: input.transactionSpecification,
            transactionType: input.transactionType,
            transportMethod: input.transportMethod,
            exitPoint: input.exitPoint,
            area: input.area,
            prepaymentPercent: input.prepaymentPercent,
            compressPrepayment: input.compressPrepayment,
            prepaymentTermsCode: input.prepaymentTermsCode,
            prepaymentDueDate: input.prepaymentDueDate,
            prepaymentPaymentDiscountPercent: input.prepaymentPaymentDiscountPercent,
            prepaymentPaymentDiscountDate: input.prepaymentPaymentDiscountDate,
            salesperson: existingOrder.salesperson,
            status: input.status,
            lines: input.lines.map((line) => {
              const item = current.inventoryItems.find((inventoryItem) => inventoryItem.sku === line.sku);
              return {
                type: "Item" as const,
                sku: line.sku,
                itemReferenceNo: line.itemReferenceNo,
                description: item?.description ?? line.sku,
                locationCode: line.locationCode,
                quantity: line.quantity,
                qtyToShip: line.qtyToShip,
                reservedQty: Math.min(line.reservedQty ?? 0, line.quantity),
                unitPrice: line.unitPrice,
              };
            }),
          };
        });

        return {
          ...current,
          salesOrders,
          inventoryItems: rebuildInventoryAllocations(current.inventoryItems, salesOrders),
          activityLog: addActivity(current.activityLog, `Sales order ${input.id} updated for ${input.customerName}`),
        };
      });
    },
    createInventoryItem: (input) => {
      updateBusinessState((current) => {
        if (current.inventoryItems.some((item) => item.sku === input.sku)) {
          return current;
        }

        const nextItem = normalizeInventoryItem(input);

        return {
          ...current,
          inventoryItems: [nextItem, ...current.inventoryItems],
          activityLog: addActivity(current.activityLog, `Inventory item ${nextItem.sku} created for ${nextItem.description}`),
        };
      });
    },
    updateInventoryItem: (input) => {
      updateBusinessState((current) => {
        const existingItem = current.inventoryItems.find((item) => item.sku === input.sku);
        if (!existingItem) return current;

        const inventoryItems = current.inventoryItems.map((item) => (
          item.sku === input.sku ? normalizeInventoryItem(input) : item
        ));

        return {
          ...current,
          inventoryItems,
          activityLog: addActivity(current.activityLog, `Inventory item ${input.sku} updated`),
        };
      });
    },
    reserveSalesOrder: (orderId) => {
      updateBusinessState((current) => {
        const inventoryItems = cloneInventoryItems(current.inventoryItems);
        let updatedOrder: SalesOrder | null = null;
        let activityMessage = "";

        const salesOrders = current.salesOrders.map((order) => {
          if (order.id !== orderId || order.status === "Post") return order;

          if (order.status === "Open") {
            updatedOrder = {
              ...order,
              status: "Approval Request",
            };
            activityMessage = `Sales order ${order.id} moved to Approval Request`;
            return updatedOrder;
          }

          const lines = order.lines.map((line) => {
            const inventoryItem = inventoryItems.find((item) => item.sku === line.sku);
            if (!inventoryItem) return line;

            const remainingQty = Math.max(line.quantity - line.reservedQty, 0);
            const availableQty = getInventoryAvailable(inventoryItem);
            const qtyToReserve = Math.min(remainingQty, availableQty);

            if (qtyToReserve > 0) {
              inventoryItem.allocated += qtyToReserve;
            }

            return {
              ...line,
              reservedQty: line.reservedQty + qtyToReserve,
            };
          });

          const nextOrder = {
            ...order,
            lines,
          };

          const reservedPercent = calculateReservedPercent(nextOrder);
          updatedOrder = {
            ...nextOrder,
            status: "Released",
          };

          if (order.status === "Approval Request") {
            activityMessage = reservedPercent === 100
              ? `Sales order ${order.id} released with full stock coverage`
              : `Sales order ${order.id} released with ${reservedPercent}% reserved stock`;
          } else {
            activityMessage = reservedPercent === 100
              ? `Sales order ${order.id} is fully reserved and ready for posting`
              : `Sales order ${order.id} reserved ${reservedPercent}% of required stock`;
          }

          return updatedOrder;
        });

        if (!updatedOrder) return current;

        return {
          ...current,
          salesOrders,
          inventoryItems: normalizeInventoryItems(inventoryItems),
          activityLog: addActivity(current.activityLog, activityMessage),
        };
      });
    },
    postSalesOrder: (orderId) => {
      updateBusinessState((current) => {
        const inventoryItems = cloneInventoryItems(current.inventoryItems);
        let postedOrder: SalesOrder | null = null;

        const salesOrders = current.salesOrders.map((order) => {
          if (order.id !== orderId || order.status === "Post") return order;
          if (order.status !== "Released") return order;

          for (const line of order.lines) {
            const inventoryItem = inventoryItems.find((item) => item.sku === line.sku);
            if (!inventoryItem) continue;

            inventoryItem.onHand = Math.max(inventoryItem.onHand - line.quantity, 0);
            inventoryItem.allocated = Math.max(inventoryItem.allocated - line.quantity, 0);
          }

          postedOrder = {
            ...order,
            status: "Post",
          };

          return postedOrder;
        });

        if (!postedOrder) return current;

        const finalizedOrder = postedOrder as SalesOrder;

        return {
          ...current,
          salesOrders,
          inventoryItems: normalizeInventoryItems(inventoryItems),
          activityLog: addActivity(current.activityLog, `Sales order ${finalizedOrder.id} posted`),
        };
      });
    },
    receiveInventory: (sku, quantity) => {
      updateBusinessState((current) => {
        if (quantity <= 0) return current;

        const inventoryItems = current.inventoryItems.map((item) => {
          if (item.sku !== sku) return item;

          return {
            ...item,
            onHand: item.onHand + quantity,
            nextReceipt: toISODate(),
          };
        });

        const updatedItem = inventoryItems.find((item) => item.sku === sku);
        if (!updatedItem) return current;

        return {
          ...current,
          inventoryItems: normalizeInventoryItems(inventoryItems),
          activityLog: addActivity(current.activityLog, `Received ${quantity} units into stock for ${updatedItem.description}`),
        };
      });
    },
    // ---------------------------------------------------------------------
    // Warehouse: Purchase Order Receiving (Inbound)
    // ---------------------------------------------------------------------
    createPurchaseOrder: (input) => {
      updateBusinessState((current) => {
        const id = getNextPurchaseOrderId(current.purchaseOrders);
        const order = normalizePurchaseOrder({
          id,
          ...input,
          status: "Open",
          lines: input.lines.map((line) => ({ ...line, qtyReceived: 0 })),
        });

        return {
          ...current,
          purchaseOrders: [order, ...current.purchaseOrders],
          activityLog: addActivity(current.activityLog, `Purchase order ${id} created for ${order.vendorName}`),
        };
      });
    },
    releasePurchaseOrder: (poId) => {
      updateBusinessState((current) => {
        let changed = false;
        const purchaseOrders = current.purchaseOrders.map((order) => {
          if (order.id !== poId || order.status !== "Open") return order;
          changed = true;
          return { ...order, status: "Released" as const };
        });

        if (!changed) return current;

        return {
          ...current,
          purchaseOrders,
          activityLog: addActivity(current.activityLog, `Purchase order ${poId} released to warehouse`),
        };
      });
    },
    createReceiptFromPO: (poId) => {
      updateBusinessState((current) => {
        const po = current.purchaseOrders.find((order) => order.id === poId);
        if (!po || po.status === "Received" || po.status === "Open") return current;
        if (current.warehouseReceipts.some((receipt) => receipt.sourceId === poId && receipt.status === "Open")) return current;

        const id = getNextReceiptId(current.warehouseReceipts);
        const receipt = normalizeWarehouseReceipt({
          id,
          sourceType: "Purchase",
          sourceId: poId,
          partyName: po.vendorName,
          receiptDate: toISODate(),
          locationCode: po.locationCode,
          status: "Open",
          lines: po.lines
            .filter((line) => line.quantity - line.qtyReceived > 0)
            .map((line) => ({
              sku: line.sku,
              description: line.description,
              uom: line.uom,
              qtyExpected: line.quantity - line.qtyReceived,
              qtyReceived: line.quantity - line.qtyReceived,
              discrepancy: "",
            })),
        });

        return {
          ...current,
          warehouseReceipts: [receipt, ...current.warehouseReceipts],
          activityLog: addActivity(current.activityLog, `Warehouse receipt ${id} created from ${poId}`),
        };
      });
    },
    postWarehouseReceipt: (receiptId) => {
      updateBusinessState((current) => {
        const receipt = current.warehouseReceipts.find((item) => item.id === receiptId);
        if (!receipt || receipt.status === "Posted") return current;

        const warehouseReceipts = current.warehouseReceipts.map((item) => (
          item.id === receiptId ? { ...item, status: "Posted" as const } : item
        ));

        const isReturn = receipt.sourceType === "SalesReturn";
        const putAwayId = getNextPutAwayId(current.putAways);
        const putAway = normalizePutAway({
          id: putAwayId,
          receiptId,
          sourceType: receipt.sourceType,
          toArea: isReturn ? "BO Area" : "Storage",
          status: "Open",
          lines: receipt.lines.map((line) => ({
            sku: line.sku,
            description: line.description,
            qty: line.qtyReceived,
            fromArea: "Receiving Dock",
            toBin: isReturn ? "BO-AREA" : "STORAGE",
          })),
        });

        return {
          ...current,
          warehouseReceipts,
          putAways: [putAway, ...current.putAways],
          activityLog: addActivity(current.activityLog, `Receipt ${receiptId} posted; put-away ${putAwayId} generated`),
        };
      });
    },
    postPutAway: (putAwayId) => {
      updateBusinessState((current) => {
        const putAway = current.putAways.find((item) => item.id === putAwayId);
        if (!putAway || putAway.status === "Posted") return current;

        const putAways = current.putAways.map((item) => (
          item.id === putAwayId ? { ...item, status: "Posted" as const } : item
        ));

        const linkedReceipt = current.warehouseReceipts.find((receipt) => receipt.id === putAway.receiptId);

        if (putAway.sourceType === "SalesReturn") {
          const boStock = { ...current.boStock };
          for (const line of putAway.lines) {
            boStock[line.sku] = (boStock[line.sku] ?? 0) + line.qty;
          }

          const salesReturnOrders = linkedReceipt
            ? current.salesReturnOrders.map((order) => (
              order.id === linkedReceipt.sourceId ? { ...order, status: "Received" as const } : order
            ))
            : current.salesReturnOrders;

          return {
            ...current,
            putAways,
            boStock,
            salesReturnOrders,
            activityLog: addActivity(current.activityLog, `Put-away ${putAwayId} posted to BO Area`),
          };
        }

        const inventoryItems = cloneInventoryItems(current.inventoryItems);
        for (const line of putAway.lines) {
          const item = inventoryItems.find((inventoryItem) => inventoryItem.sku === line.sku);
          if (!item) continue;
          item.onHand += line.qty;
          item.qtyOnPurchOrder = Math.max(item.qtyOnPurchOrder - line.qty, 0);
          item.nextReceipt = toISODate();
        }

        const purchaseOrders = linkedReceipt
          ? current.purchaseOrders.map((po) => {
            if (po.id !== linkedReceipt.sourceId) return po;

            const lines = po.lines.map((poLine) => {
              const putLine = putAway.lines.find((line) => line.sku === poLine.sku);
              return putLine
                ? { ...poLine, qtyReceived: Math.min(poLine.qtyReceived + putLine.qty, poLine.quantity) }
                : poLine;
            });

            const fullyReceived = lines.every((line) => line.qtyReceived >= line.quantity);
            const status: PurchaseOrderStatus = fullyReceived ? "Received" : "Partially Received";
            return { ...po, lines, status };
          })
          : current.purchaseOrders;

        return {
          ...current,
          putAways,
          inventoryItems: normalizeInventoryItems(inventoryItems),
          purchaseOrders,
          activityLog: addActivity(current.activityLog, `Put-away ${putAwayId} posted to Storage; stock now available`),
        };
      });
    },
    // ---------------------------------------------------------------------
    // Warehouse: Sales Order Shipping (Outbound) — pick -> check -> dispatch
    // ---------------------------------------------------------------------
    createShipmentFromSalesOrder: (orderId) => {
      updateBusinessState((current) => {
        const order = current.salesOrders.find((salesOrder) => salesOrder.id === orderId);
        if (!order || order.status !== "Released") return current;
        if (current.warehouseShipments.some((shipment) => shipment.sourceType === "Sales" && shipment.sourceId === orderId && shipment.status !== "Shipped")) return current;

        const id = getNextShipmentId(current.warehouseShipments);
        const dispatchSchedule = resolveDispatchSchedule();
        const shipment = normalizeWarehouseShipment({
          id,
          sourceType: "Sales",
          sourceId: orderId,
          partyName: order.customerName,
          shipmentDate: toISODate(),
          locationCode: order.locationCode,
          status: "Open",
          dispatchSchedule,
          lines: order.lines.map((line) => ({
            sku: line.sku,
            description: line.description,
            qty: line.quantity,
            fromBin: "PICK",
          })),
        });

        return {
          ...current,
          warehouseShipments: [shipment, ...current.warehouseShipments],
          activityLog: addActivity(current.activityLog, `Warehouse shipment ${id} created from ${orderId} (${dispatchSchedule} dispatch)`),
        };
      });
    },
    postPick: (shipmentId, actor) => {
      updateBusinessState((current) => {
        let changed = false;
        const warehouseShipments = current.warehouseShipments.map((shipment) => {
          if (shipment.id !== shipmentId || shipment.status !== "Open") return shipment;
          changed = true;
          return { ...shipment, status: "Picked" as const, pickerId: actor.id, pickerName: actor.name, pickedAt: toISODate() };
        });

        if (!changed) return current;

        return {
          ...current,
          warehouseShipments,
          activityLog: addActivity(current.activityLog, `Shipment ${shipmentId} picked and moved to Checking by ${actor.name}`),
        };
      });
    },
    postChecking: (shipmentId, actor) => {
      updateBusinessState((current) => {
        const shipment = current.warehouseShipments.find((item) => item.id === shipmentId);
        if (!shipment || shipment.status !== "Picked") return current;

        const warehouseShipments = current.warehouseShipments.map((item) => (
          item.id === shipmentId
            ? { ...item, status: "Checked" as const, checkerId: actor.id, checkerName: actor.name, checkedAt: toISODate() }
            : item
        ));

        const movementId = getNextMovementId(current.warehouseMovements);
        const movement = normalizeWarehouseMovement({
          id: movementId,
          type: "Checking",
          status: "Registered",
          fromArea: "Checking Area",
          toArea: "Pre-Dispatch Area",
          locationCode: shipment.locationCode,
          reference: shipment.id,
          registeredBy: actor.name,
          registeredAt: toISODate(),
          lines: shipment.lines.map((line) => ({ sku: line.sku, description: line.description, qty: line.qty })),
        });

        return {
          ...current,
          warehouseShipments,
          warehouseMovements: [movement, ...current.warehouseMovements],
          activityLog: addActivity(current.activityLog, `Shipment ${shipmentId} checked & packed by ${actor.name}`),
        };
      });
    },
    postShipment: (shipmentId, actor) => {
      updateBusinessState((current) => {
        const shipment = current.warehouseShipments.find((item) => item.id === shipmentId);
        if (!shipment || shipment.status !== "Checked") return current;

        const warehouseShipments = current.warehouseShipments.map((item) => (
          item.id === shipmentId
            ? { ...item, status: "Shipped" as const, dispatchId: actor.id, dispatchName: actor.name, shippedAt: toISODate() }
            : item
        ));

        if (shipment.sourceType === "Sales") {
          const inventoryItems = cloneInventoryItems(current.inventoryItems);
          for (const line of shipment.lines) {
            const item = inventoryItems.find((inventoryItem) => inventoryItem.sku === line.sku);
            if (!item) continue;
            item.onHand = Math.max(item.onHand - line.qty, 0);
            item.allocated = Math.max(item.allocated - line.qty, 0);
          }

          const salesOrders = current.salesOrders.map((order) => (
            order.id === shipment.sourceId ? { ...order, status: "Post" as const } : order
          ));

          return {
            ...current,
            warehouseShipments,
            inventoryItems: normalizeInventoryItems(inventoryItems),
            salesOrders,
            activityLog: addActivity(current.activityLog, `Warehouse shipment ${shipmentId} dispatched by ${actor.name}; sales order posted`),
          };
        }

        const boStock = { ...current.boStock };
        for (const line of shipment.lines) {
          boStock[line.sku] = Math.max((boStock[line.sku] ?? 0) - line.qty, 0);
        }

        const purchaseReturnOrders = current.purchaseReturnOrders.map((order) => (
          order.id === shipment.sourceId ? { ...order, status: "Shipped" as const } : order
        ));

        return {
          ...current,
          warehouseShipments,
          boStock,
          purchaseReturnOrders,
          activityLog: addActivity(current.activityLog, `Vendor-return shipment ${shipmentId} dispatched by ${actor.name}`),
        };
      });
    },
    // ---------------------------------------------------------------------
    // Warehouse: Bin Replenishment & Internal Movement
    // ---------------------------------------------------------------------
    createReplenishmentMovement: (input) => {
      updateBusinessState((current) => {
        if (input.lines.length === 0) return current;

        const id = getNextMovementId(current.warehouseMovements);
        const movement = normalizeWarehouseMovement({
          id,
          type: "Replenishment",
          status: "Open",
          fromArea: "Storage",
          toArea: "Picking Bins",
          locationCode: input.locationCode,
          reference: "Movement Worksheet",
          lines: input.lines,
        });

        return {
          ...current,
          warehouseMovements: [movement, ...current.warehouseMovements],
          activityLog: addActivity(current.activityLog, `Replenishment movement ${id} generated (${input.lines.length} item${input.lines.length === 1 ? "" : "s"})`),
        };
      });
    },
    createInternalMovement: (input) => {
      updateBusinessState((current) => {
        if (input.lines.length === 0) return current;

        const id = getNextMovementId(current.warehouseMovements);
        const movement = normalizeWarehouseMovement({
          id,
          type: "Internal",
          status: "Open",
          fromArea: input.fromArea,
          toArea: input.toArea,
          locationCode: input.locationCode,
          reference: input.reference,
          lines: input.lines,
        });

        return {
          ...current,
          warehouseMovements: [movement, ...current.warehouseMovements],
          activityLog: addActivity(current.activityLog, `Internal movement ${id} created (${input.fromArea} to ${input.toArea})`),
        };
      });
    },
    registerMovement: (movementId, actor) => {
      updateBusinessState((current) => {
        let changed = false;
        const warehouseMovements = current.warehouseMovements.map((movement) => {
          if (movement.id !== movementId || movement.status === "Registered") return movement;
          changed = true;
          return { ...movement, status: "Registered" as const, registeredBy: actor.name, registeredAt: toISODate() };
        });

        if (!changed) return current;

        return {
          ...current,
          warehouseMovements,
          activityLog: addActivity(current.activityLog, `Movement ${movementId} registered by ${actor.name}`),
        };
      });
    },
    // ---------------------------------------------------------------------
    // Warehouse: Customer Returns
    // ---------------------------------------------------------------------
    createSalesReturnOrder: (input) => {
      updateBusinessState((current) => {
        const id = getNextSalesReturnId(current.salesReturnOrders);
        const order = normalizeSalesReturnOrder({ id, status: "Open", ...input });

        return {
          ...current,
          salesReturnOrders: [order, ...current.salesReturnOrders],
          activityLog: addActivity(current.activityLog, `Sales return ${id} created for ${order.customerName}`),
        };
      });
    },
    releaseSalesReturnOrder: (sroId) => {
      updateBusinessState((current) => {
        let changed = false;
        const salesReturnOrders = current.salesReturnOrders.map((order) => {
          if (order.id !== sroId || order.status !== "Open") return order;
          changed = true;
          return { ...order, status: "Released" as const };
        });

        if (!changed) return current;

        return {
          ...current,
          salesReturnOrders,
          activityLog: addActivity(current.activityLog, `Sales return ${sroId} released`),
        };
      });
    },
    createReceiptFromSRO: (sroId) => {
      updateBusinessState((current) => {
        const sro = current.salesReturnOrders.find((order) => order.id === sroId);
        if (!sro || sro.status === "Received" || sro.status === "Open") return current;
        if (current.warehouseReceipts.some((receipt) => receipt.sourceType === "SalesReturn" && receipt.sourceId === sroId && receipt.status === "Open")) return current;

        const id = getNextReceiptId(current.warehouseReceipts);
        const receipt = normalizeWarehouseReceipt({
          id,
          sourceType: "SalesReturn",
          sourceId: sroId,
          partyName: sro.customerName,
          receiptDate: toISODate(),
          locationCode: sro.locationCode,
          status: "Open",
          lines: sro.lines.map((line) => ({
            sku: line.sku,
            description: line.description,
            uom: "PCS",
            qtyExpected: line.qty,
            qtyReceived: line.qty,
            discrepancy: "",
          })),
        });

        return {
          ...current,
          warehouseReceipts: [receipt, ...current.warehouseReceipts],
          activityLog: addActivity(current.activityLog, `Warehouse receipt ${id} created from ${sroId}`),
        };
      });
    },
    approveReturnForResale: (sroId, actor) => {
      updateBusinessState((current) => {
        const sro = current.salesReturnOrders.find((order) => order.id === sroId);
        if (!sro || sro.status !== "Received") return current;

        const boStock = { ...current.boStock };
        const inventoryItems = cloneInventoryItems(current.inventoryItems);
        const movedLines: { sku: string; description: string; qty: number }[] = [];

        for (const line of sro.lines) {
          const available = boStock[line.sku] ?? 0;
          const moveQty = Math.min(available, line.qty);
          if (moveQty <= 0) continue;

          boStock[line.sku] = available - moveQty;
          const item = inventoryItems.find((inventoryItem) => inventoryItem.sku === line.sku);
          if (item) item.onHand += moveQty;
          movedLines.push({ sku: line.sku, description: line.description, qty: moveQty });
        }

        if (movedLines.length === 0) return current;

        const movementId = getNextMovementId(current.warehouseMovements);
        const movement = normalizeWarehouseMovement({
          id: movementId,
          type: "Internal",
          status: "Registered",
          fromArea: "BO Area",
          toArea: "Storage",
          locationCode: sro.locationCode,
          reference: sroId,
          registeredBy: actor.name,
          registeredAt: toISODate(),
          lines: movedLines,
        });

        const salesReturnOrders = current.salesReturnOrders.map((order) => (
          order.id === sroId ? { ...order, disposition: "Resale" as const } : order
        ));

        return {
          ...current,
          boStock,
          inventoryItems: normalizeInventoryItems(inventoryItems),
          warehouseMovements: [movement, ...current.warehouseMovements],
          salesReturnOrders,
          activityLog: addActivity(current.activityLog, `Return ${sroId} approved for resale; moved BO Area to Storage`),
        };
      });
    },
    // ---------------------------------------------------------------------
    // Warehouse: Vendor Returns
    // ---------------------------------------------------------------------
    createPurchaseReturnOrder: (input) => {
      updateBusinessState((current) => {
        const id = getNextPurchaseReturnId(current.purchaseReturnOrders);
        const order = normalizePurchaseReturnOrder({ id, status: "Open", ...input });

        return {
          ...current,
          purchaseReturnOrders: [order, ...current.purchaseReturnOrders],
          activityLog: addActivity(current.activityLog, `Purchase return ${id} created for ${order.vendorName}`),
        };
      });
    },
    releasePurchaseReturnOrder: (proId) => {
      updateBusinessState((current) => {
        let changed = false;
        const purchaseReturnOrders = current.purchaseReturnOrders.map((order) => {
          if (order.id !== proId || order.status !== "Open") return order;
          changed = true;
          return { ...order, status: "Released" as const };
        });

        if (!changed) return current;

        return {
          ...current,
          purchaseReturnOrders,
          activityLog: addActivity(current.activityLog, `Purchase return ${proId} released`),
        };
      });
    },
    createShipmentFromPRO: (proId) => {
      updateBusinessState((current) => {
        const pro = current.purchaseReturnOrders.find((order) => order.id === proId);
        if (!pro || pro.status === "Shipped" || pro.status === "Open") return current;
        if (current.warehouseShipments.some((shipment) => shipment.sourceType === "PurchaseReturn" && shipment.sourceId === proId && shipment.status !== "Shipped")) return current;

        const id = getNextShipmentId(current.warehouseShipments);
        const dispatchSchedule = resolveDispatchSchedule();
        const shipment = normalizeWarehouseShipment({
          id,
          sourceType: "PurchaseReturn",
          sourceId: proId,
          partyName: pro.vendorName,
          shipmentDate: toISODate(),
          locationCode: pro.locationCode,
          status: "Open",
          dispatchSchedule,
          lines: pro.lines.map((line) => ({
            sku: line.sku,
            description: line.description,
            qty: line.qty,
            fromBin: "BO-AREA",
          })),
        });

        return {
          ...current,
          warehouseShipments: [shipment, ...current.warehouseShipments],
          activityLog: addActivity(current.activityLog, `Vendor-return shipment ${id} created from ${proId}`),
        };
      });
    },
  }), [customerSummary, demandBySku, inventorySummary, salesOrderSummary, state]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusiness must be used inside BusinessProvider");
  return context;
}
