// src/components/admin/VariationBuilder.js
'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import {
  Plus, Trash2, RefreshCw, ChevronDown,
  ChevronUp, Upload, Loader2, Images,
} from 'lucide-react'
import { uid, DISPLAY_TYPES, generateVariants } from '@/utils/variations'
import { uploadImage } from '@/lib/cloudinary'

export function VariationBuilder({
  variationTypes, setVariationTypes,
  variants, setVariants,
  basePrice,
  defaultVariant, setDefaultVariant,
}) {
  const [expandedType,     setExpandedType]     = useState(null)
  const [expandedVariant,  setExpandedVariant]  = useState(null)
  const [uploadingId,      setUploadingId]       = useState(null) // optionId or variantId
  const optionFileRefs  = useRef({})
  const variantFileRefs = useRef({})

  // ── Variation type actions ──────────────────────────────────────────
  function addType() {
    const t = { id: uid(), name: '', displayType: 'button', options: [] }
    setVariationTypes((prev) => [...prev, t])
    setExpandedType(t.id)
  }

  function updateType(typeId, field, value) {
    setVariationTypes((prev) =>
      prev.map((t) => t.id === typeId ? { ...t, [field]: value } : t)
    )
  }

  function removeType(typeId) {
    const updated = variationTypes.filter((t) => t.id !== typeId)
    setVariationTypes(updated)
    regenerateVariants(updated)
  }

  // ── Option actions ──────────────────────────────────────────────────
  function addOption(typeId) {
    setVariationTypes((prev) =>
      prev.map((t) =>
        t.id === typeId
          ? { ...t, options: [...t.options, { id: uid(), label: '', value: '', hex: '', image: '' }] }
          : t
      )
    )
  }

  function updateOption(typeId, optionId, field, value) {
    setVariationTypes((prev) =>
      prev.map((t) =>
        t.id === typeId
          ? { ...t, options: t.options.map((o) => o.id === optionId ? { ...o, [field]: value } : o) }
          : t
      )
    )
  }

  function removeOption(typeId, optionId) {
    const updated = variationTypes.map((t) =>
      t.id === typeId
        ? { ...t, options: t.options.filter((o) => o.id !== optionId) }
        : t
    )
    setVariationTypes(updated)
    regenerateVariants(updated)
  }

  // ── Option image upload (for image swatch type) ─────────────────────
  async function handleOptionImageUpload(typeId, optionId, file) {
    if (!file) return
    setUploadingId(optionId)
    try {
      const url = await uploadImage(file, 'shopnext/variations')
      updateOption(typeId, optionId, 'image', url)
    } catch {
      alert('Image upload failed. Please try again.')
    } finally {
      setUploadingId(null)
    }
  }

  // ── Variant image actions ───────────────────────────────────────────
  async function handleVariantImageUpload(variantId, file) {
    if (!file) return
    setUploadingId(`variant-${variantId}`)
    try {
      const url = await uploadImage(file, 'shopnext/variants')
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variantId
            ? { ...v, images: [...(v.images || []), url] }
            : v
        )
      )
    } catch {
      alert('Image upload failed. Please try again.')
    } finally {
      setUploadingId(null)
    }
  }

  function removeVariantImage(variantId, imageIndex) {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, images: (v.images || []).filter((_, i) => i !== imageIndex) }
          : v
      )
    )
  }

  // ── Variant generation ──────────────────────────────────────────────
  function regenerateVariants(types = variationTypes) {
    const valid = types.filter((t) => t.name && t.options.length > 0)
    setVariants(generateVariants(valid, variants))
  }

  function updateVariant(variantId, field, value) {
    setVariants((prev) =>
      prev.map((v) => v.id === variantId ? { ...v, [field]: value } : v)
    )
  }

  // ── Variant label helper ────────────────────────────────────────────
  function getVariantLabel(variant) {
    return variationTypes
      .map((vt) => {
        const opt = vt.options.find((o) => o.id === variant.combination?.[vt.id])
        return opt?.label
      })
      .filter(Boolean)
      .join(' / ')
  }

  return (
    <div className="space-y-4">

      {/* ── Variation types ──────────────────────────────────────── */}
      {variationTypes.map((vType) => (
        <div key={vType.id} className="border border-gray-200 rounded-xl overflow-hidden">

          {/* Type header */}
          <div className="flex items-center gap-3 p-4 bg-gray-50">
            <input
              value={vType.name}
              onChange={(e) => updateType(vType.id, 'name', e.target.value)}
              placeholder="Type name (e.g. Size, Color, Style)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <select
              value={vType.displayType}
              onChange={(e) => updateType(vType.id, 'displayType', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {DISPLAY_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setExpandedType(expandedType === vType.id ? null : vType.id)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {expandedType === vType.id
                ? <ChevronUp className="w-4 h-4 text-gray-500" />
                : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            <button
              type="button"
              onClick={() => removeType(vType.id)}
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Options */}
          {expandedType === vType.id && (
            <div className="p-4 space-y-3">
              {vType.options.map((opt) => (
                <div key={opt.id} className="flex items-start gap-2">

                  {/* Image swatch upload */}
                  {vType.displayType === 'image' && (
                    <div className="flex-shrink-0">
                      <input
                        ref={(el) => { optionFileRefs.current[opt.id] = el }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleOptionImageUpload(vType.id, opt.id, file)
                          e.target.value = ''
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => optionFileRefs.current[opt.id]?.click()}
                        disabled={uploadingId === opt.id}
                        className="relative w-14 h-14 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center overflow-hidden"
                      >
                        {uploadingId === opt.id ? (
                          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                        ) : opt.image ? (
                          <Image src={opt.image} alt={opt.label || 'Swatch'} fill className="object-cover rounded-xl" />
                        ) : (
                          <Upload className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Color picker */}
                  {vType.displayType === 'color' && (
                    <input
                      type="color"
                      value={opt.hex || '#000000'}
                      onChange={(e) => updateOption(vType.id, opt.id, 'hex', e.target.value)}
                      className="w-10 h-10 mt-0.5 border border-gray-200 rounded-lg cursor-pointer p-0.5 flex-shrink-0"
                    />
                  )}

                  <div className="flex flex-1 gap-2">
                    <input
                      value={opt.label}
                      onChange={(e) => updateOption(vType.id, opt.id, 'label', e.target.value)}
                      placeholder="Label (e.g. Red, Small)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      value={opt.value}
                      onChange={(e) => updateOption(vType.id, opt.id, 'value', e.target.value.toLowerCase())}
                      placeholder="Value (e.g. red)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeOption(vType.id, opt.id)}
                    className="p-2 mt-0.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addOption(vType.id)}
                className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add option
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add type + generate */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addType}
          className="flex items-center gap-2 text-sm text-indigo-600 font-medium border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add variation type
        </button>

        {variationTypes.some((t) => t.name && t.options.length > 0) && (
          <button
            type="button"
            onClick={() => regenerateVariants()}
            className="flex items-center gap-2 text-sm text-gray-600 font-medium border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Generate variants
          </button>
        )}
      </div>

      {/* ── Variants table with image upload ─────────────────────── */}
      {variants.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            {variants.length} variant{variants.length !== 1 ? 's' : ''} — set price, stock and images
          </p>

          <div className="space-y-3">
            {variants.map((variant) => {
              const label        = getVariantLabel(variant)
              const isExpanded   = expandedVariant === variant.id
              const variantImages = variant.images || []

              return (
                <div key={variant.id} className="border border-gray-200 rounded-xl overflow-hidden">

                  {/* Variant row */}
                  <div className="grid grid-cols-12 gap-2 items-center p-3 bg-white">

                    {/* Label */}
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
                      {variantImages.length > 0 && (
                        <p className="text-xs text-indigo-600 mt-0.5">
                          {variantImages.length} image{variantImages.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* SKU */}
                    <div className="col-span-3">
                      <input
                        value={variant.sku || ''}
                        onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                        placeholder="SKU"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    {/* Price */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={variant.price || ''}
                        onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                        placeholder={basePrice || '0'}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    {/* Stock */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={variant.stock ?? 0}
                        onChange={(e) => updateVariant(variant.id, 'stock', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    {/* Images toggle */}
                    <div className="col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedVariant(isExpanded ? null : variant.id)}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                          isExpanded
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Images className="w-3.5 h-3.5" />
                        Images
                        {variantImages.length > 0 && (
                          <span className="bg-indigo-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                            {variantImages.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Variant images panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <p className="text-xs font-medium text-gray-600 mb-3">
                        Images for <span className="text-indigo-600">{label}</span>
                        <span className="text-gray-400 ml-1 font-normal">
                          — first image shown in gallery when this variant is selected
                        </span>
                      </p>

                      <div className="flex flex-wrap gap-3">
                        {/* Existing images */}
                        {variantImages.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group"
                          >
                            <Image
                              src={url}
                              alt={`${label} ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                            {/* Cover badge */}
                            {idx === 0 && (
                              <div className="absolute bottom-0 left-0 right-0 bg-indigo-600 py-0.5">
                                <p className="text-[9px] text-white text-center font-medium">Cover</p>
                              </div>
                            )}
                            {/* Delete on hover */}
                            <button
                              type="button"
                              onClick={() => removeVariantImage(variant.id, idx)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex transition-all"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}

                        {/* Upload button */}
                        <div>
                          <input
                            ref={(el) => { variantFileRefs.current[variant.id] = el }}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              files.forEach((file) => handleVariantImageUpload(variant.id, file))
                              e.target.value = ''
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => variantFileRefs.current[variant.id]?.click()}
                            disabled={uploadingId === `variant-${variant.id}`}
                            className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                          >
                            {uploadingId === `variant-${variant.id}` ? (
                              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-4 h-4 text-gray-400" />
                                <span className="text-[10px] text-gray-400 text-center">Add image</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {variantImages.length === 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          No images uploaded — product images will be used as fallback.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-3 pt-2">
            {[
              { col: 'col-span-3', label: 'Variant' },
              { col: 'col-span-3', label: 'SKU' },
              { col: 'col-span-2', label: 'Price (₹)' },
              { col: 'col-span-2', label: 'Stock' },
              { col: 'col-span-2', label: '' },
            ].map(({ col, label }) => (
              <div key={label} className={`${col}`}>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Default variation selector ───────────────────────────── */}
{variants.length > 0 && (
  <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-2 h-2 bg-indigo-600 rounded-full" />
      <p className="text-sm font-medium text-gray-700">
        Default selected variation
      </p>
      <span className="text-xs text-gray-400">
        (pre-selected when customer opens the product)
      </span>
    </div>

    <div className="space-y-3">
      {variationTypes.map((vType) => {
        const currentDefault = defaultVariant?.[vType.id] || ''

        return (
          <div key={vType.id} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-24 flex-shrink-0 font-medium">
              {vType.name}
            </span>
            <div className="flex flex-wrap gap-2">
              {/* None option */}
              <button
                type="button"
                onClick={() =>
                  setDefaultVariant((prev) => {
                    const updated = { ...prev }
                    delete updated[vType.id]
                    return updated
                  })
                }
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  !currentDefault
                    ? 'border-gray-400 bg-gray-100 text-gray-700'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                None
              </button>

              {/* Each option */}
              {vType.options.map((opt) => {
                const isDefault = currentDefault === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setDefaultVariant((prev) => ({
                        ...prev,
                        [vType.id]: opt.id,
                      }))
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isDefault
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {/* Color dot for color type */}
                    {vType.displayType === 'color' && opt.hex && (
                      <span
                        className="w-3 h-3 rounded-full border border-white/50 flex-shrink-0"
                        style={{ backgroundColor: opt.hex }}
                      />
                    )}
                    {opt.label}
                    {isDefault && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>

    {/* Preview */}
    {defaultVariant && Object.keys(defaultVariant).length > 0 && (
      <div className="mt-3 pt-3 border-t border-indigo-100">
        <p className="text-xs text-indigo-600">
          <span className="font-medium">Default:</span>{' '}
          {variationTypes
            .map((vt) => {
              const optId = defaultVariant[vt.id]
              if (!optId) return null
              const opt = vt.options.find((o) => o.id === optId)
              return opt ? `${vt.name}: ${opt.label}` : null
            })
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    )}
  </div>
)}
    </div>
  )
}