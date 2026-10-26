// src/app/admin/coupons/page.js
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, X, Loader2,
  Tag, ToggleLeft, ToggleRight, Copy,
} from 'lucide-react'
import {
  getCoupons, createCoupon, updateCoupon,
  deleteCoupon, toggleCoupon,
} from '@/lib/api/coupons'
import { formatPrice, formatDate } from '@/utils/formatters'

const DISCOUNT_TYPES = [
  { value: 'flat',         label: 'Flat discount', example: 'e.g. ₹100 off' },
  { value: 'percent',      label: 'Percentage',    example: 'e.g. 20% off' },
  { value: 'free_shipping', label: 'Free shipping', example: 'Waives shipping fee' },
]

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'flat',
  discountValue: '',
  maxDiscount: '',   // cap for percent coupons
  minOrder: '',
  maxUses: '',
  expiresAt: '',
  isActive: true,
}

export default function AdminCouponsPage() {
  const [coupons,     setCoupons]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [deletingId,  setDeletingId]  = useState(null)
  const [togglingId,  setTogglingId]  = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setCoupons(await getCoupons())
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(coupon) {
    setEditing(coupon)
    setForm({
      code:          coupon.code || '',
      description:   coupon.description || '',
      discountType:  coupon.discountType || 'flat',
      discountValue: coupon.discountValue ?? '',
      maxDiscount:   coupon.maxDiscount ?? '',
      minOrder:      coupon.minOrder ?? '',
      maxUses:       coupon.maxUses ?? '',
      expiresAt:     coupon.expiresAt
        ? new Date(coupon.expiresAt)
            .toISOString().slice(0, 10)
        : '',
      isActive:      coupon.isActive ?? true,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.code.trim())        return toast.error('Coupon code is required')
    if (form.discountType !== 'free_shipping' && !form.discountValue) {
      return toast.error('Discount value is required')
    }
    if (form.discountType === 'percent' && Number(form.discountValue) > 100) {
      return toast.error('Percentage cannot exceed 100%')
    }

    setSaving(true)
    try {
      const data = {
        code:          form.code.toUpperCase().trim(),
        description:   form.description.trim(),
        discountType:  form.discountType,
        discountValue: form.discountType !== 'free_shipping' ? Number(form.discountValue) : 0,
        maxDiscount:   form.discountType === 'percent' && form.maxDiscount
          ? Number(form.maxDiscount) : 0,
        minOrder:      form.minOrder ? Number(form.minOrder) : 0,
        maxUses:       form.maxUses  ? Number(form.maxUses)  : 0,
        expiresAt:     form.expiresAt ? new Date(form.expiresAt) : null,
        isActive:      form.isActive,
      }

      if (editing) {
        await updateCoupon(editing.id, data)
        toast.success('Coupon updated')
      } else {
        await createCoupon(data)
        toast.success('Coupon created')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return
    setDeletingId(coupon.id)
    try {
      await deleteCoupon(coupon.id)
      toast.success('Coupon deleted')
      load()
    } catch {
      toast.error('Failed to delete coupon')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggle(coupon) {
    setTogglingId(coupon.id)
    try {
      await toggleCoupon(coupon.id, !coupon.isActive)
      toast.success(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'}`)
      load()
    } catch {
      toast.error('Failed to toggle coupon')
    } finally {
      setTogglingId(null)
    }
  }

  function copyCouponCode(code) {
    navigator.clipboard.writeText(code)
    toast.success(`Copied "${code}"`)
  }

  function getDiscountLabel(coupon) {
    if (coupon.discountType === 'free_shipping') return 'Free shipping'
    if (coupon.discountType === 'percent') {
      const label = `${coupon.discountValue}% off`
      return coupon.maxDiscount > 0 ? `${label} (max ₹${coupon.maxDiscount})` : label
    }
    return `₹${coupon.discountValue} off`
  }

  function isExpired(coupon) {
    if (!coupon.expiresAt) return false
    const exp = new Date(coupon.expiresAt)
    return new Date() > exp
  }

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-400 mt-0.5">{coupons.length} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create coupon
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20">
          <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No coupons yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first coupon to start offering discounts</p>
          <button
            onClick={openCreate}
            className="mt-4 bg-indigo-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Create coupon
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Code', 'Discount', 'Min order', 'Usage', 'Expiry', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((coupon) => {
                const expired = isExpired(coupon)
                return (
                  <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">

                    {/* Code */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-gray-900 tracking-wider">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => copyCouponCode(coupon.code)}
                          className="p-1 text-gray-300 hover:text-indigo-500 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{coupon.description}</p>
                      )}
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                        coupon.discountType === 'free_shipping'
                          ? 'bg-blue-50 text-blue-700'
                          : coupon.discountType === 'percent'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {getDiscountLabel(coupon)}
                      </span>
                    </td>

                    {/* Min order */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {coupon.minOrder > 0 ? formatPrice(coupon.minOrder) : '—'}
                    </td>

                    {/* Usage */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {coupon.usedCount || 0}
                      {coupon.maxUses > 0 && (
                        <span className="text-gray-300"> / {coupon.maxUses}</span>
                      )}
                    </td>

                    {/* Expiry */}
                    <td className="px-4 py-3 text-sm">
                      {coupon.expiresAt ? (
                        <span className={expired ? 'text-red-500' : 'text-gray-500'}>
                          {formatDate(coupon.expiresAt)}
                          {expired && ' (expired)'}
                        </span>
                      ) : (
                        <span className="text-gray-300">Never</span>
                      )}
                    </td>

                    {/* Status toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(coupon)}
                        disabled={togglingId === coupon.id || expired}
                        className="disabled:opacity-40"
                      >
                        {togglingId === coupon.id ? (
                          <Loader2 className="w-7 h-7 text-gray-300 animate-spin" />
                        ) : coupon.isActive && !expired ? (
                          <ToggleRight className="w-7 h-7 text-indigo-600" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-gray-300" />
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(coupon)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          disabled={deletingId === coupon.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          {deletingId === coupon.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">

            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {editing ? 'Edit coupon' : 'Create coupon'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Coupon code <span className="text-red-500">*</span>
                </label>
                <input
                  name="code"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SAVE20"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={20}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Customers will type this exactly — keep it short and memorable
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="e.g. Summer sale discount"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Discount type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DISCOUNT_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={`flex flex-col items-center border-2 rounded-xl p-3 cursor-pointer transition-colors text-center ${
                        form.discountType === t.value
                          ? 'border-indigo-500 bg-indigo-50/50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="discountType"
                        value={t.value}
                        checked={form.discountType === t.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-gray-900">{t.label}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{t.example}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Discount value */}
              {form.discountType !== 'free_shipping' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {form.discountType === 'percent' ? 'Percentage (%)' : 'Amount (₹)'}
                      <span className="text-red-500"> *</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        {form.discountType === 'percent' ? '%' : '₹'}
                      </span>
                      <input
                        name="discountValue"
                        type="number"
                        min="0"
                        max={form.discountType === 'percent' ? 100 : undefined}
                        step="0.01"
                        value={form.discountValue}
                        onChange={handleChange}
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Max discount cap for percent coupons */}
                  {form.discountType === 'percent' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Max discount (₹)
                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                        <input
                          name="maxDiscount"
                          type="number"
                          min="0"
                          value={form.maxDiscount}
                          onChange={handleChange}
                          placeholder="No cap"
                          className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Cap the max savings</p>
                    </div>
                  )}
                </div>
              )}

              {/* Conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Minimum order (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input
                      name="minOrder"
                      type="number"
                      min="0"
                      value={form.minOrder}
                      onChange={handleChange}
                      placeholder="0 = no minimum"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Usage limit
                  </label>
                  <input
                    name="maxUses"
                    type="number"
                    min="0"
                    value={form.maxUses}
                    onChange={handleChange}
                    placeholder="0 = unlimited"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Expiry date
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  name="expiresAt"
                  type="date"
                  value={form.expiresAt}
                  onChange={handleChange}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank for no expiry</p>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Coupon is active (customers can use it)
                </span>
              </label>

              {/* Preview */}
              {form.discountType !== 'free_shipping' && form.discountValue && (
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">Preview</p>
                  <p className="text-xs text-indigo-600">
                    Code <span className="font-mono font-bold">{form.code || 'CODE'}</span>:{' '}
                    {form.discountType === 'percent'
                      ? `${form.discountValue}% off${form.maxDiscount ? ` (max ₹${form.maxDiscount})` : ''}`
                      : `₹${form.discountValue} off`}
                    {form.minOrder > 0 && ` on orders above ₹${form.minOrder}`}
                    {form.maxUses > 0 && ` · ${form.maxUses} uses max`}
                    {form.expiresAt && ` · expires ${form.expiresAt}`}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
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
                  {editing ? 'Save changes' : 'Create coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}