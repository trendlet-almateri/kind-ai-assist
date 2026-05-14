'use client'

import { useEffect } from 'react'

export function TitleGuard() {
  useEffect(() => {
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'title')

    Object.defineProperty(document, 'title', {
      set(value) {
        if (typeof value === 'string' && value.toLowerCase().includes('loading')) {
          return
        }
        original?.set?.call(document, value)
      },
      get() {
        return original?.get?.call(document)
      },
      configurable: true,
    })
  }, [])

  return null
}
