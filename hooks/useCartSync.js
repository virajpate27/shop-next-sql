// src/hooks/useCartSync.js
'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCartStore } from '@/store/cartStore'

export function useCartSync() {
  const { user } = useAuth()
  const items = useCartStore((s) => s.items)
  const syncToServer = useCartStore((s) => s.syncToServer)
  const loadFromServer = useCartStore((s) => s.loadFromServer)
  const hasLoaded = useRef(false)

  // Load cart from the server once when user logs in
  useEffect(() => {
    if (user && !hasLoaded.current) {
      loadFromServer(user.uid)
      hasLoaded.current = true
    }
    if (!user) {
      hasLoaded.current = false
    }
  }, [user, loadFromServer])

  // Debounced sync to the server whenever cart items change
  useEffect(() => {
    if (!user || !hasLoaded.current) return
    const timeout = setTimeout(() => {
      syncToServer(user.uid)
    }, 800)
    return () => clearTimeout(timeout)
  }, [items, user, syncToServer])
}