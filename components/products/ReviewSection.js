// src/components/products/ReviewSection.js
'use client'
import { useState, useEffect } from 'react'
import { Star, ThumbsUp, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { getReviews, addReview, getUserReview, markHelpful } from '@/lib/api/reviews'
import { formatDate } from '@/utils/formatters'

function StarRating({ value, onChange, readonly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(0)
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={readonly ? 'button' : 'button'}
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star
            className={`${sizes[size]} transition-colors ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewSkeleton() {
  return (
    <div className="border-b border-gray-100 pb-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-gray-100 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-100 rounded w-32" />
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}

export function ReviewSection({ productId, productName }) {
  const { user, profile } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [userReview, setUserReview] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [allReviews, existing] = await Promise.all([
          getReviews(productId),
          user ? getUserReview(productId, user.uid) : null,
        ])
        setReviews(allReviews)
        setUserReview(existing)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [productId, user])

  async function handleSubmit(e) {
    e.preventDefault()
    if (rating === 0) return toast.error('Please select a star rating')
    if (comment.trim().length < 10) return toast.error('Review must be at least 10 characters')

    setSubmitting(true)
    try {
      await addReview(productId, user.uid, profile?.displayName || 'Anonymous', { rating, comment })
      toast.success('Review submitted!')
      const updated = await getReviews(productId)
      setReviews(updated)
      setUserReview({ rating, comment })
      setShowForm(false)
      setRating(0)
      setComment('')
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleHelpful(reviewId) {
    if (!user) return toast.error('Sign in to mark reviews as helpful')
    try {
      await markHelpful(reviewId)
      setReviews((prev) =>
        prev.map((r) => r.id === reviewId ? { ...r, helpful: (r.helpful || 0) + 1 } : r)
      )
    } catch {
      toast.error('Something went wrong')
    }
  }

  return (
    <section className="mt-16 pt-10 border-t border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-8">
        Customer reviews
        {reviews.length > 0 && (
          <span className="text-base font-normal text-gray-400 ml-2">
            ({reviews.length})
          </span>
        )}
      </h2>

      {/* Rating summary */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-8 mb-10 p-6 bg-gray-50 rounded-2xl">
          <div className="text-center">
            <p className="text-5xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
            <StarRating value={Math.round(avgRating)} readonly size="md" />
            <p className="text-sm text-gray-400 mt-1">{reviews.length} reviews</p>
          </div>
          <div className="flex-1 space-y-2">
            {ratingCounts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-6 text-right">{star}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write review */}
      {user ? (
        userReview ? (
          <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-xl">
            <p className="text-sm text-green-700 font-medium">
              You reviewed this product
            </p>
            <StarRating value={userReview.rating} readonly size="sm" />
          </div>
        ) : (
          <div className="mb-8">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                Write a review
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your review for {productName}</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your review
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Share your experience with this product..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{comment.length}/500 characters</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="border border-gray-200 text-gray-700 text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit review
                  </button>
                </div>
              </form>
            )}
          </div>
        )
      ) : (
        <p className="mb-8 text-sm text-gray-500">
          <a href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</a> to leave a review
        </p>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => <ReviewSkeleton key={i} />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reviews yet</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to review this product</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{review.displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating value={review.rating} readonly size="sm" />
                        <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
                  <button
                    onClick={() => handleHelpful(review.id)}
                    className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Helpful ({review.helpful || 0})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}