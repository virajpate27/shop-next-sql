// src/hooks/useWishlist.js
'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from '@/lib/api/wishlist'

export function useWishlist() {
  const { user, profile, setProfile } = useAuth()
  const [wishlist, setWishlist] = useState([])

  useEffect(() => {
    if (profile?.wishlist) {
      setWishlist(profile.wishlist)
    }
  }, [profile])

  const toggle = useCallback(
    async (productId) => {
      if (!user) {
        toast.error('Sign in to save items to your wishlist')
        return
      }

      const isSaved = wishlist.includes(productId)

      // Optimistic update
      setWishlist((prev) =>
        isSaved ? prev.filter((id) => id !== productId) : [...prev, productId]
      )

      try {
        if (isSaved) {
          await removeFromWishlist(user.uid, productId)
          toast.success('Removed from wishlist')
        } else {
          await addToWishlist(user.uid, productId)
          toast.success('Added to wishlist')
        }
        // keep profile context in sync
        setProfile((prev) => ({
          ...prev,
          wishlist: isSaved
            ? prev.wishlist?.filter((id) => id !== productId)
            : [...(prev?.wishlist || []), productId],
        }))
      } catch (err) {
        // revert on failure
        setWishlist((prev) =>
          isSaved ? [...prev, productId] : prev.filter((id) => id !== productId)
        )
        toast.error('Something went wrong')
      }
    },
    [user, wishlist, setProfile]
  )

  const isWishlisted = useCallback((productId) => wishlist.includes(productId), [wishlist])

  return { wishlist, toggle, isWishlisted }
}