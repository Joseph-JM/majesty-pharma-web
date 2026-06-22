"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import {
  addActivity,
  buildDemandBySku,
  buildInventorySummary,
  buildSalesOrderSummary,
  calculateReservedPercent,
  createInitialBusinessState,
  getInventoryAvailable,
  getInventoryHealth,
  getNextSalesOrderId,
  toISODate,
  type CreateSalesOrderInput,
  type InventoryItem,
  type SalesOrder,
} from "@/lib/business";

type BusinessState = ReturnType<typeof createInitialBusinessState>;

type BusinessContextValue = {
  salesOrders: SalesOrder[];
  inventoryItems: InventoryItem[];
  activityLog: string[];
  salesOrderSummary: ReturnType<typeof buildSalesOrderSummary>;
  inventorySummary: ReturnType<typeof buildInventorySummary>;
  demandBySku: Record<string, number>;
  createSalesOrder: (input: CreateSalesOrderInput) => void;
  reserveSalesOrder: (orderId: string) => void;
  postSalesOrder: (orderId: string) => void;
  receiveInventory: (sku: string, quantity: number) => void;
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
  return items.map((item) => ({
    ...item,
    health: getInventoryHealth(item),
  }));
}

function hydrateBusinessState(snapshot: string | null): BusinessState {
  const initialState = createInitialBusinessState();
  if (!snapshot) return initialState;

  try {
    const parsed = JSON.parse(snapshot) as Partial<BusinessState>;

    return {
      salesOrders: (parsed.salesOrders ?? initialState.salesOrders).map((order) => ({
        ...order,
        lines: order.lines.map((line) => ({ ...line })),
      })),
      inventoryItems: normalizeInventoryItems(parsed.inventoryItems ?? initialState.inventoryItems),
      activityLog: parsed.activityLog ?? initialState.activityLog,
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

  const salesOrderSummary = useMemo(() => buildSalesOrderSummary(state.salesOrders), [state.salesOrders]);
  const inventorySummary = useMemo(() => buildInventorySummary(state.inventoryItems), [state.inventoryItems]);
  const demandBySku = useMemo(() => buildDemandBySku(state.salesOrders), [state.salesOrders]);

  function updateBusinessState(updater: (current: BusinessState) => BusinessState) {
    const currentState = hydrateBusinessState(readBusinessSnapshot());
    writeBusinessState(updater(currentState));
  }

  const value = useMemo<BusinessContextValue>(() => ({
    salesOrders: state.salesOrders,
    inventoryItems: state.inventoryItems,
    activityLog: state.activityLog,
    salesOrderSummary,
    inventorySummary,
    demandBySku,
    createSalesOrder: (input) => {
      updateBusinessState((current) => {
        const nextOrder: SalesOrder = {
          id: getNextSalesOrderId(current.salesOrders),
          customer: input.customer,
          location: input.location,
          orderDate: toISODate(),
          shipmentDate: input.shipmentDate,
          paymentTerms: input.paymentTerms,
          salesperson: input.salesperson,
          status: input.lines.reduce((total, line) => total + (line.quantity * line.unitPrice), 0) >= 100000 ? "Pending Approval" : "Open",
          lines: input.lines.map((line) => {
            const item = current.inventoryItems.find((inventoryItem) => inventoryItem.sku === line.sku);
            return {
              sku: line.sku,
              description: item?.description ?? line.sku,
              quantity: line.quantity,
              reservedQty: 0,
              unitPrice: line.unitPrice,
            };
          }),
        };

        return {
          ...current,
          salesOrders: [nextOrder, ...current.salesOrders],
          activityLog: addActivity(current.activityLog, `Sales order ${nextOrder.id} created for ${nextOrder.customer}`),
        };
      });
    },
    reserveSalesOrder: (orderId) => {
      updateBusinessState((current) => {
        const inventoryItems = cloneInventoryItems(current.inventoryItems);
        let updatedOrder: SalesOrder | null = null;

        const salesOrders = current.salesOrders.map((order) => {
          if (order.id !== orderId || order.status === "Posted") return order;

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
            status: reservedPercent === 100 ? "Ready to Ship" : "Released",
          };

          return updatedOrder;
        });

        if (!updatedOrder) return current;

        const finalizedOrder = updatedOrder as SalesOrder;
        const reservedPercent = calculateReservedPercent(finalizedOrder);
        const activity = reservedPercent === 100
          ? `Sales order ${finalizedOrder.id} is fully reserved and ready to ship`
          : `Sales order ${finalizedOrder.id} reserved ${reservedPercent}% of required stock`;

        return {
          salesOrders,
          inventoryItems: normalizeInventoryItems(inventoryItems),
          activityLog: addActivity(current.activityLog, activity),
        };
      });
    },
    postSalesOrder: (orderId) => {
      updateBusinessState((current) => {
        const inventoryItems = cloneInventoryItems(current.inventoryItems);
        let postedOrder: SalesOrder | null = null;

        const salesOrders = current.salesOrders.map((order) => {
          if (order.id !== orderId || order.status === "Posted") return order;
          if (calculateReservedPercent(order) !== 100) return order;

          for (const line of order.lines) {
            const inventoryItem = inventoryItems.find((item) => item.sku === line.sku);
            if (!inventoryItem) continue;

            inventoryItem.onHand = Math.max(inventoryItem.onHand - line.quantity, 0);
            inventoryItem.allocated = Math.max(inventoryItem.allocated - line.quantity, 0);
          }

          postedOrder = {
            ...order,
            status: "Posted",
          };

          return postedOrder;
        });

        if (!postedOrder) return current;

        const finalizedOrder = postedOrder as SalesOrder;

        return {
          salesOrders,
          inventoryItems: normalizeInventoryItems(inventoryItems),
          activityLog: addActivity(current.activityLog, `Shipment posted for ${finalizedOrder.id}`),
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
  }), [demandBySku, inventorySummary, salesOrderSummary, state]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusiness must be used inside BusinessProvider");
  return context;
}
