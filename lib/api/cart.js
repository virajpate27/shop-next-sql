import { http } from './_http'
export const saveCart = (cart) => http('/api/cart', { method: 'PUT', body: cart })
export const loadCart = () => http('/api/cart').then((d) => d.cart)
