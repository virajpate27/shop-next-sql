// src/app/admin/returns/page.js
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  RotateCcw,
  X,
  Check,
  ChevronDown,
  Loader2,
  Eye,
  IndianRupee,
} from "lucide-react";
import {
  getAllReturns,
  updateReturnStatus,
  RETURN_STATUSES,
} from "@/lib/api/returns";
import { triggerEmail } from "@/lib/triggerEmail";
import { formatPrice, formatDate } from "@/utils/formatters";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All requests" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "refunded", label: "Refunded" },
];

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  refunded: "bg-blue-50 text-blue-700",
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadReturns = async () => {
    try {
      setReturns(await getAllReturns());
    } catch (err) {
      console.error("Failed to load returns:", err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 15s (replaces Firestore onSnapshot)
  useEffect(() => {
    loadReturns();
    const t = setInterval(() => { if (!document.hidden) loadReturns(); }, 15000);
    return () => clearInterval(t);
  }, []);

  const filtered = returns.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter,
  );

  const counts = {
    all: returns.length,
    pending: returns.filter((r) => r.status === "pending").length,
    approved: returns.filter((r) => r.status === "approved").length,
    rejected: returns.filter((r) => r.status === "rejected").length,
    refunded: returns.filter((r) => r.status === "refunded").length,
  };

  function openDetail(ret) {
    setSelected(ret);
    setAdminNote(ret.adminNote || "");
  }

  // Full updated handleAction:

  async function handleAction(returnId, status) {
    if (status === "rejected" && !adminNote.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      // Server enforces the flow (pending → approved/rejected → refunded) and, on refund,
      // restocks inventory in the same database transaction — exactly once.
      await updateReturnStatus(returnId, status, adminNote.trim());
      await loadReturns();

      // ── Notify customer ─────────────────────────────────────────────────
      if (selected?.customerEmail) {
        triggerEmail("return_status", selected.customerEmail, {
          status,
          adminNote: adminNote.trim(),
          returnId,
          orderId: selected.orderId,
          refundAmount: selected.refundAmount,
        });
      }

      toast.success(
        status === "approved"
          ? "Return approved — customer notified"
          : status === "refunded"
            ? "Marked as refunded — stock restored"
            : "Return rejected — customer notified",
      );

      setSelected(null);
      setAdminNote("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update return status");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Returns & Refunds
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {counts.pending} pending review
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === opt.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                statusFilter === opt.value
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {counts[opt.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <RotateCcw className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No return requests</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  "Request",
                  "Order",
                  "Items",
                  "Refund",
                  "Reason",
                  "Status",
                  "Date",
                  "",
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
              {filtered.map((ret) => (
                <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    #{ret.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">
                    #{ret.orderId?.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {ret.items?.length} item{ret.items?.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatPrice(ret.refundAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px]">
                    <p className="line-clamp-1">{ret.reason}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[ret.status] || ""}`}
                    >
                      {RETURN_STATUSES[ret.status]?.label || ret.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDate(ret.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(ret)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">
                  Return #{selected.id.slice(0, 8).toUpperCase()}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Order #{selected.orderId?.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setAdminNote("");
                }}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[selected.status] || ""}`}
                >
                  {RETURN_STATUSES[selected.status]?.label}
                </span>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Items requested for return
                </p>
                <div className="space-y-2">
                  {selected.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 items-center bg-gray-50 rounded-xl p-3"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {item.name}
                        </p>
                        {item.variantLabel && (
                          <p className="text-xs text-indigo-600">
                            {item.variantLabel}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Returning {item.returnQty} of {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                        {formatPrice(item.price * item.returnQty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason + note */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Reason</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selected.reason}
                  </p>
                </div>
                {selected.customNote && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">
                      Customer note
                    </p>
                    <p className="text-sm text-gray-600">
                      {selected.customNote}
                    </p>
                  </div>
                )}
              </div>

              {/* Refund */}
              <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-indigo-700">
                  <IndianRupee className="w-4 h-4" />
                  <span className="text-sm font-medium">Refund amount</span>
                </div>
                <span className="text-lg font-bold text-indigo-700">
                  {formatPrice(selected.refundAmount)}
                </span>
              </div>

              {/* Payment method */}
              <p className="text-xs text-gray-400">
                Payment method:{" "}
                <span className="font-medium text-gray-600 capitalize">
                  {selected.paymentMethod === "cod"
                    ? "Cash on Delivery"
                    : "Razorpay"}
                </span>
              </p>

              {/* Admin response */}
              {selected.status === "pending" ? (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Response to customer
                      <span className="text-gray-400 font-normal ml-1">
                        (required for rejection, optional for approval)
                      </span>
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={3}
                      placeholder="e.g. Your return has been approved. Refund will be credited within 5–7 business days."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (!adminNote.trim()) {
                          toast.error("Please provide a reason for rejection");
                          return;
                        }
                        handleAction(selected.id, "rejected");
                      }}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-2 border-2 border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60"
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(selected.id, "approved")}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60"
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              ) : selected.status === "approved" ? (
                /* Approved — show refunded button + admin note */
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  {selected.adminNote && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-green-700 mb-1">
                        Your response to customer
                      </p>
                      <p className="text-sm text-green-600">
                        {selected.adminNote}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Refund note
                      <span className="text-gray-400 font-normal ml-1">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="e.g. Refund of ₹999 sent to original payment method."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={() => handleAction(selected.id, "refunded")}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <IndianRupee className="w-4 h-4" />
                    )}
                    Mark as refunded
                  </button>
                </div>
              ) : (
                /* Rejected or refunded — read only */
                selected.adminNote && (
                  <div
                    className={`rounded-xl p-4 border border-t border-gray-100 mt-4 ${
                      selected.status === "refunded"
                        ? "bg-blue-50 border-blue-100"
                        : "bg-red-50 border-red-100"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold mb-1 ${
                        selected.status === "refunded"
                          ? "text-blue-700"
                          : "text-red-700"
                      }`}
                    >
                      Admin response
                    </p>
                    <p
                      className={`text-sm ${
                        selected.status === "refunded"
                          ? "text-blue-600"
                          : "text-red-600"
                      }`}
                    >
                      {selected.adminNote}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
