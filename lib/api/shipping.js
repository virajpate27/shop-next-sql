import { http } from './_http'
export { DEFAULT_SHIPPING, calculateShipping } from '@/lib/shipping'
import { DEFAULT_SHIPPING } from '@/lib/shipping'
export const getShippingConfig = () => http('/api/settings/shipping').then((d) => ({ ...DEFAULT_SHIPPING, ...d.config }))
export const saveShippingConfig = (config) => http('/api/settings/shipping', { method: 'PUT', body: config })
