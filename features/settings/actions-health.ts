/**
 * features/settings/actions-health.ts
 * Server action: re-run integration health checks on demand.
 * Used by the IntegrationsHealthPanel "Refresh" button.
 */

'use server'

import { getServerSession } from '@/server/supabase/server'
import { checkAllIntegrations, type IntegrationHealth } from '@/server/integrations/health'

export async function refreshIntegrationsHealthAction(): Promise<{
  data?: IntegrationHealth[]
  error?: string
}> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Unauthorized' }
  }
  try {
    const data = await checkAllIntegrations()
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Health check failed' }
  }
}
