// src/app/(shop)/products/[slug]/ProductDetailClient.js
'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingCart, Star, Truck, Shield,
  RefreshCw, Minus, Plus, Heart,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cartStore'
import { useWishlist } from '@/hooks/useWishlist'
import { ProductCard } from '@/components/products/ProductCard'
import { ReviewSection } from '@/components/products/ReviewSection'
import { TaxBadge } from '@/components/products/TaxBadge'
import { VariationSelector } from '@/components/products/VariationSelector'
import { formatPrice, getDiscountPercent } from '@/utils/formatters'
import { calculateTax } from '@/utils/tax'
import { getOptimizedUrl } from '@/lib/cloudinary'
import { findVariant, getVariantLabel, getDefaultSelectedOptions } from '@/utils/variations'


export function ProductDetailClient({ product, related }) {
  const addItem = useCartStore((s) => s.addItem)
  const { toggle, isWishlisted } = useWishlist()

  const [selectedOptions, setSelectedOptions] = useState(() =>
  getDefaultSelectedOptions(product.variationTypes, product.defaultVariant)
)
  const [selectedImage,   setSelectedImage]   = useState(0)
  const [quantity,        setQuantity]        = useState(1)

  const hasVariations = product.hasVariations && product.variationTypes?.length > 0

  const selectedVariant = hasVariations
    ? findVariant(product.variants, selectedOptions)
    : null

  const effectivePrice = selectedVariant?.price || product.price
  const effectiveStock = hasVariations
    ? (selectedVariant?.stock ?? 0)
    : product.stock

  const allSelected = hasVariations
    ? product.variationTypes.every((vt) => selectedOptions[vt.id])
    : true

  // ── Gallery logic ───────────────────────────────────────────────────
  // Priority: variant images → product images → empty
  const variantImages   = selectedVariant?.images?.length
    ? selectedVariant.images
    : null
  const galleryImages   = variantImages || product.images || []

  // Reset selected image index when gallery source changes
  useEffect(() => {
    setSelectedImage(0)
  }, [selectedVariant?.id])

  const activeImage = galleryImages[selectedImage] || galleryImages[0] || ''

  const discount   = getDiscountPercent(effectivePrice, product.comparePrice)
  const taxDetails = calculateTax(effectivePrice, product.taxRate || 0, product.taxType || 'inclusive', 1)
  const saved      = isWishlisted(product.id)

  function handleAddToCart() {
    if (hasVariations && !allSelected) {
      toast.error('Please select all options before adding to cart')
      return
    }
    if (effectiveStock === 0) return

    const variantLabel = hasVariations
      ? getVariantLabel(selectedVariant, product.variationTypes)
      : ''

    addItem({
      productId:       product.id,
      name:            product.name,
      variantId:       selectedVariant?.id      || null,
      variantLabel:    variantLabel              || null,
      selectedOptions: hasVariations ? selectedOptions : null,
      price:           effectivePrice,
      image:           activeImage,
      stock:           effectiveStock,
      taxRate:         product.taxRate           || 0,
      taxType:         product.taxType           || 'inclusive',
      category:        product.category          || '',
      slug:            product.slug              || '',
    })

    toast.success(
      variantLabel
        ? `${product.name} (${variantLabel}) added to cart`
        : `${product.name} added to cart`
    )
  }

  function handleVariationChange(newOptions) {
    setSelectedOptions(newOptions)
    // Reset quantity when variant changes
    setQuantity(1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Link href="/" className="hover:text-gray-600">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-gray-600">Products</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category}`} className="hover:text-gray-600 capitalize">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 mb-16">

        {/* ── Gallery ──────────────────────────────────────────────── */}
        <div>

          {/* Main image */}
          <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4">
            {activeImage ? (
              <Image
                key={activeImage}   // key forces re-render on image change
                src={getOptimizedUrl(activeImage, { width: 800, height: 800 })}
                alt={product.name}
                fill
                className="object-cover transition-opacity duration-200"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-200">
                <ShoppingCart className="w-16 h-16" />
              </div>
            )}

            {/* Discount badge */}
            {discount && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                -{discount}% OFF
              </div>
            )}

            {/* Variant image indicator */}
            {variantImages && selectedVariant && (
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full">
                {getVariantLabel(selectedVariant, product.variationTypes)}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {galleryImages.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === i
                      ? 'border-indigo-500 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={getOptimizedUrl(img, { width: 160, height: 160 })}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Gallery source indicator */}
          {hasVariations && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              {variantImages
                ? `Showing ${galleryImages.length} image${galleryImages.length !== 1 ? 's' : ''} for selected variant`
                : 'Select a variant to see its images'}
            </p>
          )}
        </div>

        {/* ── Info ────────────────────────────────────────────────── */}
        <div>
          <p className="text-sm text-indigo-600 font-medium uppercase tracking-wide mb-2">
            {product.category}
          </p>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(product.rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {product.rating?.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">
                ({product.reviewCount} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatPrice(effectivePrice)}
            </span>
            {product.comparePrice > effectivePrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
            {discount && (
              <span className="bg-green-50 text-green-700 text-sm font-semibold px-2.5 py-0.5 rounded-lg">
                Save {formatPrice(product.comparePrice - effectivePrice)}
              </span>
            )}
          </div>

          {/* Tax */}
          <div className="flex items-center gap-2 mb-5">
            {product.taxRate > 0 ? (
              <>
                <TaxBadge taxRate={product.taxRate} taxType={product.taxType} />
                {product.taxType === 'inclusive' ? (
                  <span className="text-xs text-gray-400">
                    Incl. {formatPrice(taxDetails.taxAmount)} GST
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">
                    +{formatPrice(taxDetails.taxAmount)} GST → Total {formatPrice(taxDetails.totalPrice)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">No tax applicable</span>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

          {/* ── Variation selector ─────────────────────────────────── */}
          {hasVariations && (
            <div className="mb-6">
              <VariationSelector
                variationTypes={product.variationTypes}
                variants={product.variants}
                selectedOptions={selectedOptions}
                onChange={handleVariationChange}
              />

              {allSelected && selectedVariant && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {getVariantLabel(selectedVariant, product.variationTypes)}
                  </span>
                  {selectedVariant.sku && (
                    <span className="text-xs text-gray-400 font-mono">
                      SKU: {selectedVariant.sku}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map((tag) => (
                <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stock */}
          <div className="mb-6">
            {hasVariations && !allSelected ? (
              <p className="text-sm text-gray-400">Select options to see availability</p>
            ) : effectiveStock > 0 ? (
              <p className="text-sm text-green-600 font-medium">
                ✓ In stock
                {effectiveStock <= 10 && (
                  <span className="text-orange-500 ml-2">— only {effectiveStock} left!</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-red-500 font-medium">✕ Out of stock</p>
            )}
          </div>

          {/* Qty + cart */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-gray-50 transition-colors"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <span className="w-12 text-center text-sm font-semibold text-gray-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                disabled={quantity >= effectiveStock}
                className="p-3 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={effectiveStock === 0 || (hasVariations && !allSelected)}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              {hasVariations && !allSelected ? 'Select options' : 'Add to cart'}
            </button>

            <button
              onClick={() => toggle(product.id)}
              className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${
                  saved ? 'fill-red-500 text-red-500' : 'text-gray-500'
                }`}
              />
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 py-4 border-t border-gray-100">
            {[
              { icon: Truck,     text: 'Free delivery above ₹499' },
              { icon: Shield,    text: 'Secure Razorpay payment'  },
              { icon: RefreshCw, text: '7-day easy returns'       },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                <Icon className="w-5 h-5 text-indigo-500" />
                <span className="text-xs text-gray-500 leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related */}
      {related?.length > 0 && (
        <section className="mb-16">
          <h2 className="text-xl font-bold text-gray-900 mb-6">You might also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Reviews */}
      <ReviewSection productId={product.id} productName={product.name} />
    </div>
  )
}