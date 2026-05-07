/**
 * supabase/functions/delete-knowledge/index.ts
 * Edge function: soft-delete a knowledge source.
 * Removes file from Supabase Storage + marks record as deleted.
 * Also removes OpenAI file if one was created.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify caller
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('agent_profiles')
      .select('role, workspace_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { knowledge_source_id } = await req.json() as { knowledge_source_id: string }
    if (!knowledge_source_id) {
      return new Response(JSON.stringify({ error: 'knowledge_source_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch the record
    const { data: source, error: fetchErr } = await supabaseAdmin
      .from('knowledge_sources')
      .select('*')
      .eq('id', knowledge_source_id)
      .eq('workspace_id', callerProfile.workspace_id)
      .single()

    if (fetchErr || !source) {
      return new Response(JSON.stringify({ error: 'Knowledge source not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Remove from Supabase Storage
    const { error: storageErr } = await supabaseAdmin.storage
      .from('knowledge-base')
      .remove([source.storage_path])

    if (storageErr) {
      console.warn('[delete-knowledge] Storage remove error:', storageErr)
      // Continue anyway — mark as deleted in DB
    }

    // 2. Remove from OpenAI (if file was uploaded)
    if (source.openai_file_id) {
      try {
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (openaiApiKey) {
          await fetch(`https://api.openai.com/v1/files/${source.openai_file_id}`, {
            method:  'DELETE',
            headers: { 'Authorization': `Bearer ${openaiApiKey}` },
          })
        }
      } catch (oaiErr) {
        console.warn('[delete-knowledge] OpenAI file delete error:', oaiErr)
      }
    }

    // 3. Soft-delete the DB record
    const { error: dbErr } = await supabaseAdmin
      .from('knowledge_sources')
      .update({ status: 'deleted' })
      .eq('id', knowledge_source_id)

    if (dbErr) {
      return new Response(JSON.stringify({ error: 'DB update failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(
      JSON.stringify({ data: { deleted: true } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[delete-knowledge] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
