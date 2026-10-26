import { http } from './_http'
export const getReviews = (productId) => http(`/api/reviews?productId=${encodeURIComponent(productId)}`).then((d) => d.reviews)
export const getUserReview = (productId, _userId) => http(`/api/reviews?productId=${encodeURIComponent(productId)}&mine=1`).then((d) => d.review)
export const addReview = (productId, _userId, _displayName, { rating, comment }) => http('/api/reviews', { method: 'POST', body: { productId, rating, comment } }).then((d) => d.id)
export const markHelpful = (reviewId) => http(`/api/reviews/${reviewId}/helpful`, { method: 'POST' })
