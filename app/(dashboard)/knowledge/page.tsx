import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession, createSupabaseServerClient } from '@/server/supabase/server'
import { KnowledgeShell } from '@/features/knowledge/components/KnowledgeShell'

export const metadata: Metadata = { title: 'Knowledge Base' }
export const dynamic = 'force-dynamic'

export default async function KnowledgePage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*, agent_profiles!knowledge_sources_uploaded_by_fkey(full_name, avatar_url)')
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  const enriched = (sources ?? []).map((item: Record<string, unknown>) => {
    const profiles = item.agent_profiles as { full_name: string; avatar_url: string | null } | null
    return {
      ...item,
      uploader_name:   profiles?.full_name  ?? null,
      uploader_avatar: profiles?.avatar_url ?? null,
      agent_profiles:  undefined,
    }
  })

  return (
    <KnowledgeShell
      sources={enriched as Parameters<typeof KnowledgeShell>[0]['sources']}
      isAdmin={session.profile.role === 'admin'}
      userId={session.profile.id}
    />
  )
}
