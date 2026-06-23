"use client";

import { useMemo, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { RequireAuth } from "@/components/RequireAuth";
import {
  baseCalendarOptions,
  copySellToAddressOptions,
  countryRegionCodeOptions,
  customerBlockedOptions,
  customerDiscGroupOptions,
  customerPostingGroupOptions,
  customerPriceGroupOptions,
  customerTransportMethodOptions,
  formatCurrency,
  formatNumber,
  getCustomerMoneyOwedCurrent,
  getCustomerUsageOfCreditLimit,
  locationCodes,
  paymentTermsOptions,
  reserveOptions,
  shipmentMethodOptions,
  shippingAdviceOptions,
  shipToOptions,
  transactionTypeOptions,
  vatBusinessPostingGroups,
  yesNoOptions,
  type Customer,
} from "@/lib/business";

const selectClass =
  "mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none transition focus:border-brand-red focus:ring-4 focus:ring-red-50";

const toolbarSelectClass =
  "h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-brand-red focus:ring-4 focus:ring-red-50";

const sectionCardClass =
  "rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(24,24,27,0.05)] sm:p-5";

const sectionTitleClass = "text-base font-semibold tracking-tight text-zinc-950";
const sectionDescriptionClass = "mt-1 text-sm leading-5 text-brand-gray";

type CustomerDraft = Customer;

function getDefaultCustomerDraft(): CustomerDraft {
  return {
    id: "",
    name: "",
    balanceLcy: 0,
    balanceLcyAsVendor: 0,
    overdueBalanceLcy: 0,
    creditLimitLcy: 0,
    blocked: customerBlockedOptions[0],
    totalSalesFiscalYear: 0,
    costsLcy: 0,
    address: "",
    address2: "",
    countryRegionCode: countryRegionCodeOptions[0],
    city: "",
    postCode: "",
    phoneNo: "",
    mobilePhoneNo: "",
    email: "",
    homePage: "",
    contact: "",
    contactName: "",
    vatRegistrationNo: "",
    eoriNumber: "",
    useGlnInElectronicDocuments: false,
    copySellToAddrToQteFrom: copySellToAddressOptions[0],
    genBusPostingGroup: vatBusinessPostingGroups[0],
    customerPostingGroup: customerPostingGroupOptions[0],
    customerPriceGroup: customerPriceGroupOptions[0],
    customerDiscGroup: customerDiscGroupOptions[0],
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
    overduePayments: 0,
    paymentsThisYearAsOf: 0,
    postedInvoicesCount: 0,
    postedCreditMemosCount: 0,
    ongoingInvoicesCount: 0,
    ongoingCreditMemosCount: 0,
    totalSales: 0,
    invoiceDiscounts: 0,
  };
}

function hasCustomerDraftChanges(customer: Customer | null, draft: CustomerDraft) {
  if (!customer) return false;
  return JSON.stringify(customer) !== JSON.stringify(draft);
}

export default function CustomersPage() {
  const { createCustomer, customerSummary, customers, updateCustomer } = useBusiness();

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [blockedFilter, setBlockedFilter] = useState<"All" | Customer["blocked"]>("All");
  const [countryFilter, setCountryFilter] = useState<"All" | (typeof countryRegionCodeOptions)[number]>("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<CustomerDraft>(getDefaultCustomerDraft);

  const editingCustomer = editingCustomerId ? customers.find((customer) => customer.id === editingCustomerId) ?? null : null;
  const isEditMode = Boolean(editingCustomer);
  const hasUnsavedChanges = hasCustomerDraftChanges(editingCustomer, draft);
  const customerIdExists = !isEditMode && draft.id.trim().length > 0 && customers.some((customer) => customer.id === draft.id.trim().toUpperCase());
  const modalPrimaryActionLabel = editingCustomer ? "Save Changes" : "Create Customer";
  const modalActionDescription = editingCustomer
    ? "Review the loaded values and save any changes when the customer card details are ready."
    : "Complete the main customer identity and account setup, then create the record to place it in the list.";
  const filteredCustomers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesQuery = normalizedQuery.length === 0 || [
        customer.id,
        customer.name,
        customer.contactName,
        customer.email,
        customer.city,
        customer.phoneNo,
        customer.mobilePhoneNo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

      const matchesBlocked = blockedFilter === "All" || customer.blocked === blockedFilter;
      const matchesCountry = countryFilter === "All" || customer.countryRegionCode === countryFilter;

      return matchesQuery && matchesBlocked && matchesCountry;
    });
  }, [blockedFilter, countryFilter, customers, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, itemsPerPage, safeCurrentPage]);
  const pageStartItem = filteredCustomers.length === 0 ? 0 : ((safeCurrentPage - 1) * itemsPerPage) + 1;
  const pageEndItem = filteredCustomers.length === 0 ? 0 : Math.min(safeCurrentPage * itemsPerPage, filteredCustomers.length);
  const draftMoneyOwedCurrent = getCustomerMoneyOwedCurrent(draft);
  const draftUsageOfCreditLimit = getCustomerUsageOfCreditLimit(draft);

  function updateDraftField<Key extends keyof CustomerDraft>(field: Key, value: CustomerDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetDraft() {
    setDraft(getDefaultCustomerDraft());
    setEditingCustomerId(null);
  }

  function openCreateModal() {
    resetDraft();
    setIsCustomerModalOpen(true);
  }

  function openCustomerModal(customer: Customer) {
    setEditingCustomerId(customer.id);
    setDraft({ ...customer });
    setIsCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setIsCustomerModalOpen(false);
    resetDraft();
  }

  function submitCustomer() {
    const nextDraft = {
      ...draft,
      id: draft.id.trim().toUpperCase(),
      name: draft.name.trim(),
      address: draft.address.trim(),
      address2: draft.address2.trim(),
      city: draft.city.trim(),
      postCode: draft.postCode.trim(),
      phoneNo: draft.phoneNo.trim(),
      mobilePhoneNo: draft.mobilePhoneNo.trim(),
      email: draft.email.trim(),
      homePage: draft.homePage.trim(),
      contact: draft.contact.trim(),
      contactName: draft.contactName.trim(),
      vatRegistrationNo: draft.vatRegistrationNo.trim(),
      eoriNumber: draft.eoriNumber.trim(),
    };

    if (!nextDraft.name || customerIdExists) return;

    if (isEditMode) {
      updateCustomer(nextDraft);
    } else {
      createCustomer(nextDraft);
    }

    closeCustomerModal();
  }

  return (
    <RequireAuth permission="customers:view">
      <>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Sales Master Data</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Customers</h2>
            <p className="mt-2 text-brand-gray">Maintain customer cards with commercial, invoicing, payment, shipping, and statistics details in one module.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-brand-gray">Total Customers</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(customerSummary.totalCustomers)}</p>
            </Card>
            <Card>
              <p className="text-sm text-brand-gray">Blocked Customers</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(customerSummary.blockedCustomers)}</p>
            </Card>
            <Card>
              <p className="text-sm text-brand-gray">Total Balance (LCY)</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatCurrency(customerSummary.totalBalanceLcy)}</p>
            </Card>
            <Card>
              <p className="text-sm text-brand-gray">Overdue Accounts</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950">{formatNumber(customerSummary.overdueCustomers)}</p>
            </Card>
          </div>

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-950">Customer List</h3>
                <p className="mt-1 text-sm text-brand-gray">Click the customer number to open the full customer card for viewing and editing.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-xl bg-zinc-50 px-4 py-2 text-sm text-brand-gray">
                  {formatNumber(customers.length)} customer records
                </div>
                <Button onClick={openCreateModal} type="button">
                  Create Customer
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
                  placeholder="Search customer no., name, contact, email, city..."
                  value={searchQuery}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-950">Blocked</label>
                <select
                  className={toolbarSelectClass}
                  onChange={(event) => {
                    setBlockedFilter(event.target.value as "All" | Customer["blocked"]);
                    setCurrentPage(1);
                  }}
                  value={blockedFilter}
                >
                  <option value="All">All Customers</option>
                  <option value="">Not Blocked</option>
                  {customerBlockedOptions.filter((option) => option !== "").map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-950">Country</label>
                <select
                  className={toolbarSelectClass}
                  onChange={(event) => {
                    setCountryFilter(event.target.value as "All" | (typeof countryRegionCodeOptions)[number]);
                    setCurrentPage(1);
                  }}
                  value={countryFilter}
                >
                  <option value="All">All Countries</option>
                  {countryRegionCodeOptions.map((option) => (
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
                Showing {formatNumber(pageStartItem)} to {formatNumber(pageEndItem)} of {formatNumber(filteredCustomers.length)} filtered customers
              </p>
              <p>
                Total items: <span className="font-semibold text-zinc-950">{formatNumber(customers.length)}</span> / Page{" "}
                <span className="font-semibold text-zinc-950">{formatNumber(safeCurrentPage)}</span> of{" "}
                <span className="font-semibold text-zinc-950">{formatNumber(totalPages)}</span>
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.14em] text-brand-gray">
                  <tr>
                    <th className="px-4 py-3">No.</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Contact Name</th>
                    <th className="px-4 py-3">Phone No.</th>
                    <th className="px-4 py-3">Payment Terms</th>
                    <th className="px-4 py-3 text-right">Credit Limit (LCY)</th>
                    <th className="px-4 py-3 text-right">Balance (LCY)</th>
                    <th className="px-4 py-3 text-right">Overdue Balance (LCY)</th>
                    <th className="px-4 py-3">Blocked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="bg-white">
                      <td className="px-4 py-4 font-semibold text-zinc-950">
                        <button
                          className="rounded-md text-left text-brand-red underline-offset-4 transition hover:underline focus:outline-none focus:ring-2 focus:ring-red-100"
                          onClick={() => openCustomerModal(customer)}
                          type="button"
                        >
                          {customer.id}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-zinc-950">{customer.name}</p>
                        <p className="mt-1 text-xs text-brand-gray">
                          {customer.email || "-"} / {customer.countryRegionCode}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-brand-gray">{customer.city || "-"}</td>
                      <td className="px-4 py-4 text-brand-gray">{customer.contactName || "-"}</td>
                      <td className="px-4 py-4 text-brand-gray">{customer.phoneNo || customer.mobilePhoneNo || "-"}</td>
                      <td className="px-4 py-4 text-brand-gray">{customer.paymentTermsCode}</td>
                      <td className="px-4 py-4 text-right text-zinc-950">{formatCurrency(customer.creditLimitLcy)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-zinc-950">{formatCurrency(customer.balanceLcy)}</td>
                      <td className="px-4 py-4 text-right text-brand-gray">{formatCurrency(customer.overdueBalanceLcy)}</td>
                      <td className="px-4 py-4 text-brand-gray">{customer.blocked || "No"}</td>
                    </tr>
                  ))}
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-brand-gray" colSpan={10}>
                        No customers matched your current search and filters.
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
                  disabled={safeCurrentPage === totalPages || filteredCustomers.length === 0}
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
              ? "Full customer card details are loaded here so the team can review and update commercial, invoicing, payment, shipping, and statistics information."
              : "This create form follows your Customer Card reference: General, Address & Contact, Invoicing, Payments, Shipping, Intrastat, and Statistics."
          }
          eyebrow="Customer Workspace"
          isOpen={isCustomerModalOpen}
          onClose={closeCustomerModal}
          title={editingCustomer ? `Customer ${editingCustomer.id}` : "New Customer Card"}
        >
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[24px] border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(227,187,75,0.20),_transparent_36%),linear-gradient(135deg,#fffdf8,#f8f3ea)] p-4 shadow-[0_10px_24px_rgba(24,24,27,0.05)] sm:p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-inset ring-white/80">
                      {draft.blocked || "Not Blocked"}
                    </span>
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-inset ring-white/80">
                      {draft.paymentTermsCode}
                    </span>
                    {editingCustomer ? (
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
                    {editingCustomer ? `Inspect and update ${draft.id}` : "Build the customer card with full account details"}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-brand-gray">
                    {modalActionDescription}
                  </p>
                  {customerIdExists ? (
                    <p className="mt-3 text-sm font-medium text-amber-700">This customer number already exists. Use a unique No. before creating the record.</p>
                  ) : null}
                </div>
                <div className="w-full max-w-lg space-y-3">
                  <div className="rounded-[20px] border border-white/80 bg-white/88 p-3.5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button className="w-full rounded-2xl" disabled={!draft.name.trim() || customerIdExists} onClick={submitCustomer} type="button">
                        {modalPrimaryActionLabel}
                      </Button>
                      <Button className="w-full rounded-2xl bg-zinc-900 hover:bg-zinc-700 focus:ring-zinc-200" onClick={closeCustomerModal} type="button">
                        {editingCustomer ? "Close" : "Cancel"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Balance</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{formatCurrency(draft.balanceLcy)}</p>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Overdue</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{formatCurrency(draft.overdueBalanceLcy)}</p>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gray">Credit Usage</p>
                      <p className="mt-1.5 text-xl font-semibold text-zinc-950">{draftUsageOfCreditLimit}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_300px]">
              <div className="space-y-5">
                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>General</h4>
                  <p className={sectionDescriptionClass}>Core customer identity, balance, credit, and top-level commercial account fields.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">No.</label>
                      <Input
                        className="mt-2 rounded-2xl"
                        disabled={isEditMode}
                        onChange={(event) => updateDraftField("id", event.target.value.toUpperCase())}
                        placeholder="CUST-1005"
                        value={draft.id}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Overdue Balance (LCY)</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("overdueBalanceLcy", Number(event.target.value) || 0)} type="number" value={draft.overdueBalanceLcy} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Name</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("name", event.target.value)} value={draft.name} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Credit Limit (LCY)</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("creditLimitLcy", Number(event.target.value) || 0)} type="number" value={draft.creditLimitLcy} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Balance (LCY)</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("balanceLcy", Number(event.target.value) || 0)} type="number" value={draft.balanceLcy} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Blocked</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("blocked", event.target.value)} value={draft.blocked}>
                        {customerBlockedOptions.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Not Blocked"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Balance (LCY) as Vendor</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("balanceLcyAsVendor", Number(event.target.value) || 0)} type="number" value={draft.balanceLcyAsVendor} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Total Sales - Fiscal Year</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("totalSalesFiscalYear", Number(event.target.value) || 0)} type="number" value={draft.totalSalesFiscalYear} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-950">Costs (LCY)</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("costsLcy", Number(event.target.value) || 0)} type="number" value={draft.costsLcy} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Address & Contact</h4>
                  <p className={sectionDescriptionClass}>Postal, phone, email, and primary account contact information for the customer card.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Address</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("address", event.target.value)} value={draft.address} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Phone No.</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("phoneNo", event.target.value)} value={draft.phoneNo} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Address 2</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("address2", event.target.value)} value={draft.address2} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Mobile Phone No.</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("mobilePhoneNo", event.target.value)} value={draft.mobilePhoneNo} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Country/Region Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("countryRegionCode", event.target.value)} value={draft.countryRegionCode}>
                        {countryRegionCodeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Email</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("email", event.target.value)} type="email" value={draft.email} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">City</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("city", event.target.value)} value={draft.city} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Home Page</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("homePage", event.target.value)} value={draft.homePage} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Post Code</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("postCode", event.target.value)} value={draft.postCode} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Contact</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("contact", event.target.value)} value={draft.contact} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-950">Contact Name</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("contactName", event.target.value)} value={draft.contactName} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Invoicing</h4>
                  <p className={sectionDescriptionClass}>Tax, posting, pricing, and electronic document fields used when billing and settling customer transactions.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">VAT Registration No.</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("vatRegistrationNo", event.target.value)} value={draft.vatRegistrationNo} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Gen. Bus. Posting Group</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("genBusPostingGroup", event.target.value)} value={draft.genBusPostingGroup}>
                        {vatBusinessPostingGroups.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">EORI Number</label>
                      <Input className="mt-2 rounded-2xl" onChange={(event) => updateDraftField("eoriNumber", event.target.value)} value={draft.eoriNumber} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Customer Posting Group</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("customerPostingGroup", event.target.value)} value={draft.customerPostingGroup}>
                        {customerPostingGroupOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.useGlnInElectronicDocuments} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="useGln" onChange={(event) => updateDraftField("useGlnInElectronicDocuments", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="useGln">
                          Use GLN in Electronic Documents
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Enable this when the customer requires GLN-based electronic document handling.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Customer Price Group</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("customerPriceGroup", event.target.value)} value={draft.customerPriceGroup}>
                        {customerPriceGroupOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Copy Sell-to Addr. to Qte. From</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("copySellToAddrToQteFrom", event.target.value)} value={draft.copySellToAddrToQteFrom}>
                        {copySellToAddressOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Customer Disc. Group</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("customerDiscGroup", event.target.value)} value={draft.customerDiscGroup}>
                        {customerDiscGroupOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-950">E-Document Service Participant</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("eDocumentServiceParticipant", Number(event.target.value) || 0)} type="number" value={draft.eDocumentServiceParticipant} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Payments</h4>
                  <p className={sectionDescriptionClass}>Payment setup and receivables values used for account management and credit control.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Payment Terms Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("paymentTermsCode", event.target.value)} value={draft.paymentTermsCode}>
                        {paymentTermsOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Payments This Year as of</label>
                      <Input className="mt-2 rounded-2xl" min="0" onChange={(event) => updateDraftField("paymentsThisYearAsOf", Number(event.target.value) || 0)} type="number" value={draft.paymentsThisYearAsOf} />
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Shipping</h4>
                  <p className={sectionDescriptionClass}>Delivery handling, location, shipment method, and reservation setup for the customer account.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Ship-to Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("shipToCode", event.target.value)} value={draft.shipToCode}>
                        {shipToOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Shipping Advice</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("shippingAdvice", event.target.value)} value={draft.shippingAdvice}>
                        {shippingAdviceOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Location Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("locationCode", event.target.value)} value={draft.locationCode}>
                        {locationCodes.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Shipment Method Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("shipmentMethodCode", event.target.value)} value={draft.shipmentMethodCode}>
                        {shipmentMethodOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <input checked={draft.combineSalesShipments} className="h-4 w-4 rounded border-zinc-300 text-brand-red focus:ring-red-200" id="combineSalesShipments" onChange={(event) => updateDraftField("combineSalesShipments", event.target.checked)} type="checkbox" />
                        <label className="text-sm font-medium text-zinc-950" htmlFor="combineSalesShipments">
                          Combine Sales Shipments
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-gray">Enable this when multiple shipments should be grouped for the account where possible.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Base Calendar Code</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("baseCalendarCode", event.target.value)} value={draft.baseCalendarCode}>
                        {baseCalendarOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Reserve</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("reserve", event.target.value)} value={draft.reserve}>
                        {reserveOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Customized Calendar</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("customizedCalendar", event.target.value)} value={draft.customizedCalendar}>
                        {yesNoOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Intrastat</h4>
                  <p className={sectionDescriptionClass}>Default transaction and transport references used when the customer requires trade classification details.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Default Trans. Type</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("defaultTransactionType", event.target.value)} value={draft.defaultTransactionType}>
                        {transactionTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-950">Default Transport Method</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("defaultTransportMethod", event.target.value)} value={draft.defaultTransportMethod}>
                        {customerTransportMethodOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-950">Default Trans. Type - Return</label>
                      <select className={selectClass} onChange={(event) => updateDraftField("defaultTransactionTypeReturn", event.target.value)} value={draft.defaultTransactionTypeReturn}>
                        {transactionTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <h4 className={sectionTitleClass}>Statistics</h4>
                  <p className={sectionDescriptionClass}>Operational and financial statistics for the customer account. These values stay visible while editing the rest of the card.</p>
                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="space-y-3 rounded-[24px] border border-zinc-200/80 bg-zinc-50/60 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Money Owed - Current</span>
                        <span className="font-semibold text-zinc-950">{formatCurrency(draftMoneyOwedCurrent)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Money Owed - Total</span>
                        <span className="font-semibold text-zinc-950">{formatCurrency(draft.balanceLcy)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Credit Limit</span>
                        <span className="font-semibold text-zinc-950">{formatCurrency(draft.creditLimitLcy)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Usage Of Credit Limit</span>
                        <span className="font-semibold text-zinc-950">{draftUsageOfCreditLimit}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Overdue Payments</span>
                        <span className="font-semibold text-zinc-950">{formatCurrency(draft.overduePayments)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Payments This Year as of</span>
                        <span className="font-semibold text-zinc-950">{formatCurrency(draft.paymentsThisYearAsOf)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Posted Invoices</span>
                        <span className="font-semibold text-zinc-950">{formatNumber(draft.postedInvoicesCount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Posted Credit Memos</span>
                        <span className="font-semibold text-zinc-950">{formatNumber(draft.postedCreditMemosCount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Ongoing Invoices</span>
                        <span className="font-semibold text-zinc-950">{formatNumber(draft.ongoingInvoicesCount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Ongoing Credit Memos</span>
                        <span className="font-semibold text-zinc-950">{formatNumber(draft.ongoingCreditMemosCount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Total Sales</span>
                        <span className="font-semibold text-zinc-950">{formatCurrency(draft.totalSales)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-gray">Invoice Discounts</span>
                        <span className="font-semibold text-zinc-950">{formatCurrency(draft.invoiceDiscounts)}</span>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-inner">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-gray">Aged Accounts Receivable</p>
                      <p className="mt-2 text-sm text-brand-gray">Period Length: Week | 3 months overdue</p>
                      <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-brand-gray">
                        There is nothing to show in this view.
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="space-y-3.5 xl:sticky xl:top-24 xl:self-start">
                <div className="overflow-hidden rounded-[22px] border border-zinc-200/80 bg-white shadow-[0_10px_26px_rgba(24,24,27,0.06)]">
                  <div className="bg-[linear-gradient(135deg,#18181b,#32323a)] px-4 py-3 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Customer Snapshot</p>
                    <p className="mt-1.5 text-xl font-semibold">{draft.name || "New Customer"}</p>
                    <p className="mt-1 text-sm text-white/75">{draft.id || "No. pending"} / {draft.city || "City pending"} / {draft.countryRegionCode}</p>
                  </div>
                  <div className="space-y-2.5 px-4 py-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Balance (LCY)</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draft.balanceLcy)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Overdue Balance</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draft.overdueBalanceLcy)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-gray">Credit Limit</span>
                      <span className="font-semibold text-zinc-950">{formatCurrency(draft.creditLimitLcy)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3">
                      <span className="text-brand-gray">Usage</span>
                      <span className="font-semibold text-zinc-950">{draftUsageOfCreditLimit}%</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(24,24,27,0.06)]">
                  <h5 className="text-base font-semibold text-zinc-950">Account Status</h5>
                  <div className="mt-3 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Blocked</span>
                      <span className="font-semibold text-zinc-950">{draft.blocked || "No"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Payment Terms</span>
                      <span className="font-semibold text-zinc-950">{draft.paymentTermsCode}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Location Code</span>
                      <span className="font-semibold text-zinc-950">{draft.locationCode}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                      <span className="text-brand-gray">Shipment Method</span>
                      <span className="font-semibold text-zinc-950">{draft.shipmentMethodCode}</span>
                    </div>
                    {editingCustomer ? (
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3.5 py-2.5">
                        <span className="text-brand-gray">Unsaved Changes</span>
                        <span className={hasUnsavedChanges ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                          {hasUnsavedChanges ? "Save first" : "None"}
                        </span>
                      </div>
                    ) : null}
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
