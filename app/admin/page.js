// src/app/admin/page.js
"use client";
import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import {
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { formatPrice, formatDate } from "@/utils/formatters";
import { toast } from "sonner";
import { useShipping } from "@/hooks/useShipping";

const STATUS_STYLES = {
  pending: "bg-yellow-50 text-yellow-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    users: 0,
    revenue: 0,
    pendingOrders: 0,
    lowStockCount: 0,
    codOrders: 0,
    onlineOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [categoryChart, setCategoryChart] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { config: shippingConfig } = useShipping();

  useEffect(() => {
    // One SQL-backed endpoint feeds the whole dashboard; refreshed every 20s while the tab is visible
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/dashboard", { credentials: "same-origin" });
        if (!res.ok) throw new Error(`dashboard ${res.status}`);
        const d = await res.json();
        if (!alive) return;

        setStats((prev) => ({ ...prev, ...d.stats }));
        setRecentOrders(d.recentOrders);
        setLowStockProducts(d.lowStockProducts);
        setCategoryChart(d.categoryChart);

        // Revenue chart — last 7 days (bucketed in the viewer's local time, as before)
        const now = new Date();
        const days = Array.from({ length: 7 }).map((_, i) => {
          const day = new Date(now);
          day.setDate(day.getDate() - (6 - i));
          return {
            date: day,
            label: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          };
        });
        setRevenueChart(
          days.map(({ date, label }) => ({
            label,
            revenue: d.weekOrders
              .filter((o) => {
                if (o.status === "cancelled") return false;
                const od = new Date(o.createdAt);
                return (
                  od.getDate() === date.getDate() &&
                  od.getMonth() === date.getMonth() &&
                  od.getFullYear() === date.getFullYear()
                );
              })
              .reduce((sum, o) => sum + (o.total || 0), 0),
          })),
        );
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const STAT_CARDS = [
    {
      label: "Total revenue",
      value: formatPrice(stats.revenue),
      icon: IndianRupee,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Total orders",
      value: stats.orders,
      icon: ShoppingBag,
      color: "bg-indigo-50 text-indigo-600",
      sub: `${stats.pendingOrders} pending`,
    },
    {
      label: "Total products",
      value: stats.products,
      icon: Package,
      color: "bg-blue-50 text-blue-600",
      sub: stats.lowStockCount > 0 ? `${stats.lowStockCount} low stock` : null,
    },
    {
      label: "Registered users",
      value: stats.users,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "GST collected",
      value: formatPrice(stats.totalTax || 0),
      icon: Receipt, // import Receipt from lucide-react
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, sub }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <div
              className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-400 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-orange-500 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Revenue — last 7 days
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f1f1"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                formatter={(value) => formatPrice(value)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #f1f1f1",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment method split */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Payment methods</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">Razorpay</span>
                <span className="font-medium text-gray-900">
                  {stats.onlineOrders}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{
                    width: `${stats.orders ? (stats.onlineOrders / stats.orders) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">Cash on Delivery</span>
                <span className="font-medium text-gray-900">
                  {stats.codOrders}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${stats.orders ? (stats.codOrders / stats.orders) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 mb-2">Products by category</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={categoryChart}
                  layout="vertical"
                  margin={{ left: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="category"
                    type="category"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                  />
                  <Bar
                    dataKey="count"
                    fill="#a5b4fc"
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent orders</h2>
            <a
              href="/admin/orders"
              className="text-xs text-indigo-600 font-medium hover:underline"
            >
              View all
            </a>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs text-gray-400">
                      #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {order.shippingAddress?.fullName || "—"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[order.status] || ""}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 text-right">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-gray-400"
                  >
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Low stock alert */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Stock alerts</h2>
            <button
              onClick={async () => {
                const res = await fetch("/api/admin/low-stock-alert", {
                  method: "POST",
                  credentials: "same-origin",
                });
                const data = await res.json();
                if (data.success && data.alerted > 0)
                  toast.success(
                    `Stock alert sent for ${data.alerted} products`,
                  );
                else if (data.success) toast.success("All products are well stocked");
                else toast.error("Failed to send alert");
              }}
              className="mt-4 text-xs text-indigo-600 font-medium hover:underline"
            >
              Send stock alert email
            </button>
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              All products well stocked
            </p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 line-clamp-1 flex-1">
                    {p.name}
                  </p>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-2 ${
                      p.stock === 0
                        ? "bg-red-50 text-red-600"
                        : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add a shipping summary card alongside stat cards: */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <a
              href="/admin/shipping"
              className="text-xs text-indigo-600 font-medium hover:underline"
            >
              Edit
            </a>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {shippingConfig.freeShippingEnabled && shippingConfig.freeAbove > 0
              ? `Free above ₹${shippingConfig.freeAbove}`
              : `₹${shippingConfig.baseCharge} flat`}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">Shipping</p>
          <p className="text-xs text-gray-400 mt-2">
            COD:{" "}
            {shippingConfig.codEnabled
              ? shippingConfig.codFee > 0
                ? `+₹${shippingConfig.codFee} fee`
                : "Free"
              : "Disabled"}
          </p>
        </div>

      </div>
    </div>
  );
}
