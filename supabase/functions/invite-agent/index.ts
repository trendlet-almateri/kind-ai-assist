/**
 * supabase/functions/invite-agent/index.ts
 * Edge function: invite a new agent to the workspace.
 * Called via Server Action (inviteAgentAction) with service-role-like permissions.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Build Supabase admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Build per-request client to verify caller identity
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify caller is an admin
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

    // Parse request body
    const { full_name, username, email, role } = await req.json() as {
      full_name: string
      username:  string
      email:     string
      role:      'admin' | 'agent'
    }

    if (!full_name || !username || !email || !role) {
      return new Response(JSON.stringify({ error: 'full_name, username, email, and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check username/email uniqueness
    const { data: existing } = await supabaseAdmin
      .from('agent_profiles')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Username or email already taken' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Invite via Supabase Auth (sends magic link email)
    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          username,
          role,
          workspace_id: callerProfile.workspace_id,
        },
        redirectTo: `${Deno.env.get('APP_URL') ?? 'http://localhost:3000'}/login`,
      }
    )

    if (inviteErr) {
      console.error('[invite-agent] Auth invite error:', inviteErr)
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Pre-create the agent_profiles row so it's available immediately
    // (will be confirmed when user clicks the invite link and sets a password)
    if (inviteData?.user) {
      const { error: profileErr } = await supabaseAdmin
        .from('agent_profiles')
        .insert({
          id:           inviteData.user.id,
          workspace_id: callerProfile.workspace_id,
          full_name,
          username,
          email,
          role,
          status: 'active',
        })

      if (profileErr) {
        console.error('[invite-agent] Profile insert error:', profileErr)
        // Non-fatal: the auth invite was still sent
      }
    }

    return new Response(
      JSON.stringify({ data: { invited: true, email } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[invite-agent] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
