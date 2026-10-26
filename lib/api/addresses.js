import { http } from './_http'
export const getAddresses = (_userId) => http('/api/addresses').then((d) => d.addresses)
export const addAddress = (_userId, address) => http('/api/addresses', { method: 'POST', body: address }).then((d) => d.address)
export const removeAddress = (_userId, address) => http(`/api/addresses/${address.id}`, { method: 'DELETE' })
export const updateAddresses = (_userId, addresses) => http('/api/addresses', { method: 'PUT', body: { addresses } }).then((d) => d.addresses)
