import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing env vars', url: !!url, key: !!key })
  }

  const supabase = createClient(url, key)

  const { data, error } = await supabase.auth.signInWithPassword({
    email:    'optify.ai1@gmail.com',
    password: 'Admin@KindAI2026!',
  })

  return NextResponse.json({
    supabaseUrl: url,
    keyPrefix:   key.slice(0, 20) + '...',
    error:       error ? { message: error.message, code: (error as any).code, status: error.status } : null,
    userId:      data.user?.id ?? null,
  })
}
