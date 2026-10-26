// src/components/cart/CartDrawer.js
"use client";
import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/utils/formatters";
import { getOptimizedUrl } from "@/lib/cloudinary";
import { useShipping } from "@/hooks/useShipping";

export function CartDrawer({ open, onClose }) {
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const { getShipping, config: shippingConfig } = useShipping();
  const items = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.getTotal());
  const { shippingCharge, shippingFree } = getShipping(
    cartTotal,
    "razorpay",
    items,
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Your cart {items.length > 0 && `(${items.length})`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-900 font-medium mb-1">
                Your cart is empty
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Add items to get started
              </p>
              <Link
                href="/products"
                onClick={onClose}
                className="bg-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <div className="relative w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                    {item.image && (
                      <Image
                        src={getOptimizedUrl(item.image, {
                          width: 128,
                          height: 128,
                        })}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {item.name}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {formatPrice(item.price)}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity - 1,
                              item.variantId,
                            )
                          }
                          className="p-1.5 hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-3 h-3 text-gray-600" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity + 1,
                              item.variantId,
                            )
                          }
                          disabled={item.quantity >= item.stock}
                          className="p-1.5 hover:bg-gray-50 transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>

                      <button
                        onClick={() =>
                          removeItem(item.productId, item.variantId)
                        }
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="font-bold text-gray-900">
                {formatPrice(cartTotal)}
              </span>
            </div>

            {shippingCharge > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Shipping</span>
                <span className="text-sm text-gray-900">
                  {formatPrice(shippingCharge)}
                </span>
              </div>
            )}

            {!shippingFree && shippingConfig.freeAbove > 0 && (
              <p className="text-xs text-indigo-600 mb-3">
                {formatPrice(shippingConfig.freeAbove - cartTotal)} away from
                free shipping
              </p>
            )}
            <p className="text-xs text-gray-400 mb-4">
              Shipping and taxes calculated at checkout
            </p>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Proceed to checkout
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3"
            >
              View full cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
