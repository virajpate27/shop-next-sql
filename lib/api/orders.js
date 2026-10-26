// lib/api/orders.js — client replacement for lib/firebase/orders.js
import { authFetch } from '@/lib/authFetch'
const j = async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Request failed'); return d }

/** returns { orderId, total, status } */
export const placeOrder = (payload) => authFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) }).then(j)
/** payload: { items, addressId, paymentMethod, couponCode } → returns orderId */
export const createOrder = (payload) => authFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) }).then(j).then((d) => d.orderId)
export const getOrderById = (id) => authFetch(`/api/orders/${id}`).then(j).then((d) => d.order)
export const getMyOrders = () => authFetch('/api/orders').then(j).then((d) => d.orders)
export const getAllOrders = () => authFetch('/api/orders?all=1').then(j).then((d) => d.orders)
export const updateOrderStatus = (id, status, note = '') => authFetch(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) }).then(j)
export const deleteOrder = (id) => authFetch(`/api/orders/${id}`, { method: 'DELETE' }).then(j)
