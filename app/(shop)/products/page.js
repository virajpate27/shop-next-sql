// src/app/(shop)/products/page.js
'use client'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { getProducts } from '@/lib/api/products'
import { useCategories } from '@/hooks/useCategories'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductGridSkeleton } from '@/components/products/ProductSkeleton'

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'popular',    label: 'Most popular' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

const PAGE_SIZE = 12

// ── Inner component — uses useSearchParams safely inside Suspense ──────────
function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { categories } = useCategories()

  const [products,     setProducts]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [offset,       setOffset]       = useState(0)
  const [hasMore,      setHasMore]      = useState(false)
  const [totalShowing, setTotalShowing] = useState(0)

  const category = searchParams.get('category') || ''
  const sortBy   = searchParams.get('sort')     || 'newest'
  const search   = searchParams.get('search')   || ''

  // Initial / filter-change fetch
  useEffect(() => {
    let cancelled = false

    async function fetchFirst() {
      setLoading(true)
      setProducts([])
      setOffset(0)

      try {
        const result = await getProducts({
          category: category || null,
          search:   search   || null,
          sortBy,
          pageSize: PAGE_SIZE,
          lastDoc:  0,
        })

        if (!cancelled) {
          setProducts(result.products)
          setOffset(result.lastVisible)
          setHasMore(result.hasMore)
          setTotalShowing(result.products.length)
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchFirst()
    return () => { cancelled = true }
  }, [category, sortBy, search])

  // Load more
  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    try {
      const result = await getProducts({
        category: category || null,
        search:   search   || null,
        sortBy,
        pageSize: PAGE_SIZE,
        lastDoc:  offset,
      })

      setProducts((prev) => [...prev, ...result.products])
      setOffset(result.lastVisible)
      setHasMore(result.hasMore)
      setTotalShowing((prev) => prev + result.products.length)
    } catch (err) {
      console.error('Load more failed:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  // URL helpers
  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/products?${params.toString()}`)
  }

  function clearFilters() {
    router.push('/products')
  }

  const activeFiltersCount = [category, search].filter(Boolean).length

  const pageTitle = search
    ? `Results for "${search}"`
    : category
    ? (categories.find((c) => c.slug === category)?.name ?? 'Products')
    : 'All Products'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        {!loading && (
          <p className="text-sm text-gray-400 mt-1">
            Showing {totalShowing} product{totalShowing !== 1 ? 's' : ''}
            {hasMore ? '+' : ''}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">

        {/* Category pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => updateParam('category', '')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !category
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => updateParam('category', cat.slug)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat.slug
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.emoji && <span className="mr-1.5">{cat.emoji}</span>}
              {cat.name}
            </button>
          ))}
        </div>

        {/* Right side — clear + sort */}
        <div className="flex items-center gap-3">
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-9 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active search tag */}
      {search && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm text-gray-500">Search:</span>
          <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full font-medium">
            {search}
            <button
              onClick={() => updateParam('search', '')}
              className="ml-0.5 hover:text-indigo-900"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <ProductGridSkeleton count={PAGE_SIZE} />
      ) : (
        <>
          <ProductGrid products={products} />

          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-60 text-sm"
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                ) : (
                  'Load more products'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Outer page — provides Suspense boundary ────────────────────────────────
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={12} />}>
      <ProductsContent />
    </Suspense>
  )
}