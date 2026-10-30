// src/app/(shop)/checkout/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MapPin,
  CreditCard,
  Check,
  ChevronLeft,
  Loader2,
  Plus,
  Banknote,
  ShieldCheck,
  Truck,
  Tag,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCartStore } from "@/store/cartStore";
import { useShipping } from "@/hooks/useShipping";
import { useCoupon } from "@/hooks/useCoupon";
import { CouponInput } from "@/components/cart/CouponInput";
import { calculateCartTax, getTaxBreakdown } from "@/utils/tax";
import { getAddresses, addAddress } from "@/lib/api/addresses";
import { placeOrder } from "@/lib/api/orders";
import {
  loadRazorpayScript,
  createRazorpayOrder,
  openRazorpayCheckout,
  verifyRazorpayPayment,
} from "@/lib/razorpay";
import { triggerEmail } from "@/lib/triggerEmail";
import { formatPrice } from "@/utils/formatters";

const STEPS = [
  { id: 1, label: "Address", icon: MapPin },
  { id: 2, label: "Payment", icon: CreditCard },
  { id: 3, label: "Review", icon: Check },
];

const EMPTY_ADDRESS = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Bihar",
  "Delhi",
  "Goa",
  "Gujarat",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

export default function CheckoutPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  // ── Tax ────────────────────────────────────────────────────────────────
  const {
    subtotalBeforeTax,
    totalTaxAmount,
    totalAmount: cartTotal,
  } = calculateCartTax(items);
  const taxBreakdown = getTaxBreakdown(items);
  const safeCartTotal = isNaN(cartTotal)
    ? items.reduce(
        (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
        0,
      )
    : cartTotal;

  // ── Coupon — auto-loaded from persisted cart store ─────────────────────
  const {
    code: couponCode,
    setCode: setCouponCode,
    coupon,
    discount,
    loading: couponLoading,
    error: couponError,
    apply: applyCoupon,
    remove: removeCoupon,
    isFreeShipping: couponFreeShipping,
  } = useCoupon();

  // ── Shipping ───────────────────────────────────────────────────────────
  const {
    config: shippingConfig,
    loading: shippingLoading,
    getShipping,
  } = useShipping();
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  const { shippingCharge, shippingFree, codCharge } = getShipping(
    safeCartTotal,
    paymentMethod,
    items,
  );
  const effectiveShippingFree = shippingFree || couponFreeShipping;
  const effectiveShippingCharge = effectiveShippingFree ? 0 : shippingCharge;
  const total = Math.max(
    0,
    safeCartTotal - discount + effectiveShippingCharge + codCharge,
  );

  // ── Step ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Address ────────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);

  // ── Order ──────────────────────────────────────────────────────────────
  const [placingOrder, setPlacingOrder] = useState(false);

    // Set the moment an order is saved. Stops the "empty cart → /cart" guard below from hijacking the redirect
  // to the order page (clearCart() empties the cart a split second before we navigate).
 const orderPlacedRef = useRef(false);


  // ── Guards ─────────────────────────────────────────────────────────────
   
   useEffect(() => {
    if (!authLoading && !user) router.push("/login?redirect=/checkout");
  }, [user, authLoading, router]);
  
  useEffect(() => {
    if (!authLoading && items.length === 0 && !orderPlacedRef.current) router.push("/cart");
  }, [items, authLoading, router]);

  // useEffect(() => {
  //   if (!authLoading && items.length === 0) router.push("/cart");
  // }, [items, authLoading, router]);

  // ── Load addresses ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingAddresses(true);
    getAddresses(user.uid).then((result) => {
      setAddresses(result);
      const def = result.find((a) => a.isDefault) || result[0];
      if (def) setSelectedAddressId(def.id);
      if (result.length === 0) setShowAddForm(true);
      setLoadingAddresses(false);
    });
  }, [user]);

  function handleAddressFormChange(e) {
    const { name, value } = e.target;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSaveNewAddress(e) {
    e.preventDefault();
    const { fullName, phone, line1, city, state, pincode } = addressForm;
    if (!fullName || !phone || !line1 || !city || !state || !pincode)
      return toast.error("Please fill all required fields");
    if (!/^\d{10}$/.test(phone))
      return toast.error("Enter a valid 10-digit phone number");
    if (!/^\d{6}$/.test(pincode))
      return toast.error("Enter a valid 6-digit pincode");

    setSavingAddress(true);
    try {
      const newAddr = await addAddress(user.uid, addressForm);
      setAddresses((prev) => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowAddForm(false);
      setAddressForm(EMPTY_ADDRESS);
      toast.success("Address saved");
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  // ── Place order ────────────────────────────────────────────────────────
  async function handlePlaceOrder() {
    if (!selectedAddress)
      return toast.error("Please select a delivery address");
    setPlacingOrder(true);

    const orderItems = items.map((i) => ({
      productId: i.productId,
      name: i.name,
      variantId: i.variantId || null,
      variantLabel: i.variantLabel || null,
      selectedOptions: i.selectedOptions || null,
      price: i.price,
      image: i.image,
      quantity: i.quantity,
      taxRate: i.taxRate || 0,
      taxType: i.taxType || "inclusive",
    }));

    const baseOrderData = {
      userId: user.uid,
      items: orderItems,
      subtotal: subtotalBeforeTax,
      totalTax: totalTaxAmount,
      taxBreakdown,
      shipping: effectiveShippingCharge,
      codFee: codCharge,
      discount,
      couponCode: coupon?.code || null,
      couponId: coupon?.id || null,
      couponType: coupon?.discountType || null,
      total,
      paymentMethod,
      shippingAddress: selectedAddress,
      customerEmail: user.email,
    };

    try {
      // The server recomputes prices, tax, shipping, discount and total from the database.
      // We only say WHAT is being bought, WHERE it goes, HOW it's paid and which coupon code was typed.
      const orderPayload = {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
          image: i.image || null,
          variantLabel: i.variantLabel || null,
          selectedOptions: i.selectedOptions || null,
        })),
        addressId: selectedAddress.id,
        paymentMethod,
        couponCode: coupon?.code || null,
      };

      // ── COD ───────────────────────────────────────────────────────────
      if (paymentMethod === "cod") {
        const placed = await placeOrder(orderPayload); // stock + coupon are handled inside the server transaction
        const orderId = placed.orderId;
        const finalOrder = { ...baseOrderData, total: placed.total, status: "confirmed" };
        orderPlacedRef.current = true;
        clearCart(); // also clears coupon from store

        Promise.allSettled([
          triggerEmail("order_confirmed", user.email, { order: finalOrder, orderId }),
          triggerEmail("admin_new_order", process.env.NEXT_PUBLIC_ADMIN_EMAIL, { order: finalOrder, orderId }),
        ]);

        toast.success("Order placed successfully!");
        router.push(`/orders/${orderId}?success=true`);
        return;
      }

      // ── Razorpay ──────────────────────────────────────────────────────
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway. Check your connection.");
        setPlacingOrder(false);
        return;
      }

      const placed = await placeOrder(orderPayload); // creates a PENDING order priced by the server
      const orderId = placed.orderId;
      const payable = placed.total;
      const rzpOrder = await createRazorpayOrder(orderId); // amount is read from the order row, not the browser

      let paymentResponse;
      try {
        paymentResponse = await openRazorpayCheckout({
          orderId: rzpOrder.orderId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          keyId: rzpOrder.keyId,
          customerInfo: {
            name: selectedAddress.fullName,
            email: user.email,
            phone: selectedAddress.phone,
          },
        });
      } catch (err) {
        if (!err.message?.includes("cancelled")) {
          triggerEmail("payment_failed", user.email, {
            displayName: profile?.displayName || "there",
            orderId,
            amount: payable,
          });
        }
        toast.error(err.message || "Payment was not completed");
        setPlacingOrder(false);
        return;
      }

      // Server verifies the signature AND confirms the order (status, stock, coupon) atomically
      const verification = await verifyRazorpayPayment(paymentResponse);
      if (!verification.verified) {
        toast.error(
          "Payment verification failed. Contact support if money was deducted.",
        );
        setPlacingOrder(false);
        return;
      }

      const finalOrder = { ...baseOrderData, total: payable, status: "confirmed" };
      Promise.allSettled([
        triggerEmail("order_confirmed", user.email, { order: finalOrder, orderId }),
        triggerEmail("admin_new_order", process.env.NEXT_PUBLIC_ADMIN_EMAIL, { order: finalOrder, orderId }),
      ]);

      orderPlacedRef.current = true;
      clearCart();
      toast.success("Payment successful!");
      router.push(`/orders/${orderId}?success=true`);
    } catch (err) {
      console.error("Order placement failed:", err);
      toast.error(err?.message && err.message.length < 140 ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  }

  // Order saved, cart already emptied, navigation to the success page in progress
  if (orderPlacedRef.current) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        Order placed! Taking you to your order…
      </div>
    );
  }

  if (authLoading || !user || items.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  step === s.id
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : step > s.id
                      ? "bg-green-50 border-green-500 text-green-600"
                      : "bg-white border-gray-200 text-gray-300"
                }`}
              >
                {step > s.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${step === s.id ? "text-indigo-600" : "text-gray-400"}`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-0.5 mx-2 mb-4 ${step > s.id ? "bg-green-400" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Main content ─────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {/* STEP 1 — Address */}
          {step === 1 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" /> Select delivery
                address
              </h2>

              {loadingAddresses ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : (
                <>
                  {addresses.length > 0 && (
                    <div className="space-y-3 mb-5">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex items-start gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                            selectedAddressId === addr.id
                              ? "border-indigo-500 bg-indigo-50/50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 accent-indigo-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {addr.label}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {addr.fullName}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {addr.line1}
                              {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}
                              , {addr.state} — {addr.pincode}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {addr.phone}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {!showAddForm ? (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-700"
                    >
                      <Plus className="w-4 h-4" /> Add new address
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSaveNewAddress}
                      className="space-y-4 border-t border-gray-100 pt-5"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Full name <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="fullName"
                            value={addressForm.fullName}
                            onChange={handleAddressFormChange}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="phone"
                            value={addressForm.phone}
                            onChange={handleAddressFormChange}
                            maxLength={10}
                            placeholder="10-digit number"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Address line 1 <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="line1"
                          value={addressForm.line1}
                          onChange={handleAddressFormChange}
                          placeholder="House no, building, street"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Address line 2
                        </label>
                        <input
                          name="line2"
                          value={addressForm.line2}
                          onChange={handleAddressFormChange}
                          placeholder="Landmark, area (optional)"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="city"
                            value={addressForm.city}
                            onChange={handleAddressFormChange}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            State <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="state"
                            value={addressForm.state}
                            onChange={handleAddressFormChange}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="">Select</option>
                            {INDIAN_STATES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Pincode <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="pincode"
                            value={addressForm.pincode}
                            onChange={handleAddressFormChange}
                            maxLength={6}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {addresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={savingAddress}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {savingAddress && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Save address
                        </button>
                      </div>
                    </form>
                  )}

                  {addresses.length > 0 && (
                    <button
                      onClick={() => {
                        if (!selectedAddressId)
                          return toast.error(
                            "Please select a delivery address",
                          );
                        setStep(2);
                      }}
                      className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
                    >
                      Continue to payment
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 2 — Payment method */}
          {step === 2 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
              >
                <ChevronLeft className="w-4 h-4" /> Back to address
              </button>
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" /> Select
                payment method
              </h2>

              <div className="space-y-3 mb-6">
                {/* Razorpay */}
                <label
                  className={`flex items-start gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                    paymentMethod === "razorpay"
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    className="mt-1 accent-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-semibold text-gray-900">
                        Pay online (Razorpay)
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      UPI, credit/debit card, net banking, wallets
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {["UPI", "Cards", "NetBanking", "Wallets"].map((m) => (
                        <span
                          key={m}
                          className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>

                {/* COD */}
                {!shippingLoading && shippingConfig.codEnabled && (
                  <label
                    className={`flex items-start gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                      paymentMethod === "cod"
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="mt-1 accent-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-gray-900">
                          Cash on Delivery
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Pay with cash when your order arrives
                      </p>
                      {shippingConfig.codFee > 0 && (
                        <p className="text-xs text-orange-600 mt-1.5">
                          +{formatPrice(shippingConfig.codFee)} handling fee
                        </p>
                      )}
                    </div>
                  </label>
                )}
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                Continue to review
              </button>
            </div>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
              >
                <ChevronLeft className="w-4 h-4" /> Back to payment
              </button>
              <h2 className="font-bold text-gray-900 mb-5">
                Review your order
              </h2>

              {/* Address summary */}
              <div className="border border-gray-100 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Delivering to
                  </span>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    Change
                  </button>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedAddress?.fullName}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedAddress?.line1}, {selectedAddress?.city},{" "}
                  {selectedAddress?.state} — {selectedAddress?.pincode}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedAddress?.phone}
                </p>
              </div>

              {/* Payment method */}
              <div className="border border-gray-100 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Payment method
                  </span>
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    Change
                  </button>
                </div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {paymentMethod === "razorpay" ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-indigo-600" /> Pay
                      online via Razorpay
                    </>
                  ) : (
                    <>
                      <Banknote className="w-4 h-4 text-green-600" /> Cash on
                      Delivery
                    </>
                  )}
                </p>
              </div>

              {/* Items */}
              <div className="border border-gray-100 rounded-xl p-4 mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-3">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}__${item.variantId || "base"}`}
                      className="flex justify-between text-sm"
                    >
                      <div className="flex-1 mr-4">
                        <span className="text-gray-700 line-clamp-1">
                          {item.name}
                        </span>
                        {item.variantLabel && (
                          <p className="text-xs text-indigo-600">
                            {item.variantLabel}
                          </p>
                        )}
                        <span className="text-gray-400">
                          {" "}
                          × {item.quantity}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 flex-shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon input — pre-filled from store */}
              <div className="mb-5">
                <CouponInput
                  code={couponCode}
                  setCode={setCouponCode}
                  coupon={coupon}
                  discount={discount}
                  loading={couponLoading}
                  error={couponError}
                  onApply={applyCoupon}
                  onRemove={removeCoupon}
                  cartTotal={safeCartTotal}
                  isFreeShipping={couponFreeShipping}
                />
              </div>

              {/* Place order */}
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {placingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {paymentMethod === "razorpay"
                      ? "Processing payment..."
                      : "Placing order..."}
                  </>
                ) : paymentMethod === "razorpay" ? (
                  `Pay ${formatPrice(total)}`
                ) : (
                  `Place order — ${formatPrice(total)}`
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Order summary sidebar ─────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-5">Order summary</h2>

            <div className="space-y-3 mb-5">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items ({items.length})</span>
                <span className="text-gray-900">
                  {formatPrice(
                    totalTaxAmount > 0 ? subtotalBeforeTax : safeCartTotal,
                  )}
                </span>
              </div>

              {/* GST */}
              {taxBreakdown.map((tb) => (
                <div key={tb.rate} className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> GST {tb.rate}%
                  </span>
                  <span className="text-gray-900">
                    {formatPrice(tb.taxAmount)}
                  </span>
                </div>
              ))}

              {/* Coupon discount line */}
              {coupon && discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> {coupon.code}
                  </span>
                  <span className="text-green-600 font-semibold">
                    −{formatPrice(discount)}
                  </span>
                </div>
              )}

              {/* Free shipping coupon */}
              {coupon && couponFreeShipping && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> {coupon.code}
                  </span>
                  <span className="text-green-600 font-semibold">
                    Free shipping
                  </span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Shipping
                </span>
                <span className="font-medium text-gray-900">
                  {shippingLoading ? (
                    <span className="text-gray-300">—</span>
                  ) : effectiveShippingFree ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(effectiveShippingCharge)
                  )}
                </span>
              </div>

              {/* COD fee */}
              {codCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">COD handling fee</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(codCharge)}
                  </span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline py-4 border-t border-gray-100">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(total)}
              </span>
            </div>

            {totalTaxAmount > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Incl. {formatPrice(totalTaxAmount)} GST
              </p>
            )}

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
              <ShieldCheck className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-400">
                Secure checkout powered by Razorpay
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}