// src/hooks/useCategories.js
'use client'
import { useState, useEffect } from 'react'
import { getCategories } from '@/lib/api/categories'

// Module-level cache so the API is only hit once per page load
let cache = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useCategories() {
  const [categories, setCategories] = useState(cache || [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    const now = Date.now()
    if (cache && now - cacheTime < CACHE_TTL) {
      setCategories(cache)
      setLoading(false)
      return
    }

    getCategories()
      .then((cats) => {
        cache = cats
        cacheTime = Date.now()
        setCategories(cats)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Call this after any create/update/delete to force a fresh fetch
  function invalidate() {
    cache = null
    cacheTime = 0
    setLoading(true)
    getCategories()
      .then((cats) => {
        cache = cats
        cacheTime = Date.now()
        setCategories(cats)
      })
      .finally(() => setLoading(false))
  }

  return { categories, loading, invalidate }
}