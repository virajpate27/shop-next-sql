'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getUserProfile } from '@/lib/auth/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null) // { uid, email, displayName, role, wishlist, ... }
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try { setProfile(await getUserProfile()) } catch { setProfile(null) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    refresh()
    const onExpired = () => setProfile(null)
    window.addEventListener('auth:expired', onExpired)
    window.addEventListener('auth:changed', refresh)
    return () => {
      window.removeEventListener('auth:expired', onExpired)
      window.removeEventListener('auth:changed', refresh)
    }
  }, [refresh])

  // `user` keeps the fields pages already read (uid, email, displayName, photoURL)
  const user = profile
  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.role === 'admin', isLoggedIn: !!profile, setProfile, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
