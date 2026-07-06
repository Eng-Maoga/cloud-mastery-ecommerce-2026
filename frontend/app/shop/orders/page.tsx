"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { API_URL, getCustomers, getOrders } from "../../api";
import { CustomersType } from "../../types/CustomersType";
import { OrderType } from "../../types/OrderType";
import { formatRelativeDate } from "../../util";
import { useShop } from "../ShopProvider";

export default function ShopOrdersPage() {
  const { selectedCustomerId, setSelectedCustomerId } = useShop();
  const [customers, setCustomers] = useState<CustomersType[]>([]);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const extractList = <T,>(payload: unknown): T[] => {
      if (Array.isArray(payload)) {
        return payload as T[];
      }

      if (payload && typeof payload === "object") {
        const first = (payload as { data?: unknown }).data;
        if (Array.isArray(first)) {
          return first as T[];
        }

        if (first && typeof first === "object") {
          const second = (first as { data?: unknown }).data;
          if (Array.isArray(second)) {
            return second as T[];
          }
        }
      }

      return [];
    };

    const loadData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [customersResponse, ordersResponse] = await Promise.all([
          getCustomers(),
          getOrders(),
        ]);

        const customerList = extractList<CustomersType>(customersResponse);
        const orderList = extractList<OrderType>(ordersResponse);

        setCustomers(customerList);
        setOrders(orderList);

        if (!selectedCustomerId && customerList.length > 0) {
          setSelectedCustomerId(customerList[0].id);
        }
      } catch {
        const errorText = `Unable to fetch customers and orders from ${API_URL}/customers and ${API_URL}/orders`;
        toast.error("Unable to load customer orders.");
        setLoadError(errorText);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCustomerId, setSelectedCustomerId]);

  const selectedCustomerOrders = useMemo(
    () => orders.filter((order) => order.customerId === selectedCustomerId),
    [orders, selectedCustomerId]
  );

  const orderedItems = useMemo(
    () => selectedCustomerOrders.flatMap((order) => order.items.map((item) => ({ ...item, order }))),
    [selectedCustomerOrders]
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ordered Items</h1>
        <p className="mt-2 text-sm text-slate-600">
          See what each customer has ordered.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="customer" className="text-sm font-semibold text-slate-700">
          Select customer
        </label>
        <select
          id="customer"
          value={selectedCustomerId}
          onChange={(event) => setSelectedCustomerId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-600 focus:outline-none"
        >
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.firstName} {customer.lastName}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading ordered items...
        </p>
      ) : loadError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          {loadError}
        </p>
      ) : orderedItems.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          No ordered items found for this customer.
        </p>
      ) : (
        <div className="space-y-3">
          {orderedItems.map((entry) => (
            <article
              key={`${entry.order.id}-${entry.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">{entry.productName}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Order #{entry.order.id}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                <p>
                  Qty: <span className="font-semibold text-slate-900">{entry.quantity}</span>
                </p>
                <p>
                  Unit Price: <span className="font-semibold text-slate-900">KES {Number(entry.unitCost).toLocaleString()}</span>
                </p>
                <p>
                  Line Total: <span className="font-semibold text-slate-900">KES {Number(entry.totalCost).toLocaleString()}</span>
                </p>
                <p>
                  Ordered: <span className="font-semibold text-slate-900">{formatRelativeDate(entry.order.createdAt)}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
