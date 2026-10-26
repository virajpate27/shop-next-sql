// src/app/admin/categories/page.js
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, X, Loader2, Tag,
} from 'lucide-react'
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/api/categories'
import { useCategories } from '@/hooks/useCategories'

const EMOJIS = [
  '📱', '👗', '🏠', '⚽', '📚', '💄', '🎮', '🍳',
  '🚗', '💊', '🎵', '🌿', '🐾', '✈️', '🔧', '🎨',
]

const EMPTY_FORM = { name: '', emoji: '📦', description: '' }

export default function AdminCategoriesPage() {
  const { categories, loading, invalidate } = useCategories()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(cat) {
    setEditing(cat)
    setForm({
      name: cat.name,
      emoji: cat.emoji || '📦',
      description: cat.description || '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Category name is required')

    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing.id, form)
        toast.success('Category updated')
      } else {
        await createCategory(form)
        toast.success('Category created')
      }
      invalidate()
      closeModal()
    } catch {
      toast.error('Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete "${cat.name}"? Products in this category won't be affected.`)) return
    setDeletingId(cat.id)
    try {
      await deleteCategory(cat.id)
      toast.success('Category deleted')
      invalidate()
    } catch {
      toast.error('Failed to delete category')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-400 mt-0.5">{categories.length} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add category
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="h-4 bg-gray-100 rounded w-28" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20">
          <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No categories yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Create your first category to organise products
          </p>
          <button
            onClick={openCreate}
            className="mt-4 bg-indigo-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Add category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {cat.emoji || '📦'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{cat.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={deletingId === cat.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {deletingId === cat.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {cat.description && (
                <p className="text-sm text-gray-500 mt-3 leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {editing ? 'Edit category' : 'Add new category'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Emoji picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, emoji }))}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        form.emoji === emoji
                          ? 'bg-indigo-100 ring-2 ring-indigo-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Selected: {form.emoji}
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Electronics"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                {form.name && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    slug: {form.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Briefly describe this category..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Save changes' : 'Create category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}