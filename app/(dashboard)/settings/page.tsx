import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession, createSupabaseServerClient } from '@/server/supabase/server'
import { SettingsShell } from '@/features/settings/components/SettingsShell'
import { checkAllIntegrations } from '@/server/integrations/health'

export const metadata: Metadata = { title: 'Workspace & AI' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') redirect('/inbox')

  const supabase = await createSupabaseServerClient()
  const [{ data: settings }, { data: prompts }, health] = await Promise.all([
    supabase.from('workspace_settings').select('*').single(),
    supabase.from('system_prompts').select('*').order('created_at', { ascending: false }),
    checkAllIntegrations(),
  ])

  return (
    <SettingsShell
      settings={settings}
      prompts={prompts ?? []}
      integrationsHealth={health}
    />
  )
}
