"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useShop } from "../../ShopProvider";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderTrackingId = searchParams.get("OrderTrackingId");
  const orderMerchantReference = searchParams.get("OrderMerchantReference");
  const { clearCart } = useShop();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared) {
      clearCart();
      setCleared(true);
    }
  }, [clearCart, cleared]);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <svg
          className="h-8 w-8 text-emerald-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
        Payment Confirmed!
      </h1>
      <p className="mt-2 text-slate-600">
        Thank you for your order. We are processing it and will update you shortly.
      </p>

      {(orderTrackingId || orderMerchantReference) && (
        <div className="mt-8 rounded-xl bg-slate-50 p-6 text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Order Details
          </h2>
          <div className="mt-4 space-y-3">
            {orderTrackingId && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Tracking ID</span>
                <span className="text-sm font-medium text-slate-900">
                  {orderTrackingId}
                </span>
              </div>
            )}
            {orderMerchantReference && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Reference</span>
                <span className="text-sm font-medium text-slate-900">
                  {orderMerchantReference}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/shop/products"
          className="inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <section className="py-12">
      <Suspense fallback={
        <div className="text-center text-slate-600">Loading...</div>
      }>
        <SuccessContent />
      </Suspense>
    </section>
  );
}
