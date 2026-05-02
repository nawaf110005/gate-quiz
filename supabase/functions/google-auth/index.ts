// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID =
  '948001311750-ir077hjprvir5d4bvr6humvh2p8k6r5g.apps.googleusercontent.com'
const SITE_URL = 'https://gate-quiz-rose.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { credential } = await req.json()
    if (!credential) {
      return new Response(JSON.stringify({ error: 'Missing credential' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify Google ID token via Google's tokeninfo endpoint (no client secret needed)
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    )
    const tokenInfo = await tokenRes.json()

    if (!tokenRes.ok || tokenInfo.error) {
      return new Response(JSON.stringify({ error: 'Invalid Google token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate the token is for our app
    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      return new Response(JSON.stringify({ error: 'Token audience mismatch' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email: string = tokenInfo.email
    const name: string = tokenInfo.name ?? ''
    const picture: string = tokenInfo.picture ?? ''

    // Admin Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find or create user
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const existing = listData.users.find((u: any) => u.email === email)

    if (existing) {
      await supabase.auth.admin.updateUserById(existing.id, {
        user_metadata: { full_name: name, avatar_url: picture },
      })
    } else {
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name, avatar_url: picture, provider: 'google' },
      })
      if (createError) throw createError
    }

    // Generate a magic sign-in link (no client secret required — admin only)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${SITE_URL}/auth/callback` },
    })
    if (linkError) throw linkError

    const actionLink = (linkData as any)?.properties?.action_link
    if (!actionLink) throw new Error('Failed to generate sign-in link')

    return new Response(JSON.stringify({ action_link: actionLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('google-auth error:', err)
    return new Response(JSON.stringify({ error: err?.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
