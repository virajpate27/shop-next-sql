// src/app/admin/customers/page.js
"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Search,
  Eye,
  X,
  Loader2,
  Users,
  ShoppingBag,
  Star,
  RotateCcw,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Shield,
  ShieldOff,
  ChevronDown,
  Package,
  Download,
} from "lucide-react";
import {
  getAllCustomersWithStats,
  getCustomerOrders,
  getCustomerReturns,
  getCustomerReviews,
  blockCustomer,
  computeCustomerStats,
} from "@/lib/api/customers";
import { formatPrice, formatDate } from "@/utils/formatters";
import { getStatusConfig, STATUS_COLORS } from "@/utils/orderStatus";
import {
  exportCustomersToExcel,
  exportFilteredCustomers,
} from "@/utils/exportCustomers";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "most_orders", label: "Most orders" },
  { value: "most_spent", label: "Highest spending" },
  { value: "name_asc", label: "Name A → Z" },
];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerReturns, setCustomerReturns] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [blocking, setBlocking] = useState(false);

  // ── Load all customers ────────────────────────────────────────────────
  useEffect(() => {
    getAllCustomersWithStats()
      .then(setCustomers)
      .catch(() => toast.error("Failed to load customers"))
      .finally(() => setLoading(false));
  }, []);

  // ── Filter + sort ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...customers];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.displayName?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.id?.toLowerCase().includes(q),
      );
    }

    // Sort
    const toMs = (v) => (v ? new Date(v).getTime() || 0 : 0);

    switch (sortBy) {
      case "newest":
        list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        break;
      case "oldest":
        list.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
        break;
      case "most_orders":
        list.sort((a, b) => b._totalOrders - a._totalOrders);
        break;
      case "most_spent":
        list.sort((a, b) => b._totalSpent - a._totalSpent);
        break;
      case "name_asc":
        list.sort((a, b) =>
          (a.displayName || "").localeCompare(b.displayName || ""),
        );
        break;
      default:
        break;
    }

    return list;
  }, [customers, search, sortBy]);

  // ── Open customer detail ──────────────────────────────────────────────
  async function openDetail(customer) {
    setSelected(customer);
    setActiveTab("overview");
    setDetailLoading(true);
    setCustomerOrders([]);
    setCustomerReturns([]);
    setCustomerReviews([]);

    try {
      const [orders, returns, reviews] = await Promise.all([
        getCustomerOrders(customer.id),
        getCustomerReturns(customer.id),
        getCustomerReviews(customer.id),
      ]);
      setCustomerOrders(orders);
      setCustomerReturns(returns);
      setCustomerReviews(reviews);
    } catch {
      toast.error("Failed to load customer data");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelected(null);
    setCustomerOrders([]);
    setCustomerReturns([]);
    setCustomerReviews([]);
  }

  // ── Block / unblock ───────────────────────────────────────────────────
  async function handleBlock(customer) {
    const action = customer.blocked ? "Unblock" : "Block";
    if (!confirm(`${action} ${customer.displayName || customer.email}?`))
      return;

    setBlocking(true);
    try {
      await blockCustomer(customer.id, !customer.blocked);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customer.id ? { ...c, blocked: !c.blocked } : c,
        ),
      );
      if (selected?.id === customer.id) {
        setSelected((prev) => ({ ...prev, blocked: !prev.blocked }));
      }
      toast.success(`Customer ${action.toLowerCase()}ed`);
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} customer`);
    } finally {
      setBlocking(false);
    }
  }

  const stats =
    selected && !detailLoading ? computeCustomerStats(customerOrders) : null;

  // ── Aggregate stats for header ────────────────────────────────────────
  const totalCustomers = customers.length;
  const newThisMonth = customers.filter((c) => {
    const d = new Date(c.createdAt || 0);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalCustomers} total · {newThisMonth} new this month
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          {/* Export currently filtered list */}
          {filtered.length > 0 && filtered.length !== customers.length && (
            <button
              onClick={() => {
                exportFilteredCustomers(filtered, search || sortBy);
                toast.success(`Exported ${filtered.length} customers`);
              }}
              className="flex items-center gap-2 border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              Export filtered ({filtered.length})
            </button>
          )}

          {/* Export all */}
          <button
            onClick={() => {
              if (!customers.length)
                return toast.error("No customers to export");
              exportCustomersToExcel(customers);
              toast.success(`Exported ${customers.length} customers to Excel`);
            }}
            disabled={loading || !customers.length}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export all
          </button>
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or ID..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-9 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search ? "No customers match your search" : "No customers yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  "Customer",
                  "Email",
                  "Orders",
                  "Total spent",
                  "Role",
                  "Joined",
                  "Status",
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
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar + name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 flex-shrink-0">
                        {customer.photoURL ? (
                          <Image
                            src={customer.photoURL}
                            alt={customer.displayName || ""}
                            fill
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                            {(customer.displayName ||
                              customer.email ||
                              "?")[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {customer.displayName || "—"}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {customer.id.slice(0, 10)}…
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {customer.email}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {customer._totalOrders}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {formatPrice(customer._totalSpent)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        customer.role === "admin"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {customer.role || "customer"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(customer.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    {customer.blocked ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                        Blocked
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(customer)}
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

      {/* ── Customer detail drawer ───────────────────────────────────── */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={closeDetail}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-900">Customer details</h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!selected) return;
                    exportFilteredCustomers(
                      [selected],
                      selected.displayName || selected.email,
                    );
                    toast.success("Customer exported");
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>

                {/* Block / Unblock */}
                {selected.role !== "admin" && (
                  <button
                    onClick={() => handleBlock(selected)}
                    disabled={blocking}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors ${
                      selected.blocked
                        ? "bg-green-50 text-green-600 hover:bg-green-100"
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                  >
                    {blocking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : selected.blocked ? (
                      <>
                        <Shield className="w-3.5 h-3.5" /> Unblock
                      </>
                    ) : (
                      <>
                        <ShieldOff className="w-3.5 h-3.5" /> Block
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={closeDetail}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Customer profile */}
            <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  {selected.photoURL ? (
                    <Image
                      src={selected.photoURL}
                      alt={selected.displayName || ""}
                      fill
                      className="rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                      {(selected.displayName ||
                        selected.email ||
                        "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900">
                      {selected.displayName || "No name"}
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        selected.role === "admin"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {selected.role || "customer"}
                    </span>
                    {selected.blocked && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                        Blocked
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-1.5">
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {selected.email}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Joined {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
              {[
                { id: "overview", label: "Overview", icon: TrendingUp },
                {
                  id: "orders",
                  label: `Orders (${customerOrders.length})`,
                  icon: ShoppingBag,
                },
                {
                  id: "returns",
                  label: `Returns (${customerReturns.length})`,
                  icon: RotateCcw,
                },
                {
                  id: "reviews",
                  label: `Reviews (${customerReviews.length})`,
                  icon: Star,
                },
                { id: "profile", label: "Profile", icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div className="p-6">
                  {/* ── Overview tab ──────────────────────────────────── */}
                  {activeTab === "overview" && stats && (
                    <div className="space-y-5">
                      {/* Stat cards */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          {
                            label: "Total spent",
                            value: formatPrice(stats.totalSpent),
                            icon: TrendingUp,
                            color: "bg-green-50 text-green-600",
                          },
                          {
                            label: "Total orders",
                            value: stats.totalOrders,
                            icon: ShoppingBag,
                            color: "bg-indigo-50 text-indigo-600",
                          },
                          {
                            label: "Avg order value",
                            value: formatPrice(stats.avgOrderValue),
                            icon: TrendingUp,
                            color: "bg-purple-50 text-purple-600",
                          },
                          {
                            label: "Cancelled orders",
                            value: stats.cancelledOrders,
                            icon: X,
                            color: "bg-red-50 text-red-500",
                          },
                        ].map(({ label, value, icon: Icon, color }) => (
                          <div
                            key={label}
                            className="bg-white border border-gray-100 rounded-2xl p-4"
                          >
                            <div
                              className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                              {value}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Last order */}
                      {stats.lastOrderAt && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          Last order on{" "}
                          <span className="font-medium text-gray-700">
                            {formatDate(stats.lastOrderAt)}
                          </span>
                        </div>
                      )}

                      {/* Recent orders preview */}
                      {customerOrders.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-3">
                            Recent orders
                          </p>
                          <div className="space-y-2">
                            {customerOrders.slice(0, 3).map((order) => {
                              const cfg = getStatusConfig(order.status);
                              const colors = STATUS_COLORS[cfg.color];
                              return (
                                <div
                                  key={order.id}
                                  className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                                >
                                  <div>
                                    <p className="text-xs font-mono text-gray-500">
                                      #{order.id.slice(0, 8).toUpperCase()}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {formatDate(order.createdAt)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                                    >
                                      {cfg.label}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">
                                      {formatPrice(order.total)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {customerOrders.length > 3 && (
                            <button
                              onClick={() => setActiveTab("orders")}
                              className="text-xs text-indigo-600 font-medium mt-2 hover:underline"
                            >
                              View all {customerOrders.length} orders →
                            </button>
                          )}
                        </div>
                      )}

                      {/* Wishlist count */}
                      {selected.wishlist?.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Star className="w-4 h-4 text-amber-400" />
                          <span>
                            <span className="font-semibold text-gray-900">
                              {selected.wishlist.length}
                            </span>{" "}
                            items in wishlist
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Orders tab ────────────────────────────────────── */}
                  {activeTab === "orders" && (
                    <div>
                      {customerOrders.length === 0 ? (
                        <div className="text-center py-16">
                          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">No orders yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customerOrders.map((order) => {
                            const cfg = getStatusConfig(order.status);
                            const colors = STATUS_COLORS[cfg.color];
                            return (
                              <div
                                key={order.id}
                                className="border border-gray-100 rounded-2xl p-4"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <p className="text-sm font-mono font-semibold text-gray-700">
                                      #{order.id.slice(0, 8).toUpperCase()}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {formatDate(order.createdAt)} ·{" "}
                                      <span className="capitalize">
                                        {order.paymentMethod === "cod"
                                          ? "COD"
                                          : "Razorpay"}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}
                                    >
                                      {cfg.label}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">
                                      {formatPrice(order.total)}
                                    </span>
                                  </div>
                                </div>

                                {/* Items preview */}
                                <div className="space-y-1.5">
                                  {order.items?.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-xs text-gray-500"
                                    >
                                      <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                      <span className="line-clamp-1">
                                        {item.name}
                                      </span>
                                      {item.variantLabel && (
                                        <span className="text-indigo-500">
                                          ({item.variantLabel})
                                        </span>
                                      )}
                                      <span className="text-gray-400 flex-shrink-0">
                                        × {item.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Coupon */}
                                {order.couponCode && (
                                  <p className="text-xs text-green-600 mt-2">
                                    Coupon: {order.couponCode} (−
                                    {formatPrice(order.discount)})
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Returns tab ───────────────────────────────────── */}
                  {activeTab === "returns" && (
                    <div>
                      {customerReturns.length === 0 ? (
                        <div className="text-center py-16">
                          <RotateCcw className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">
                            No return requests
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customerReturns.map((ret) => {
                            const STATUS_COLORS_MAP = {
                              pending: "bg-amber-50 text-amber-700",
                              approved: "bg-green-50 text-green-700",
                              rejected: "bg-red-50   text-red-700",
                              refunded: "bg-blue-50  text-blue-700",
                            };
                            return (
                              <div
                                key={ret.id}
                                className="border border-gray-100 rounded-2xl p-4"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-sm font-mono font-semibold text-gray-700">
                                      #{ret.id.slice(0, 8).toUpperCase()}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Order #
                                      {ret.orderId?.slice(0, 8).toUpperCase()} ·{" "}
                                      {formatDate(ret.createdAt)}
                                    </p>
                                  </div>
                                  <span
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS_MAP[ret.status] || ""}`}
                                  >
                                    {ret.status}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">
                                  {ret.reason}
                                </p>
                                <p className="text-sm font-semibold text-indigo-600">
                                  Refund: {formatPrice(ret.refundAmount)}
                                </p>
                                {ret.adminNote && (
                                  <p className="text-xs text-gray-400 mt-1 italic">
                                    "{ret.adminNote}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Reviews tab ───────────────────────────────────── */}
                  {activeTab === "reviews" && (
                    <div>
                      {customerReviews.length === 0 ? (
                        <div className="text-center py-16">
                          <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">
                            No reviews yet
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customerReviews.map((review) => (
                            <div
                              key={review.id}
                              className="border border-gray-100 rounded-2xl p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3.5 h-3.5 ${
                                        s <= review.rating
                                          ? "fill-amber-400 text-amber-400"
                                          : "fill-gray-200 text-gray-200"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="text-xs text-gray-400">
                                  {formatDate(review.createdAt)}
                                </p>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {review.comment}
                              </p>
                              {review.helpful > 0 && (
                                <p className="text-xs text-gray-400 mt-2">
                                  {review.helpful} people found this helpful
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Profile tab ───────────────────────────────────── */}
                  {activeTab === "profile" && (
                    <div className="space-y-5">
                      {/* Account info */}
                      <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                          Account info
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">
                            {selected.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 capitalize">
                            {selected.role || "customer"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">
                            Joined {formatDate(selected.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span
                            className={
                              selected.blocked
                                ? "text-red-600 font-medium"
                                : "text-green-600 font-medium"
                            }
                          >
                            {selected.blocked ? "Blocked" : "Active"}
                          </span>
                        </div>
                      </div>

                      {/* Saved addresses */}
                      {selected.addresses?.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            Saved addresses ({selected.addresses.length})
                          </p>
                          <div className="space-y-3">
                            {selected.addresses.map((addr, idx) => (
                              <div
                                key={idx}
                                className="bg-gray-50 rounded-xl p-4"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                    {addr.label}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {addr.fullName}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                  {addr.line1}
                                  {addr.line2 ? `, ${addr.line2}` : ""},{" "}
                                  {addr.city}, {addr.state} — {addr.pincode}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {addr.phone}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                            Saved addresses
                          </p>
                          <p className="text-sm text-gray-400">
                            No addresses saved
                          </p>
                        </div>
                      )}

                      {/* Wishlist */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          Wishlist
                        </p>
                        <p className="text-sm text-gray-700">
                          {selected.wishlist?.length || 0} saved items
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
