import { http } from './_http'
export { RETURN_REASONS, RETURN_STATUSES, isReturnEligible } from '@/lib/returns'
export const createReturnRequest = (data) => http('/api/returns', { method: 'POST', body: data }).then((d) => d.id)
export const getReturnByOrderId = (orderId) => http(`/api/returns?orderId=${encodeURIComponent(orderId)}`).then((d) => d.return)
export const getAllReturns = () => http('/api/returns?all=1').then((d) => d.returns)
// Admin: status change. Refund restocks inventory server-side in the same transaction.
export const updateReturnStatus = (id, status, adminNote = '') => http(`/api/returns/${id}`, { method: 'PATCH', body: { status, adminNote } })
