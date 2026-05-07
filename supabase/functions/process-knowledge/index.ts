/**
 * supabase/functions/process-knowledge/index.ts
 * Edge function: triggered by a Supabase Storage webhook when a file is uploaded.
 * Uploads the file to OpenAI and adds it to the workspace vector store.
 *
 * Setup in Supabase Dashboard:
 *   Database → Webhooks → New Webhook
 *   Table: knowledge_sources, Event: INSERT
 *   URL: https://<project>.supabase.co/functions/v1/process-knowledge
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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Supabase webhook delivers { type, table, record, schema, old_record }
    const payload = await req.json()
    const record  = payload.record as {
      id:           string
      workspace_id: string
      storage_path: string
      file_name:    string
      file_type:    string
    }

    if (!record?.id) {
      return new Response('No record in payload', { status: 400 })
    }

    // Mark as processing
    await supabaseAdmin
      .from('knowledge_sources')
      .update({ status: 'processing' })
      .eq('id', record.id)

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // 1. Download from Supabase Storage
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from('knowledge-base')
      .download(record.storage_path)

    if (dlErr || !fileData) throw new Error(`Storage download failed: ${dlErr?.message}`)

    // 2. Upload to OpenAI Files API
    const formData = new FormData()
    formData.append('file', new File([fileData], record.file_name, { type: record.file_type }))
    formData.append('purpose', 'assistants')

    const uploadRes = await fetch('https://api.openai.com/v1/files', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}` },
      body:    formData,
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      throw new Error(`OpenAI file upload failed: ${err}`)
    }

    const uploadedFile = await uploadRes.json() as { id: string }

    // 3. Get workspace vector store ID
    const { data: settings } = await supabaseAdmin
      .from('workspace_settings')
      .select('openai_vector_store_id')
      .eq('workspace_id', record.workspace_id)
      .single()

    let vectorStoreId = settings?.openai_vector_store_id

    // 4. Create vector store if it doesn't exist yet
    if (!vectorStoreId) {
      const vsRes = await fetch('https://api.openai.com/v1/vector_stores', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type':  'application/json',
          'OpenAI-Beta':   'assistants=v2',
        },
        body: JSON.stringify({ name: `Workspace ${record.workspace_id}` }),
      })

      if (!vsRes.ok) throw new Error('Failed to create vector store')
      const vs = await vsRes.json() as { id: string }
      vectorStoreId = vs.id

      // Save back to workspace_settings
      await supabaseAdmin
        .from('workspace_settings')
        .update({ openai_vector_store_id: vectorStoreId })
        .eq('workspace_id', record.workspace_id)
    }

    // 5. Add file to vector store
    const addRes = await fetch(
      `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type':  'application/json',
          'OpenAI-Beta':   'assistants=v2',
        },
        body: JSON.stringify({ file_id: uploadedFile.id }),
      }
    )

    if (!addRes.ok) throw new Error('Failed to add file to vector store')

    // 6. Mark as ready
    await supabaseAdmin
      .from('knowledge_sources')
      .update({
        status:        'ready',
        openai_file_id: uploadedFile.id,
      })
      .eq('id', record.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[process-knowledge] Error:', message)

    // Mark as failed
    try {
      const payload = await req.json().catch(() => ({}))
      const id = payload?.record?.id
      if (id) {
        await supabaseAdmin
          .from('knowledge_sources')
          .update({ status: 'failed', error_msg: message })
          .eq('id', id)
      }
    } catch (_) {}

    return new Response(JSON.stringify({ error: message }), {
      status:  500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
