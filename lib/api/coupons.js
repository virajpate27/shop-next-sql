import { http } from './_http'
export { calculateDiscount } from '@/lib/coupons'
export const getCoupons = () => http('/api/coupons').then((d) => d.coupons)
export const createCoupon = (data) => http('/api/coupons', { method: 'POST', body: data }).then((d) => d.id)
export const updateCoupon = (id, data) => http(`/api/coupons/${id}`, { method: 'PUT', body: data })
export const deleteCoupon = (id) => http(`/api/coupons/${id}`, { method: 'DELETE' })
export const toggleCoupon = (id, isActive) => http(`/api/coupons/${id}`, { method: 'PATCH', body: { isActive } })
