'use client'

/**
 * TitleGuard.tsx
 * Blocks Next.js from ever setting the browser tab title to "Loading..."
 * during route transitions.
 *
 * WHY Object.defineProperty instead of MutationObserver:
 * MutationObserver fires asynchronously — the title flashes for one frame
 * before the callback reverts it. Intercepting the setter is synchronous,
 * so "Loading..." is blocked before it ever reaches the DOM.
 */

import { useEffect } from 'react'

export function TitleGuard() {
  useEffect(() => {
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'title')
    if (!descriptor) return

    Object.defineProperty(document, 'title', {
      get() {
        return descriptor.get!.call(this)
      },
      set(value: string) {
        // Block Next.js "Loading..." — keep the previous real title
        if (value === 'Loading...' || value === 'Loading…') return
        descriptor.set!.call(this, value)
      },
      configurable: true,
    })

    return () => {
      // Restore the original descriptor on unmount
      Object.defineProperty(document, 'title', descriptor)
    }
  }, [])

  return null
}
