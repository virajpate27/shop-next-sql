// src/utils/variations.js

/**
 * Product variation structure stored in the database (products.variants JSON):
 *
 * product.variationTypes = [
 *   { id: 'vt1', name: 'Size',  displayType: 'button', options: [
 *       { id: 'o1', label: 'S', value: 's' },
 *       { id: 'o2', label: 'M', value: 'm' },
 *   ]},
 *   { id: 'vt2', name: 'Color', displayType: 'color', options: [
 *       { id: 'o3', label: 'Red',  value: 'red',  hex: '#ef4444' },
 *       { id: 'o4', label: 'Blue', value: 'blue', hex: '#3b82f6' },
 *   ]},
 * ]
 *
 * product.variants = [
 *   { id: 'var1', combination: { vt1: 'o1', vt2: 'o3' },
 *     combinationKey: 'o1-o3', sku: 'PROD-S-RED',
 *     price: 999, stock: 10, image: '' },
 *   ...
 * ]
 */

export const DISPLAY_TYPES = [
  { value: 'button', label: 'Button (text)' },
  { value: 'color',  label: 'Color swatch' },
  { value: 'image',  label: 'Image swatch' },
]

/** Generate a unique short ID */
export function uid() {
  return Math.random().toString(36).slice(2, 8)
}

/**
 * Generate the Cartesian product of all variation type options.
 * e.g. [S,M] × [Red,Blue] → [S-Red, S-Blue, M-Red, M-Blue]
 */
export function generateVariants(variationTypes, existingVariants = []) {
  if (!variationTypes?.length) return []

  // Build option arrays per type
  const pools = variationTypes.map((vt) =>
    vt.options.map((opt) => ({ typeId: vt.id, optionId: opt.id }))
  )

  // Cartesian product
  const combinations = pools.reduce(
    (acc, pool) =>
      acc.flatMap((combo) => pool.map((opt) => [...combo, opt])),
    [[]]
  )

  return combinations.map((combo) => {
    const combination = {}
    combo.forEach(({ typeId, optionId }) => {
      combination[typeId] = optionId
    })
    const combinationKey = combo.map((c) => c.optionId).join('-')

    // Preserve existing variant data if the combination already existed
    const existing = existingVariants.find((v) => v.combinationKey === combinationKey)

    return existing || {
      id:             uid(),
      combination,
      combinationKey,
      sku:            '',
      price:          '',
      stock:          0,
      image:          '',
    }
  })
}

/**
 * Get the variant that matches a set of selected options.
 * selectedOptions = { typeId: optionId, ... }
 */
export function findVariant(variants, selectedOptions) {
  return variants?.find((v) =>
    Object.entries(selectedOptions).every(
      ([typeId, optionId]) => v.combination?.[typeId] === optionId
    )
  ) || null
}

/**
 * Get the label string for a variant.
 * e.g. "S / Red"
 */
export function getVariantLabel(variant, variationTypes) {
  if (!variant || !variationTypes?.length) return ''
  return variationTypes
    .map((vt) => {
      const optionId = variant.combination?.[vt.id]
      const opt = vt.options?.find((o) => o.id === optionId)
      return opt?.label || ''
    })
    .filter(Boolean)
    .join(' / ')
}

/**
 * Check if an option is available (has stock in any matching variant)
 */
export function isOptionAvailable(variants, selectedOptions, typeId, optionId) {
  return variants?.some((v) => {
    const testSelection = { ...selectedOptions, [typeId]: optionId }
    return (
      Object.entries(testSelection).every(
        ([tid, oid]) => v.combination?.[tid] === oid
      ) && (v.stock > 0)
    )
  }) ?? false
}




/**
 * Build the initial selectedOptions from a product's defaultVariant map.
 * defaultVariant = { [typeId]: optionId, ... }
 * Returns {} if no defaults set.
 */
export function getDefaultSelectedOptions(variationTypes, defaultVariant) {
  if (!defaultVariant || !variationTypes?.length) return {}

  const options = {}
  variationTypes.forEach((vt) => {
    if (defaultVariant[vt.id]) {
      // Verify the optionId still exists in current options
      const exists = vt.options?.find((o) => o.id === defaultVariant[vt.id])
      if (exists) options[vt.id] = defaultVariant[vt.id]
    }
  })
  return options
}