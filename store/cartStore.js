// src/store/cartStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveCart, loadCart } from "@/lib/api/cart";
import { calculateCartTax } from "@/utils/tax";

function cartItemKey(productId, variantId) {
  return variantId ? `${productId}__${variantId}` : productId;
}

export const useCartStore = create()(
  persist(
    (set, get) => ({
      items: [],

      // ── Coupon state persisted alongside cart ──────────────────────────
      appliedCoupon: null, // full coupon object
      couponDiscount: 0, // rupee amount saved

      // ── Coupon actions ─────────────────────────────────────────────────
      setCoupon: (coupon, discount) => {
        set({ appliedCoupon: coupon, couponDiscount: discount });
      },

      removeCoupon: () => {
        set({ appliedCoupon: null, couponDiscount: 0 });
      },

      // ── Item actions ───────────────────────────────────────────────────
      addItem: (newItem) => {
        const items = get().items;
        const key = cartItemKey(newItem.productId, newItem.variantId);
        const existingIndex = items.findIndex(
          (i) => cartItemKey(i.productId, i.variantId) === key,
        );

        // How many to add: defaults to 1 (product-card button); the product page passes the chosen quantity
        const qty = Math.max(1, Math.floor(Number(newItem.quantity) || 1));

        if (existingIndex !== -1) {
          const existing = items[existingIndex];
          const newQty = Math.min(existing.quantity + qty, existing.stock);
          set({
            items: items.map((item, idx) =>
              idx === existingIndex ? { ...item, quantity: newQty } : item,
            ),
          });
          return newQty; // quantity now in the cart (never above stock)
        }
        const firstQty = Math.min(qty, newItem.stock ?? qty);
        set({ items: [...items, { ...newItem, quantity: firstQty }] });
        return firstQty;
      },

      removeItem: (productId, variantId = null) => {
        const key = cartItemKey(productId, variantId);
        set({
          items: get().items.filter(
            (i) => cartItemKey(i.productId, i.variantId) !== key,
          ),
        });
      },

      updateQuantity: (productId, quantity, variantId = null) => {
        const key = cartItemKey(productId, variantId);
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            cartItemKey(i.productId, i.variantId) === key
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i,
          ),
        });
      },

      // Clear cart AND coupon after order placed
      clearCart: () =>
        set({
          items: [],
          appliedCoupon: null,
          couponDiscount: 0,
        }),

      // ── Totals ─────────────────────────────────────────────────────────
      getSubtotal: () => {
        const items = get().items;
        if (!items?.length) return 0;
        return items.reduce(
          (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
          0,
        );
      },

      getTaxSummary: () => calculateCartTax(get().items),

      getTotal: () => {
        const items = get().items;
        if (!items?.length) return 0;
        const { totalAmount } = calculateCartTax(items);
        if (isNaN(totalAmount)) {
          return items.reduce(
            (sum, i) =>
              sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
            0,
          );
        }
        return totalAmount;
      },

      getItemCount: () => {
        const items = get().items;
        if (!items?.length) return 0;
        return items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      },

      // Cart is saved to MySQL per logged-in user (identity comes from the session cookie)
      syncToServer: async (userId) => {
        if (!userId) return;
        try {
          await saveCart({
            items: get().items,
            appliedCoupon: get().appliedCoupon,
            couponDiscount: get().couponDiscount,
          });
        } catch (err) {
          console.error("Cart sync failed:", err);
        }
      },

      loadFromServer: async (userId) => {
        if (!userId) return;
        try {
          const data = await loadCart();
          if (data?.items?.length && get().items.length === 0) {
            set({
              items: data.items || [],
              appliedCoupon: data.appliedCoupon || null,
              couponDiscount: data.couponDiscount || 0,
            });
          }
        } catch (err) {
          console.error("Cart load failed:", err);
        }
      },
    }),
    {
      name: "shopnext-cart",
      // Only persist these keys to localStorage
      partialize: (state) => ({
        items: state.items,
        appliedCoupon: state.appliedCoupon,
        couponDiscount: state.couponDiscount,
      }),
    },
  ),
);
