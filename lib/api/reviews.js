import { http } from './_http'
export const getReviews = (productId) => http(`/api/reviews?productId=${encodeURIComponent(productId)}`).then((d) => d.reviews)
export const getReviewStatus = (productId) => http(`/api/reviews?productId=${encodeURIComponent(productId)}&mine=1`)
export const addReview = (productId, _userId, _displayName, { rating, comment }) => http('/api/reviews', { method: 'POST', body: { productId, rating, comment } }).then((d) => d.id)

/** → { helpful, voted }  (voted=false when you had already voted) */
export const markHelpful = (reviewId) => http(`/api/reviews/${reviewId}/helpful`, { method: 'POST' })

// admin moderation
export const getAdminReviews = (params = {}) => http(`/api/admin/reviews?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null))}`).then((d) => d.reviews)
export const setReviewStatus = (id, status) => http(`/api/admin/reviews/${id}`, { method: 'PATCH', body: { status } })
export const deleteReview = (id) => http(`/api/admin/reviews/${id}`, { method: 'DELETE' })