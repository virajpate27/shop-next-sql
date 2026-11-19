// src/app/admin/reviews/page.js
"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Star, Search, Loader2, EyeOff, Eye, Trash2, ShieldCheck, ThumbsUp } from "lucide-react";
import { getAdminReviews, setReviewStatus, deleteReview } from "@/lib/api/reviews";
import { formatDate } from "@/utils/formatters";

const TABS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

function Stars({ value }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= value ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setReviews(await getAdminReviews({ status, rating, q: search.trim() }));
    } catch (err) {
      toast.error(err?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [status, rating, search]);

  // reload when a filter changes (search is debounced)
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function toggle(review) {
    const next = review.status === "hidden" ? "published" : "hidden";
    setBusyId(review.id);
    try {
      await setReviewStatus(review.id, next);
      toast.success(next === "hidden" ? "Review hidden. It no longer counts toward the rating." : "Review is public again");
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not update the review");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(review) {
    if (!confirm(`Delete this review by ${review.displayName} permanently?\n\nTo keep it but hide it from customers, use Hide instead.`)) return;
    setBusyId(review.id);
    try {
      await deleteReview(review.id);
      toast.success("Review deleted");
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not delete the review");
    } finally {
      setBusyId(null);
    }
  }

  const hiddenCount = reviews.filter((r) => r.status === "hidden").length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {reviews.length} shown{hiddenCount ? ` · ${hiddenCount} hidden` : ""} · only customers with a delivered order can review
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === t.value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search review text or reviewer..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20">
          <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reviews match</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className={`bg-white border rounded-2xl p-5 ${r.status === "hidden" ? "border-amber-200 bg-amber-50/40" : "border-gray-100"}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Stars value={r.rating} />
                    <span className="text-sm font-semibold text-gray-900">{r.displayName}</span>
                    {r.verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> Verified purchase
                      </span>
                    )}
                    {r.status === "hidden" && (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Hidden</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(r.createdAt)} · {r.email || "unknown email"} ·{" "}
                    {r.productSlug ? (
                      <Link href={`/products/${r.productSlug}`} target="_blank" className="text-indigo-600 hover:underline">{r.productName}</Link>
                    ) : (
                      r.productName
                    )}{" "}
                    · <ThumbsUp className="w-3 h-3 inline -mt-0.5" /> {r.helpful}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggle(r)}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : r.status === "hidden" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {r.status === "hidden" ? "Show" : "Hide"}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed whitespace-pre-wrap break-words">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}