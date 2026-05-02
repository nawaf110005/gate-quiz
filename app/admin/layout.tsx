'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // undefined = still loading, null = not logged in, User = logged in
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    // Keep in sync with auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user === null && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [user, pathname, router]);

  // Login page renders without auth guard (it handles its own redirect)
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Loading — show minimal spinner
  if (user === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#06030f' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(6,182,212,0.5)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // Not authenticated — blank while redirecting
  if (!user) return null;

  // Authenticated — render page
  return <>{children}</>;
}
