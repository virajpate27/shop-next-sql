// src/app/admin/orders/page.js
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { triggerEmail } from "@/lib/triggerEmail";
import {
  Search,
  ChevronDown,
  X,
  Package,
  MapPin,
  Banknote,
  ShieldCheck,
  Loader2,
  Tag,
  Trash2,
  Truck,
  FileText,
  Printer,
  Pencil,
} from "lucide-react";
import { formatPrice, formatDate } from "@/utils/formatters";
import { getOptimizedUrl } from "@/lib/cloudinary";
import {
  updateOrderStatus,
  updateOrderTracking,
  deleteOrder,
  getAllOrders,
} from "@/lib/api/orders";
import { COURIERS } from "@/lib/tracking";
import { canInvoice } from "@/lib/invoice";

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_STYLES = {
  pending: "bg-yellow-50 text-yellow-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const EMPTY_SHIP = { courier: "", number: "", url: "" };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  // "Shipping details" dialog: mode "ship" = marking as shipped, "edit" = correcting tracking afterwards
  const [shipDialog, setShipDialog] = useState(null); // { order, mode }
  const [shipForm, setShipForm] = useState(EMPTY_SHIP);
  const [shipBusy, setShipBusy] = useState(false);

  // Poll every 15s (replaces Firestore onSnapshot). API returns newest first.
  // Returns the fresh list so callers (e.g. the shipped email) can use up-to-date order data.
  const loadOrders = useCallback(async () => {
    try {
      const results = await getAllOrders();
      setOrders(results);
      // keep the open detail modal fresh
      setSelectedOrder((prev) => (prev ? results.find((o) => o.id === prev.id) || prev : prev));
      return results;
    } catch (err) {
      console.error("Failed to load orders:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const t = setInterval(() => { if (!document.hidden) loadOrders(); }, 15000);
    return () => clearInterval(t);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (paymentFilter !== "all" && order.paymentMethod !== paymentFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesName = order.shippingAddress?.fullName
          ?.toLowerCase()
          .includes(q);
        const matchesPhone = order.shippingAddress?.phone?.includes(q);
        const matchesTracking = order.trackingNumber?.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesTracking) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, search]);

  // Returns true when the status change went through.
  async function handleStatusChange(orderId, newStatus, refundConfirmed = false, tracking = null) {
    setUpdatingId(orderId);
    try {
      // The server records a timeline event; "shipped" can carry courier + tracking number in the same step;
      // cancelling a PAID online order also refunds it via Razorpay and restocks.
      const extra = {};
      if (refundConfirmed) extra.refund = true;
      if (tracking) extra.tracking = tracking;
      const result = await updateOrderStatus(orderId, newStatus, "", extra);
      const fresh = await loadOrders();
      toast.success(
        result?.refunded
          ? "Order cancelled — refund sent through Razorpay"
          : `Order marked as ${newStatus}`,
      );

      // Send status email to customer (uses the fresh order, so the shipped email includes the tracking details)
      const notifyStatuses = [
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];
      if (notifyStatuses.includes(newStatus)) {
        const order = (fresh || orders).find((o) => o.id === orderId);
        if (order?.customerEmail) {
          triggerEmail("order_status", order.customerEmail, {
            order,
            orderId,
            newStatus,
          });
        }
      }
      return true;
    } catch (err) {
      if (err?.data?.needsRefundConfirm) {
        // paid online order: ask before refunding the customer
        setUpdatingId(null);
        if (confirm(err.message)) return handleStatusChange(orderId, newStatus, true, tracking);
        return false;
      }
      toast.error(err?.message || "Failed to update order status");
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  // Dropdown handler: "shipped" first asks for courier / tracking, everything else changes straight away.
  function requestStatusChange(order, value) {
    if (value === order.status) return;
    if (value === "shipped") {
      setShipForm(EMPTY_SHIP);
      setShipDialog({ order, mode: "ship" });
      return;
    }
    handleStatusChange(order.id, value);
  }

  function openTrackingEditor(order) {
    setShipForm({
      courier: order.courierName || "",
      number: order.trackingNumber || "",
      url: order.trackingUrl || "",
    });
    setShipDialog({ order, mode: "edit" });
  }

  async function confirmShipDialog(skipTracking = false) {
    if (!shipDialog) return;
    const { order, mode } = shipDialog;
    setShipBusy(true);
    try {
      if (mode === "ship") {
        const tracking = skipTracking ? null : { courier: shipForm.courier, number: shipForm.number, url: shipForm.url };
        const ok = await handleStatusChange(order.id, "shipped", false, tracking);
        if (ok) setShipDialog(null); // on an error (e.g. invalid link) the dialog stays open so you can fix it
      } else {
        await updateOrderTracking(order.id, { courier: shipForm.courier, number: shipForm.number, url: shipForm.url });
        await loadOrders();
        toast.success("Tracking details saved");
        setShipDialog(null);
      }
    } catch (err) {
      toast.error(err?.message || "Could not save tracking details");
    } finally {
      setShipBusy(false);
    }
  }

  // Add handleDelete function:
  async function handleDelete(orderId) {
    if (
      !confirm(
        "Delete this order permanently?\n\nThis cannot be undone. The customer will not be notified.",
      )
    )
      return;

    setDeletingId(orderId);
    try {
      await deleteOrder(orderId);
      await loadOrders();
      // If detail modal is open for this order, close it
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      toast.success("Order deleted");
    } catch {
      toast.error("Failed to delete order");
    } finally {
      setDeletingId(null);
    }
  }

  const orderCounts = useMemo(() => {
    const counts = { all: orders.length };
    STATUS_OPTIONS.forEach((s) => {
      counts[s] = orders.filter((o) => o.status === s).length;
    });
    return counts;
  }, [orders]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {orders.length} total orders
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === "all"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({orderCounts.all})
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              statusFilter === s
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s} ({orderCounts[s] || 0})
          </button>
        ))}
      </div>

      {/* Search + payment filter */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, name, phone or tracking no...."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-9 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All payments</option>
            <option value="razorpay">Razorpay</option>
            <option value="cod">Cash on Delivery</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  "Order",
                  "Customer",
                  "Items",
                  "Payment",
                  "Total",
                  "Status",
                  "Date",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="font-mono text-xs text-indigo-600 hover:underline"
                    >
                      #{order.id.slice(0, 8).toUpperCase()}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">
                      {order.shippingAddress?.fullName || "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.shippingAddress?.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {order.items?.length} item
                    {order.items?.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs">
                      {order.paymentMethod === "cod" ? (
                        <>
                          <Banknote className="w-3.5 h-3.5 text-green-600" />{" "}
                          COD
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />{" "}
                          Razorpay
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatPrice(order.total)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Status dropdown ("shipped" opens the shipping-details dialog) */}
                      <div className="relative inline-block">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            requestStatusChange(order, e.target.value)
                          }
                          disabled={updatingId === order.id || order.status === "cancelled"}
                          className={`appearance-none text-xs font-medium pl-2.5 pr-7 py-1.5 rounded-full capitalize cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed ${STATUS_STYLES[order.status] || ""}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {updatingId === order.id ? (
                          <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin pointer-events-none" />
                        ) : (
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={deletingId === order.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete order"
                      >
                        {deletingId === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-gray-400"
                  >
                    No orders match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">
                  Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(selectedOrder.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(selectedOrder.id)}
                  disabled={deletingId === selectedOrder.id}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {deletingId === selectedOrder.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete order
                </button>

                {/* Existing close button */}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Print documents */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/print/packing-slip/${selectedOrder.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Packing slip
                </a>
                {canInvoice(selectedOrder) && (
                  <a
                    href={`/print/invoice/${selectedOrder.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> Invoice
                  </a>
                )}
              </div>

              {/* Status selector */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Order status</span>
                <div className="relative">
                  <select
                    value={selectedOrder.status}
                    onChange={(e) =>
                      requestStatusChange(selectedOrder, e.target.value)
                    }
                    disabled={updatingId === selectedOrder.id || selectedOrder.status === "cancelled"}
                    className={`appearance-none text-sm font-medium pl-3 pr-8 py-1.5 rounded-full capitalize cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed ${STATUS_STYLES[selectedOrder.status] || ""}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Shipment / tracking */}
              {["shipped", "delivered"].includes(selectedOrder.status) && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Shipment
                    </p>
                    <button
                      onClick={() => openTrackingEditor(selectedOrder)}
                      className="flex items-center gap-1 text-xs font-medium text-purple-700 hover:underline"
                    >
                      <Pencil className="w-3 h-3" />
                      {selectedOrder.trackingNumber || selectedOrder.courierName ? "Edit" : "Add tracking"}
                    </button>
                  </div>
                  {selectedOrder.trackingNumber || selectedOrder.courierName ? (
                    <>
                      <p className="text-sm text-gray-800">
                        {selectedOrder.courierName || "Courier not set"}
                        {selectedOrder.trackingNumber && (
                          <> · <span className="font-mono font-semibold">{selectedOrder.trackingNumber}</span></>
                        )}
                      </p>
                      {/^https?:\/\//i.test(selectedOrder.trackingUrl || "") && (
                        <a
                          href={selectedOrder.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-700 underline"
                        >
                          Open tracking link
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-purple-700/80">No tracking details yet. The customer sees them as soon as you add them.</p>
                  )}
                </div>
              )}

              {/* Refund status (cancelled paid orders) */}
              {selectedOrder.refundStatus && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-gray-700 mb-0.5">Refund</p>
                  {selectedOrder.refundStatus === "processed" ? (
                    <p className="text-green-700">
                      {formatPrice(selectedOrder.refundedAmount)} processed by Razorpay · {selectedOrder.razorpayRefundId}
                    </p>
                  ) : selectedOrder.refundStatus === "failed" ? (
                    <p className="text-red-600 font-medium">
                      Refund FAILED ({selectedOrder.razorpayRefundId || "no id"}). Refund it manually from the Razorpay dashboard.
                    </p>
                  ) : (
                    <p className="text-amber-700">
                      {formatPrice(selectedOrder.refundedAmount || selectedOrder.total)} sent to Razorpay · waiting for the bank
                      {selectedOrder.razorpayRefundId ? ` · ${selectedOrder.razorpayRefundId}` : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Address */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Delivery address
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedOrder.shippingAddress?.fullName}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedOrder.shippingAddress?.line1},{" "}
                  {selectedOrder.shippingAddress?.city},{" "}
                  {selectedOrder.shippingAddress?.state} —{" "}
                  {selectedOrder.shippingAddress?.pincode}
                </p>
                <p className="text-sm text-gray-400">
                  {selectedOrder.shippingAddress?.phone}
                </p>
              </div>
              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Items
                </p>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image && (
                          <Image
                            src={getOptimizedUrl(item.image, {
                              width: 96,
                              height: 96,
                            })}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{item.name}</p>
                        {item.variantLabel && (
                          <p className="text-xs font-medium text-indigo-600 mt-0.5">
                            {item.variantLabel}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.couponCode && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Coupon applied
                  </p>
                  <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-green-800 font-mono tracking-wider">
                        {selectedOrder.couponCode}
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {selectedOrder.couponType === "free_shipping"
                          ? "Free shipping"
                          : `Discount applied — ${formatPrice(selectedOrder.discount)} saved`}
                      </p>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <span className="text-green-700 font-bold text-sm">
                        −{formatPrice(selectedOrder.discount)}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* tax */}
              {selectedOrder.totalTax > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    GST collected
                  </p>
                  {selectedOrder.taxBreakdown?.map((tb) => (
                    <div
                      key={tb.rate}
                      className="flex justify-between text-xs text-gray-500 mb-1"
                    >
                      <span>
                        GST {tb.rate}% on {formatPrice(tb.baseAmount)}
                      </span>
                      <span className="font-medium">
                        {formatPrice(tb.taxAmount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-50 mt-1">
                    <span>Total GST</span>
                    <span>{formatPrice(selectedOrder.totalTax)}</span>
                  </div>
                </div>
              )}
              {/* Payment summary */}
              <div className="border-t border-gray-100 pt-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">
                    {formatPrice(selectedOrder.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-gray-900">
                    {selectedOrder.shipping === 0
                      ? "Free"
                      : formatPrice(selectedOrder.shipping)}
                  </span>
                </div>
                {selectedOrder.codFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">COD fee</span>
                    <span className="text-gray-900">
                      {formatPrice(selectedOrder.codFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-50">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">
                    {formatPrice(selectedOrder.total)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                {selectedOrder.paymentMethod === "cod" ? (
                  <>
                    <Banknote className="w-3.5 h-3.5" /> Cash on Delivery
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" /> Paid via Razorpay{" "}
                    {selectedOrder.razorpayPaymentId &&
                      `· ${selectedOrder.razorpayPaymentId}`}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shipping details dialog */}
      {shipDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  {shipDialog.mode === "ship" ? "Mark as shipped" : "Tracking details"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Order #{shipDialog.order.id.slice(0, 8).toUpperCase()} · {shipDialog.order.shippingAddress?.fullName}
                </p>
              </div>
              <button
                onClick={() => setShipDialog(null)}
                disabled={shipBusy}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Courier</label>
                <select
                  value={COURIERS.includes(shipForm.courier) || !shipForm.courier ? shipForm.courier : "Other"}
                  onChange={(e) => setShipForm((f) => ({ ...f, courier: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select courier</option>
                  {COURIERS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tracking / AWB number</label>
                <input
                  value={shipForm.number}
                  onChange={(e) => setShipForm((f) => ({ ...f, number: e.target.value }))}
                  maxLength={100}
                  placeholder="e.g. 1234567890"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tracking link <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={shipForm.url}
                  onChange={(e) => setShipForm((f) => ({ ...f, url: e.target.value }))}
                  maxLength={500}
                  placeholder="https://courier.com/track/1234567890"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Customers get a “Track shipment” button when this is filled in.</p>
              </div>

              <div className="flex gap-3 pt-1">
                {shipDialog.mode === "ship" && (
                  <button
                    onClick={() => confirmShipDialog(true)}
                    disabled={shipBusy}
                    className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                  >
                    Ship without tracking
                  </button>
                )}
                <button
                  onClick={() => confirmShipDialog(false)}
                  disabled={shipBusy}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                >
                  {shipBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {shipDialog.mode === "ship" ? "Mark as shipped" : "Save tracking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}