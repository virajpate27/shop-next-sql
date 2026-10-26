import { http } from './_http'
export const getAllCustomersWithStats = () => http('/api/admin/customers').then((d) => d.customers)
export const getCustomerOrders = (id) => http(`/api/admin/customers/${id}?part=orders`).then((d) => d.orders)
export const getCustomerReturns = (id) => http(`/api/admin/customers/${id}?part=returns`).then((d) => d.returns)
export const getCustomerReviews = (id) => http(`/api/admin/customers/${id}?part=reviews`).then((d) => d.reviews)
export const blockCustomer = (id, blocked) => http(`/api/admin/customers/${id}`, { method: 'PATCH', body: { blocked } })

// Aggregate stats for a single customer (pure — unchanged)
export function computeCustomerStats(orders) {
  const completed = orders.filter((o) => o.status !== 'cancelled')
  const totalSpent = completed.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  return {
    totalOrders: orders.length,
    completedOrders: completed.length,
    cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
    totalSpent,
    avgOrderValue: completed.length ? totalSpent / completed.length : 0,
    lastOrderAt: orders[0]?.createdAt || null,
  }
}
