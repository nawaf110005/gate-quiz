'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Game, Session } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('games').select('*').order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(20),
    ]).then(([gamesRes, sessionsRes]) => {
      setGames(gamesRes.data ?? []);
      setSessions(sessionsRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const activeSessions = sessions.filter((s) => s.status !== 'finished');

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">لوحة الأدمن</h1>
          <p className="text-white/40">بوابة القرار — إدارة الألعاب والجلسات</p>
        </div>
        <Link
          href="/admin/games/new"
          className="rounded-xl px-6 py-3 font-bold text-black transition hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}
        >
          + إنشاء لعبة جديدة
        </Link>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: 'إجمالي الألعاب', value: games.length, icon: '🎮', color: '#06b6d4' },
          { label: 'الجلسات النشطة', value: activeSessions.length, icon: '🔴', color: '#22c55e' },
          { label: 'إجمالي الجلسات', value: sessions.length, icon: '📊', color: '#a855f7' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 text-center"
          >
            <div className="text-4xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-white/40 text-sm mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Games list */}
      <h2 className="mb-4 text-xl font-bold text-white">الألعاب</h2>
      {loading ? (
        <div className="text-white/30 text-center py-10">جاري التحميل…</div>
      ) : games.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-white/30">
          لا توجد ألعاب بعد.{' '}
          <Link href="/admin/games/new" className="text-cyan-400 underline">إنشاء لعبة الآن</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {games.map((game) => (
            <div key={game.id} className="glass rounded-2xl p-5 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-bold text-lg text-white">{game.title}</div>
                {game.description && (
                  <div className="text-white/40 text-sm mt-1">{game.description}</div>
                )}
                <div className="text-white/30 text-xs mt-2">
                  وقت السؤال: {game.time_per_question / 1000}ث
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/games/${game.id}/builder`}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                  style={{ background: 'rgba(168,85,247,0.25)', border: '1px solid rgba(168,85,247,0.4)' }}
                >
                  ✏️ تعديل
                </Link>
                <StartSessionButton gameId={game.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <>
          <h2 className="mb-4 mt-8 text-xl font-bold text-white">الجلسات الأخيرة</h2>
          <div className="grid gap-3">
            {sessions.map((s) => (
              <div key={s.id} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="font-mono text-xl font-black text-cyan-400">{s.code}</div>
                <div className="flex-1">
                  <StatusBadge status={s.status} />
                </div>
                {s.status !== 'finished' && (
                  <Link
                    href={`/admin/sessions/${s.id}/control`}
                    className="rounded-lg px-4 py-2 text-sm font-bold text-black"
                    style={{ background: '#22c55e' }}
                  >
                    دخول التحكم
                  </Link>
                )}
                <Link
                  href={`/display/${s.code}`}
                  target="_blank"
                  className="rounded-lg px-3 py-2 text-sm font-bold text-white"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  📺 شاشة العرض
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Session['status'] }) {
  const map: Record<Session['status'], { label: string; color: string }> = {
    waiting: { label: 'انتظار', color: '#f59e0b' },
    question: { label: 'سؤال نشط', color: '#22c55e' },
    revealing: { label: 'كشف الإجابة', color: '#06b6d4' },
    leaderboard: { label: 'ليدربورد', color: '#a855f7' },
    finished: { label: 'منتهية', color: '#6b7280' },
  };
  const { label, color } = map[status] ?? { label: status, color: '#fff' };
  return (
    <span className="text-sm font-semibold" style={{ color }}>● {label}</span>
  );
}

function StartSessionButton({ gameId }: { gameId: string }) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('sessions')
      .insert({ game_id: gameId, code, status: 'waiting' })
      .select()
      .single();

    if (!error && data) {
      window.location.href = `/admin/sessions/${data.id}/control`;
    } else {
      alert('خطأ في إنشاء الجلسة');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={start}
      disabled={loading}
      className="rounded-xl px-4 py-2 text-sm font-bold text-black transition hover:scale-105 disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
    >
      {loading ? '…' : '▶ بدء جلسة'}
    </button>
  );
}
