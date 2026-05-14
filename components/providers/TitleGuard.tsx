'use client'

/**
 * TitleGuard.tsx
 * Prevents Next.js from flashing "Loading..." in the browser tab.
 * Next.js App Router sets document.title = "Loading..." during route
 * transitions. This component watches for that and reverts it immediately.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function TitleGuard() {
  const pathname  = usePathname()
  const savedRef  = useRef<string>('')

  // Save the real title on every successful route render
  useEffect(() => {
    if (document.title && document.title !== 'Loading...') {
      savedRef.current = document.title
    }
  }, [pathname])

  // Watch for "Loading..." and revert immediately
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.title === 'Loading...') {
        document.title = savedRef.current || 'SupportAI'
      }
    })

    observer.observe(
      document.querySelector('title') ?? document.head,
      { subtree: true, characterData: true, childList: true }
    )

    return () => observer.disconnect()
  }, [])

  return null
}
