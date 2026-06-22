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

type BusinessState = ReturnType<typeof createInitialBusinessState>;

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
  }), [customerSummary, demandBySku, inventorySummary, salesOrderSummary, state]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusiness must be used inside BusinessProvider");
  return context;
}
