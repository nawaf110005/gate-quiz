'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function PlayRedirectInner() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get('code');

  useEffect(() => {
    if (code) {
      router.replace(`/play/${code.toUpperCase()}`);
    }
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white/40">Redirecting…</div>
    </div>
  );
}

export default function PlayRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40">Redirecting…</div>
      </div>
    }>
      <PlayRedirectInner />
    </Suspense>
  );
}
