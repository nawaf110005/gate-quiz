'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PlayRedirect() {
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
      <div className="text-white/40">جاري التوجيه…</div>
    </div>
  );
}
