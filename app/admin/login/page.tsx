'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GridScan from '@/components/GridScan';

const PROD_URL = 'https://gate-quiz-rose.vercel.app';
const GOOGLE_CLIENT_ID =
  '948001311750-ir077hjprvir5d4bvr6humvh2p8k6r5g.apps.googleusercontent.com';
// Pinned so edge function call always reaches the correct project
const SUPABASE_URL = 'https://wdnkxlucmvrequmqksgv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkbmt4bHVjbXZyZXF1bXFrc2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTc2OTQsImV4cCI6MjA5MzEzMzY5NH0' +
  '.MmauupyyCHEyPcm4eChJAt3skKigJPiy9Jda-lJ-5mU';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          prompt: (
            callback?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/admin');
    });
  }, [router]);

  // Load Google Identity Services
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('gis-script')) { setGisReady(true); return; }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setGisReady(true);
    };
    document.head.appendChild(script);
    return () => { window.google?.accounts.id.cancel(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Called by GIS with a Google ID token — verified server-side, no client secret needed
  const handleGoogleCredential = async (response: { credential: string }) => {
    setLoading('google');
    setError(null);
    try {
      // Edge function verifies the Google token and returns a one-time OTP
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/google-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ credential: response.credential }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.otp) throw new Error(data.error ?? 'Google sign-in failed');

      // Exchange the OTP for a real Supabase session — no redirect required
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.otp,
        type: 'magiclink',
      });
      if (otpError) throw otpError;
      router.replace('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(null);
    }
  };

  const handleGoogleSignIn = () => {
    if (!gisReady || !window.google) {
      setError('Google sign-in is still loading, please try again.');
      return;
    }
    setLoading('google');
    setError(null);
    window.google.accounts.id.prompt((notification) => {
      // One Tap was suppressed (e.g. dismissed before, incognito) — do nothing;
      // the user will see an error state and can retry.
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setLoading(null);
        setError('Google sign-in was blocked by the browser. Please allow pop-ups or try again.');
      }
    });
  };

  const signInWithApple = async () => {
    setLoading('apple');
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${PROD_URL}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(null); }
  };

  return (
    <div className="relative min-h-screen bg-[#050a14] flex flex-col items-center justify-center overflow-hidden">
      <GridScan />

      <div className="relative z-10 flex flex-col items-center gap-6 mb-10">
        <span className="text-6xl select-none">⚔️</span>
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Gate of Decision
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">Admin Portal</p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto px-4">
        <div className="bg-slate-900/70 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl flex flex-col gap-4">
          <h2 className="text-center text-lg font-semibold text-white">Enter the Gate</h2>
          <p className="text-center text-sm text-slate-400">Sign in to access the admin panel</p>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading !== null}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-800 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'google' ? (
              <span className="animate-spin text-lg">⏳</span>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading === 'google' ? 'Signing in…' : 'Continue with Google'}
          </button>

          {/* Apple */}
          <button
            onClick={signInWithApple}
            disabled={loading !== null}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-black hover:bg-gray-900 border border-slate-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'apple' ? (
              <span className="animate-spin text-lg">⏳</span>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            )}
            {loading === 'apple' ? 'Signing in…' : 'Continue with Apple'}
          </button>

          <p className="text-center text-xs text-slate-600 mt-2">
            Only authorized admins can enter.<br />
            Players join games without an account.
          </p>
        </div>
      </div>
    </div>
  );
}
