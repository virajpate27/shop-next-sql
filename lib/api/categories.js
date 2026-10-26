import { http } from './_http'
export const getCategories = () => http('/api/categories').then((d) => d.categories)
export const createCategory = (data) => http('/api/categories', { method: 'POST', body: data }).then((d) => d.id)
export const updateCategory = (id, data) => http(`/api/categories/${id}`, { method: 'PUT', body: data })
export const deleteCategory = (id) => http(`/api/categories/${id}`, { method: 'DELETE' })
