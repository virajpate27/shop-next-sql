// src/components/products/VariationSelector.js
'use client'
import Image from 'next/image'
import { isOptionAvailable } from '@/utils/variations'

export function VariationSelector({ variationTypes, variants, selectedOptions, onChange }) {
  if (!variationTypes?.length) return null

  function handleSelect(typeId, optionId) {
    onChange({ ...selectedOptions, [typeId]: optionId })
  }

  return (
    <div className="space-y-5">
      {variationTypes.map((vType) => {
        const selectedOptionId = selectedOptions?.[vType.id]
        const selectedOption   = vType.options?.find((o) => o.id === selectedOptionId)

        return (
          <div key={vType.id}>

            {/* Type label */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-sm font-semibold text-gray-900">{vType.name}</span>
              {selectedOption && (
                <span className="text-sm text-gray-500">: {selectedOption.label}</span>
              )}
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-2.5">
              {vType.options?.map((opt) => {
                const selected   = selectedOptionId === opt.id
                const available  = isOptionAvailable(variants, selectedOptions, vType.id, opt.id)

                // ── Color swatch ─────────────────────────────────
                if (vType.displayType === 'color') {
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => available && handleSelect(vType.id, opt.id)}
                      title={opt.label}
                      disabled={!available}
                      className={`relative w-9 h-9 rounded-full border-2 transition-all ${
                        selected
                          ? 'border-indigo-600 scale-110 shadow-md'
                          : available
                          ? 'border-gray-300 hover:border-gray-500 hover:scale-105'
                          : 'border-gray-200 opacity-40 cursor-not-allowed'
                      }`}
                      style={{ backgroundColor: opt.hex || '#ccc' }}
                    >
                      {/* Checkmark when selected */}
                      {selected && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white drop-shadow"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      {/* Strikethrough when unavailable */}
                      {!available && (
                        <span className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
                          <div className="w-full h-0.5 bg-gray-400 rotate-45 opacity-70" />
                        </span>
                      )}
                    </button>
                  )
                }

                // ── Image swatch ──────────────────────────────────
                if (vType.displayType === 'image') {
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => available && handleSelect(vType.id, opt.id)}
                      title={opt.label}
                      disabled={!available}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        selected
                          ? 'border-indigo-600 shadow-md ring-2 ring-indigo-200'
                          : available
                          ? 'border-gray-200 hover:border-indigo-400 hover:shadow-sm'
                          : 'border-gray-100 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      {opt.image ? (
                        <Image
                          src={opt.image}
                          alt={opt.label}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        /* Fallback if image not uploaded yet */
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-[10px] text-gray-400 font-medium text-center px-1 leading-tight">
                            {opt.label}
                          </span>
                        </div>
                      )}

                      {/* Selected overlay */}
                      {selected && (
                        <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                          <div className="bg-indigo-600 rounded-full p-0.5">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* Unavailable overlay */}
                      {!available && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-gray-400 rotate-45 opacity-60" />
                        </div>
                      )}

                      {/* Label tooltip on hover */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5">
                        <p className="text-[9px] text-white text-center font-medium truncate px-1">
                          {opt.label}
                        </p>
                      </div>
                    </button>
                  )
                }

                // ── Default: text button ──────────────────────────
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => available && handleSelect(vType.id, opt.id)}
                    disabled={!available}
                    className={`relative px-3.5 py-1.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : available
                        ? 'border-gray-200 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600'
                        : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}