import { http } from './_http'
export const getWishlist = (_userId) => http('/api/wishlist').then((d) => d.wishlist)
export const addToWishlist = (_userId, productId) => http(`/api/wishlist/${productId}`, { method: 'POST' })
export const removeFromWishlist = (_userId, productId) => http(`/api/wishlist/${productId}`, { method: 'DELETE' })
export const isInWishlist = async (userId, productId) => (await getWishlist(userId)).includes(productId)
