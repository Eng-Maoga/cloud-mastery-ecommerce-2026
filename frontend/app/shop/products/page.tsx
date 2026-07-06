"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getProducts } from "../../api";
import { useShop } from "../ShopProvider";
import { ProductType } from "../../types/ProductType";

const ITEMS_PER_PAGE = 15;

const normalizeImageUrl = (url: string) => {
  try {
    const parsed = new URL(url);

    // Console-style GCS URLs often return HTML; object URLs are fetchable by Next/Image.
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

export default function ShopProductsPage() {
  const { addToCart } = useShop();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const response = await getProducts();
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];
        setProducts(list);
      } catch {
        toast.error("Unable to load products right now.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    products.forEach((product) => set.add(product.category || "Uncategorized"));
    return Array.from(set);
  }, [products]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const categoryQuery = new URLSearchParams(window.location.search).get("category");
    if (!categoryQuery || categories.length === 0) {
      return;
    }

    const slugify = (value: string) => value.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");
    const matchedCategory = categories.find((category) => slugify(category) === categoryQuery);

    if (matchedCategory && matchedCategory !== activeCategory) {
      setActiveCategory(matchedCategory);
    }
  }, [categories, activeCategory]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "All") {
      return products;
    }
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory, products]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)),
    [filteredProducts.length]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, products]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  const getProductImage = (product: ProductType) =>
    (() => {
      console.log("Product image URL:", product);
      
      const rawUrl =
        product.imageUrl ||
        product.image ||
        `https://placehold.co/600x400/png?text=${encodeURIComponent(product.name || "Product")}`;

      const normalizedUrl = normalizeImageUrl(rawUrl);

      // Normalize legacy placehold URLs to PNG so Next/Image can optimize safely.
      return normalizedUrl.includes("placehold.co/") && !normalizedUrl.includes("/png?")
        ? normalizedUrl.replace(/\/(\d+x\d+)\?/, "/$1/png?")
        : normalizedUrl;
    })();

  const getFakeRating = (product: ProductType) => {
    const source = `${product.id}-${product.name}`;
    const hash = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return (3.5 + (hash % 16) / 10).toFixed(1);
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse Products</h1>
        <p className="mt-2 text-sm text-slate-600">
          Shop by category and add items to your cart.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeCategory === category
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-900"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading products...
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedProducts.map((product) => {
            const isOutOfStock = product.quantity <= 0;
            return (
              <article
                key={product.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="relative mb-4 h-44 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  <Image
                    src={getProductImage(product)}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  {product.category}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{product.name}</h2>
                <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                  <p className="flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    <span className="font-semibold text-slate-900">{getFakeRating(product)}</span>
                  </p>
                  <p>
                    In stock: <span className="font-semibold">{product.quantity}</span>
                  </p>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  KES {Number(product.unitCost).toLocaleString()}
                </p>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    addToCart(product);
                    toast.success(`${product.name} added to cart`);
                  }}
                  className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {!loading && filteredProducts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}
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

      {!loading && filteredProducts.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          No products in this category.
        </p>
      ) : null}
    </section>
  );
}
