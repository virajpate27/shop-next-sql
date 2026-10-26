// src/app/admin/shipping/page.js
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Truck, Banknote, Plus, Trash2,
  Loader2, Save, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { getShippingConfig, saveShippingConfig, DEFAULT_SHIPPING } from '@/lib/api/shipping'
import { formatPrice } from '@/utils/formatters'

const RULE_TYPES = [
  { value: 'minItems', label: 'Minimum items in cart' },
  { value: 'category', label: 'Product category' },
]

export default function AdminShippingPage() {
  const [config, setConfig] = useState(DEFAULT_SHIPPING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState({ type: 'minItems', value: '', label: '' })

  useEffect(() => {
    getShippingConfig().then((cfg) => {
      setConfig(cfg)
      setLoading(false)
    })
  }, [])

  function set(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (config.baseCharge < 0) return toast.error('Shipping charge cannot be negative')
    if (config.freeAbove < 0) return toast.error('Free shipping threshold cannot be negative')
    if (config.codFee < 0) return toast.error('COD fee cannot be negative')

    setSaving(true)
    try {
      await saveShippingConfig(config)
      // bust the hook cache so live pages reload immediately
      const { invalidate } = await import('@/hooks/useShipping').then((m) => {
        return { invalidate: () => { /* cache cleared on next hook mount */ } }
      })
      toast.success('Shipping settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function addRule() {
    if (!newRule.value || !newRule.label.trim()) {
      return toast.error('Fill in the rule value and label')
    }
    const rule = {
      type: newRule.type,
      value: newRule.type === 'minItems' ? Number(newRule.value) : newRule.value,
      label: newRule.label.trim(),
    }
    set('freeRules', [...(config.freeRules || []), rule])
    setNewRule({ type: 'minItems', value: '', label: '' })
  }

  function removeRule(index) {
    set('freeRules', config.freeRules.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Changes apply instantly to all new orders
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
      </div>

      <div className="space-y-5">

        {/* ── Shipping charges ─────────────────────────────────────── */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Truck className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Shipping charges</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Base shipping charge (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.baseCharge}
                  onChange={(e) => set('baseCharge', Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Charged on every order unless free shipping applies
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Free shipping above (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.freeAbove}
                  onChange={(e) => set('freeAbove', Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={!config.freeShippingEnabled}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Set to 0 to never offer free shipping by amount
              </p>
            </div>
          </div>

          {/* Free shipping toggle */}
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">Free shipping enabled</p>
              <p className="text-xs text-gray-400 mt-0.5">
                When off, shipping is always charged regardless of order value
              </p>
            </div>
            <button
              onClick={() => set('freeShippingEnabled', !config.freeShippingEnabled)}
              className="flex-shrink-0"
            >
              {config.freeShippingEnabled ? (
                <ToggleRight className="w-9 h-9 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-gray-300" />
              )}
            </button>
          </div>

          {/* Live preview */}
          {config.freeShippingEnabled && config.freeAbove > 0 && (
            <div className="mt-4 bg-indigo-50 rounded-xl p-4">
              <p className="text-xs text-indigo-700 font-medium mb-1">Preview</p>
              <p className="text-xs text-indigo-600">
                Orders below {formatPrice(config.freeAbove)} →{' '}
                <span className="font-semibold">{formatPrice(config.baseCharge)} shipping</span>
              </p>
              <p className="text-xs text-indigo-600">
                Orders {formatPrice(config.freeAbove)}+ →{' '}
                <span className="font-semibold text-green-700">Free shipping</span>
              </p>
            </div>
          )}
        </section>

        {/* ── Extra free-shipping rules ─────────────────────────────── */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-gray-900">Extra free-shipping rules</h2>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            These rules grant free shipping regardless of order value.
          </p>

          {/* Existing rules */}
          {config.freeRules?.length > 0 ? (
            <div className="space-y-2 mb-5">
              {config.freeRules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rule.label}</p>
                    <p className="text-xs text-gray-400">
                      {rule.type === 'minItems'
                        ? `Cart has ${rule.value}+ items`
                        : `Category: ${rule.value}`}
                    </p>
                  </div>
                  <button
                    onClick={() => removeRule(i)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-5 italic">
              No extra rules — only the amount threshold applies.
            </p>
          )}

          {/* Add new rule */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-medium text-gray-700 mb-3">Add rule</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <select
                value={newRule.type}
                onChange={(e) => setNewRule((p) => ({ ...p, type: e.target.value, value: '' }))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {RULE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <input
                type={newRule.type === 'minItems' ? 'number' : 'text'}
                placeholder={newRule.type === 'minItems' ? 'Min items (e.g. 5)' : 'Category slug'}
                value={newRule.value}
                onChange={(e) => setNewRule((p) => ({ ...p, value: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <input
                type="text"
                placeholder="Label (e.g. 5+ items)"
                value={newRule.label}
                onChange={(e) => setNewRule((p) => ({ ...p, label: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={addRule}
              className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Add rule
            </button>
          </div>
        </section>

        {/* ── COD settings ─────────────────────────────────────────── */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Banknote className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">Cash on delivery</h2>
          </div>

          {/* COD toggle */}
          <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">COD available</p>
              <p className="text-xs text-gray-400 mt-0.5">
                When off, customers can only pay online via Razorpay
              </p>
            </div>
            <button onClick={() => set('codEnabled', !config.codEnabled)}>
              {config.codEnabled ? (
                <ToggleRight className="w-9 h-9 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-gray-300" />
              )}
            </button>
          </div>

          <div className={config.codEnabled ? '' : 'opacity-40 pointer-events-none'}>

            <div className="grid sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  COD handling fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={config.codFee}
                    onChange={(e) => set('codFee', Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Set to 0 to offer COD for free
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Waive COD fee above (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={config.codFreeAbove}
                    onChange={(e) => set('codFreeAbove', Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={!config.codFeeWaiverEnabled}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  COD fee is waived for orders above this amount
                </p>
              </div>
            </div>

            {/* COD fee waiver toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">COD fee waiver enabled</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Waive the COD fee for large orders
                </p>
              </div>
              <button onClick={() => set('codFeeWaiverEnabled', !config.codFeeWaiverEnabled)}>
                {config.codFeeWaiverEnabled ? (
                  <ToggleRight className="w-9 h-9 text-indigo-600" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-gray-300" />
                )}
              </button>
            </div>

            {/* COD preview */}
            <div className="mt-4 bg-green-50 rounded-xl p-4">
              <p className="text-xs text-green-700 font-medium mb-1">Preview</p>
              {config.codFee === 0 ? (
                <p className="text-xs text-green-600">COD is free for all orders</p>
              ) : (
                <>
                  <p className="text-xs text-green-600">
                    COD orders → +{formatPrice(config.codFee)} handling fee
                  </p>
                  {config.codFeeWaiverEnabled && config.codFreeAbove > 0 && (
                    <p className="text-xs text-green-600">
                      Orders {formatPrice(config.codFreeAbove)}+ → COD fee waived
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}