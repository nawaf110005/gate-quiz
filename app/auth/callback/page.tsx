'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Auth callback handler — handles three flows:
 *  1. PKCE code exchange  → ?code=…
 *  2. Magic-link / implicit → #access_token=… (from google-auth edge fn)
 *  3. Existing session (Apple hash-based or already logged in)
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      // 1. PKCE code (Google/Apple standard OAuth)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { router.replace('/admin'); return; }
      }

      // 2. Hash-based token (magic link from edge-function Google sign-in)
      //    The Supabase client automatically detects and stores hash tokens on init;
      //    calling getSession() is enough after a brief tick.
      await new Promise((r) => setTimeout(r, 200));
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/admin');
      } else {
        router.replace('/admin/login');
      }
    };

    handle();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        <p className="text-white/40 text-sm tracking-widest uppercase">Signing in…</p>
      </div>
    </div>
  );
}
