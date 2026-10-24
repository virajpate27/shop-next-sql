'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Replaces Firestore onSnapshot. Calls `fetcher` now and every `ms`, pauses while the tab is hidden.
 * const { data, loading, reload } = usePolling(() => fetch('/api/orders?all=1').then(r => r.json()), 15000)
 */
export function usePolling(fetcher, ms = 15000, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const ref = useRef(fetcher); ref.current = fetcher
  const run = async () => { try { setData(await ref.current()) } catch (e) { console.error(e) } finally { setLoading(false) } }
  useEffect(() => {
    run()
    const t = setInterval(() => { if (!document.hidden) run() }, ms)
    const onVis = () => !document.hidden && run()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps])
  return { data, loading, reload: run }
}
