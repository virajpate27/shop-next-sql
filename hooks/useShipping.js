// src/hooks/useShipping.js
'use client'
import { useState, useEffect } from 'react'
import { getShippingConfig, DEFAULT_SHIPPING, calculateShipping } from '@/lib/api/shipping'

// Module-level cache — one API call per browser session
let cachedConfig = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useShipping() {
  const [config, setConfig] = useState(cachedConfig || DEFAULT_SHIPPING)
  const [loading, setLoading] = useState(!cachedConfig)

  useEffect(() => {
    const now = Date.now()
    if (cachedConfig && now - cacheTime < CACHE_TTL) {
      setConfig(cachedConfig)
      setLoading(false)
      return
    }

    getShippingConfig().then((cfg) => {
      cachedConfig = cfg
      cacheTime = Date.now()
      setConfig(cfg)
      setLoading(false)
    })
  }, [])

  function invalidate() {
    cachedConfig = null
    cacheTime = 0
    setLoading(true)
    getShippingConfig().then((cfg) => {
      cachedConfig = cfg
      cacheTime = Date.now()
      setConfig(cfg)
      setLoading(false)
    })
  }

  // Convenience calculator bound to current config
  function getShipping(orderTotal, paymentMethod, items) {
    return calculateShipping(orderTotal, paymentMethod, items, config)
  }

  return { config, loading, invalidate, getShipping }
}