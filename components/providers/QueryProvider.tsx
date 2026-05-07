'use client'

/**
 * components/providers/QueryProvider.tsx — Client Component
 *
 * WHY this is a separate Client Component:
 * - QueryClientProvider requires a React context which only works in
 *   Client Components. Wrapping it here keeps the root layout a Server
 *   Component (better performance) while still providing the context.
 *
 * WHY getQueryClient() instead of useState:
 * - Ensures we reuse the singleton on client, create fresh on server.
 */

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/queryClient'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
