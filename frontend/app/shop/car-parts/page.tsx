"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { API_URL, getCarParts } from "../../api";
import { useShop } from "../ShopProvider";

const ITEMS_PER_PAGE = 15;

type CarPart = {
  id: string;
  sku: string;
  make: string;
  model: string;
  yearFrom: string;
  yearTo: string;
  brand: string;
  batteryType: string;
  capacityAh: string;
  cca: string;
  voltage: string;
  engineCc: string;
  branchLocation: string;
  stock: string;
  warrantyMonths: string;
  priceKes: string;
  imageUrl?: string;
  created_at: string;
  updated_at: string;
  order_id: string | null;
};

const formatKes = (value: string) =>
  `KES ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const normalizeImageUrl = (url: string) => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "storage.cloud.google.com") {
      parsed.hostname = "storage.googleapis.com";
    }

    if (parsed.hostname === "storage.googleapis.com") {
      parsed.pathname = decodeURIComponent(parsed.pathname);
    }

    return parsed.toString();
  } catch {
    return url;
  }
};

const getPartImage = (part: CarPart) =>
  normalizeImageUrl(
    part.imageUrl ||
      `https://placehold.co/600x400/png?text=${encodeURIComponent(`${part.make} ${part.model}`)}`
  );

const getFakeRating = (part: CarPart) => {
  const source = `${part.id}-${part.sku}-${part.brand}`;
  const hash = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (3.8 + (hash % 13) / 10).toFixed(1);
};

export default function CarPartsPage() {
  const { addToCart } = useShop();
  const [carParts, setCarParts] = useState<CarPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeMake, setActiveMake] = useState<string>("All");
  const [activeBranch, setActiveBranch] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const extractList = (payload: unknown): CarPart[] => {
      if (Array.isArray(payload)) {
        return payload as CarPart[];
      }

      if (payload && typeof payload === "object") {
        const first = (payload as { data?: unknown }).data;
        if (Array.isArray(first)) {
          return first as CarPart[];
        }

        if (first && typeof first === "object") {
          const second = (first as { data?: unknown }).data;
          if (Array.isArray(second)) {
            return second as CarPart[];
          }
        }
      }

      return [];
    };

    const loadParts = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await getCarParts();
        setCarParts(extractList(response));
      } catch {
        setCarParts([]);
        setLoadError(`Failed to fetch from ${API_URL}/car-parts`);
        toast.error("Unable to load car parts right now.");
      } finally {
        setLoading(false);
      }
    };

    loadParts();
  }, []);

  const toShopProduct = (part: CarPart) => ({
    id: part.id,
    name: `${part.brand} ${part.make} ${part.model} ${part.batteryType}`,
    category: "Car Parts",
    unitCost: part.priceKes,
    quantity: Number(part.stock),
  });

  const makes = useMemo(() => {
    const unique = Array.from(new Set(carParts.map((item) => item.make)));
    return ["All", ...unique];
  }, [carParts]);

  const branches = useMemo(() => {
    const unique = Array.from(new Set(carParts.map((item) => item.branchLocation)));
    return ["All", ...unique];
  }, [carParts]);

  const visibleParts = useMemo(() => {
    return carParts.filter((item) => {
      const matchesMake = activeMake === "All" || item.make === activeMake;
      const matchesBranch = activeBranch === "All" || item.branchLocation === activeBranch;
      return matchesMake && matchesBranch;
    });
  }, [activeBranch, activeMake, carParts]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(visibleParts.length / ITEMS_PER_PAGE)),
    [visibleParts.length]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeMake, activeBranch, carParts]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedParts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visibleParts.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, visibleParts]);

  return (
    <section className="space-y-7 pb-8">
      <div className="rounded-3xl border border-blue-200 bg-[linear-gradient(120deg,#e0f2fe_0%,#eef2ff_45%,#fffbeb_100%)] p-6 md:p-8">
        <p className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold tracking-wide text-blue-700">
          AUTO PARTS CATALOG
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Car Parts
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700 md:text-base">
          Explore battery options by make, branch, and vehicle fitment powered by
          live catalog data.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Filter by make
          <select
            value={activeMake}
            onChange={(event) => setActiveMake(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {makes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Filter by branch
          <select
            value={activeBranch}
            onChange={(event) => setActiveBranch(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading car parts...
        </p>
      ) : null}

      {!loading && loadError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {paginatedParts.map((part) => {
          const availableStock = Number(part.stock);
          const isOutOfStock = availableStock <= 0;

          return (
          <article key={part.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="relative mb-4 h-44 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              <Image
                src={getPartImage(part)}
                alt={`${part.brand} ${part.make} ${part.model}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {part.make} {part.model}
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {part.batteryType}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {part.branchLocation}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-bold text-slate-900">{part.brand}</h2>
            <p className="text-sm text-slate-600">
              {part.model} ({part.yearFrom} - {part.yearTo})
            </p>

            <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
              <p className="flex items-center gap-1">
                <span className="text-amber-500">★</span>
                <span className="font-semibold text-slate-900">{getFakeRating(part)}</span>
              </p>
              <p>
                In stock: <span className="font-semibold text-slate-900">{availableStock}</span>
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Price</dt>
                <dd className="font-semibold text-slate-900">{formatKes(part.priceKes)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Capacity / CCA</dt>
                <dd className="font-semibold text-slate-900">
                  {part.capacityAh}Ah / {part.cca}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Warranty</dt>
                <dd className="font-semibold text-slate-900">{part.warrantyMonths} months</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Engine Capacity</dt>
                <dd className="font-semibold text-slate-900">{part.engineCc}cc</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-slate-500">
              SKU: <span className="font-medium text-slate-700">{part.sku}</span>
            </p>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                addToCart(toShopProduct(part));
                toast.success(`${part.brand} ${part.model} added to cart`);
              }}
              className="mt-4 w-full rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
          </article>
          );
        })}
      </div>

      {!loading && visibleParts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, visibleParts.length)} of {visibleParts.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="font-semibold">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {!loading && visibleParts.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          No parts found for this filter combination.
        </p>
      ) : null}
    </section>
  );
}
