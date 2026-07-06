"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { API_URL, getFinanceProducts } from "../../api";

type FinanceProduct = {
  id: string;
  sku?: string;
  productName: string;
  productType: string;
  subType?: string;
  provider?: string;
  description?: string;
  minInvestmentKes: string;
  expectedReturnPct: string;
  riskLevel?: string;
  liquidity?: string;
  tenor?: string;
  regulatedBy?: string;
  bestFor?: string;
  targetAgeMin?: string;
  targetAgeMax?: string;
  created_at?: string;
  updated_at?: string;
};

const formatKes = (value: string) =>
  `KES ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatReturnPct = (value: string) => `${(Number(value) * 100).toFixed(1)}% p.a.`;

export default function FinancePage() {
  const [financeProducts, setFinanceProducts] = useState<FinanceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>("All");

  useEffect(() => {
    const extractList = (payload: unknown): FinanceProduct[] => {
      if (Array.isArray(payload)) {
        return payload as FinanceProduct[];
      }

      if (payload && typeof payload === "object") {
        const first = (payload as { data?: unknown }).data;
        if (Array.isArray(first)) {
          return first as FinanceProduct[];
        }

        if (first && typeof first === "object") {
          const second = (first as { data?: unknown }).data;
          if (Array.isArray(second)) {
            return second as FinanceProduct[];
          }
        }
      }

      return [];
    };

    const loadFinanceProducts = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await getFinanceProducts();
        const list = extractList(response);
        setFinanceProducts(list);
      } catch {
        toast.error("Unable to load finance products right now.");
        setFinanceProducts([]);
        setLoadError(`Failed to fetch from ${API_URL}/finance-products`);
      } finally {
        setLoading(false);
      }
    };

    loadFinanceProducts();
  }, []);

  const productTypes = useMemo(() => {
    const unique = Array.from(new Set(financeProducts.map((item) => item.productType)));
    return ["All", ...unique];
  }, [financeProducts]);

  const visibleProducts = useMemo(() => {
    if (activeType === "All") {
      return financeProducts;
    }

    return financeProducts.filter((item) => item.productType === activeType);
  }, [activeType, financeProducts]);

  return (
    <section className="space-y-7 pb-8">
      <div className="rounded-3xl border border-emerald-200 bg-[linear-gradient(120deg,#ecfeff_0%,#f0fdf4_45%,#fff7ed_100%)] p-6 md:p-8">
        <p className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold tracking-wide text-emerald-700">
          FINANCE PRODUCTS
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Finance
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700 md:text-base">
          Explore fixed deposits, treasury bills, bonds, and money market funds with
          different risk levels, tenors, and liquidity profiles.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {productTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeType === type
                ? "bg-emerald-700 text-white"
                : "border border-emerald-200 bg-white text-emerald-900 hover:border-emerald-500"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleProducts.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {item.productType}
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {item.riskLevel || "Unknown"} risk
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {item.regulatedBy || "N/A"}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-bold text-slate-900">{item.productName}</h2>
            <p className="text-sm font-medium text-slate-600">{item.provider || "Unknown provider"}</p>

            <p className="mt-3 text-sm leading-6 text-slate-700">{item.description || "No description available."}</p>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Expected Return</dt>
                <dd className="font-semibold text-slate-900">{formatReturnPct(item.expectedReturnPct)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Minimum Investment</dt>
                <dd className="font-semibold text-slate-900">{formatKes(item.minInvestmentKes)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Tenor</dt>
                <dd className="font-semibold text-slate-900">{item.tenor || "N/A"}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Liquidity</dt>
                <dd className="font-semibold text-slate-900">{item.liquidity || "N/A"}</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-slate-500">
              Best for: <span className="font-medium text-slate-700">{item.bestFor || "General savings"}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Age range: {item.targetAgeMin || "-"} - {item.targetAgeMax || "-"}
            </p>
          </article>
        ))}
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading finance products...
        </p>
      ) : null}

      {!loading && loadError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          {loadError}
        </p>
      ) : null}

      {!loading && visibleProducts.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          No finance products available.
        </p>
      ) : null}
    </section>
  );
}
