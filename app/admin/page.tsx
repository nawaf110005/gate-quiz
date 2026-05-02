'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase, Game, Session } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';

type GameWithCount = Game & { questionCount: number };

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<GameWithCount[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<'google' | 'apple' | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = async (userId: string) => {
    const [gamesRes, sessionsRes] = await Promise.all([
      supabase.from('games').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);

    const gamesData = gamesRes.data ?? [];
    const sessionsData = sessionsRes.data ?? [];

    // Fetch question counts for each game
    const counts = await Promise.all(
      gamesData.map((g) =>
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('game_id', g.id)
          .then(({ count }) => ({ id: g.id, count: count ?? 0 }))
      )
    );
    const countMap = Object.fromEntries(counts.map((c) => [c.id, c.count]));

    setGames(gamesData.map((g) => ({ ...g, questionCount: countMap[g.id] ?? 0 })));
    setSessions(sessionsData);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        fetchData(data.user.id);
      }
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  const linkProvider = async (provider: 'google' | 'apple') => {
    setLinkingProvider(provider);
    const { error } = await (supabase.auth as any).linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) alert(error.message);
    setLinkingProvider(null);
  };

  const activeSessions = sessions.filter((s) => s.status !== 'finished');
  const connectedProviders = user?.identities?.map((i) => i.provider) ?? [];
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Admin') as string;

  const deleteGame = async (gameId: string) => {
    if (!confirm('Delete this game and all its questions? This cannot be undone.')) return;
    await supabase.from('questions').delete().eq('game_id', gameId);
    await supabase.from('games').delete().eq('id', gameId);
    setGames((prev) => prev.filter((g) => g.id !== gameId));
  };

  // Free-tier channel math: each player = 1 channel, display = 3, admin = 3
  const realtimeChannelEstimate = activeSessions.length > 0 ? 6 + 60 : 0; // rough estimate
  const freeTierWarning = realtimeChannelEstimate > 150;

  return (
    <div className="min-h-screen" style={{ background: '#06030f' }}>

      {/* ── Top nav bar ── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(6,3,15,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo */}
        <div
          className="text-xl font-black"
          style={{
            background: 'linear-gradient(135deg,#06b6d4,#a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Gate of Decision
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/admin/games/new"
            className="rounded-xl px-5 py-2 text-sm font-bold text-black transition hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}
          >
            + New Game
          </Link>

          {/* Profile dropdown */}
          <div className="relative ml-2" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 transition"
              style={{ background: profileOpen ? 'rgba(255,255,255,0.08)' : 'transparent' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', color: '#000' }}
                >
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-white/70 text-sm font-semibold hidden sm:block max-w-[140px] truncate">
                {displayName}
              </span>
              <svg
                className="w-3 h-3 text-white/40 transition-transform"
                style={{ transform: profileOpen ? 'rotate(180deg)' : '' }}
                fill="none" viewBox="0 0 10 6"
              >
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 ios-glass rounded-2xl p-4 flex flex-col gap-3"
                  style={{ zIndex: 100 }}
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black"
                        style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', color: '#000' }}
                      >
                        {displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-white font-bold text-sm truncate max-w-[180px]">{displayName}</div>
                      <div className="text-white/40 text-xs truncate max-w-[180px]">{user?.email}</div>
                    </div>
                  </div>

                  {/* Connected accounts */}
                  <div>
                    <div className="text-white/40 text-xs mb-2 uppercase tracking-wider">Connected Accounts</div>
                    <div className="flex flex-col gap-1.5">
                      {(['google', 'apple'] as const).map((provider) => {
                        const connected = connectedProviders.includes(provider);
                        return (
                          <div key={provider} className="flex items-center justify-between rounded-xl px-3 py-2"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-2 text-sm">
                              {provider === 'google' ? <GoogleIconSm /> : <AppleIconSm />}
                              <span className="text-white/80 capitalize">{provider}</span>
                            </div>
                            {connected ? (
                              <span className="text-xs font-bold text-green-400">✓ Connected</span>
                            ) : (
                              <button
                                onClick={() => linkProvider(provider)}
                                disabled={!!linkingProvider}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg transition disabled:opacity-40"
                                style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
                              >
                                {linkingProvider === provider ? '…' : '+ Link'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={signOut}
                    className="w-full rounded-xl py-2.5 text-sm font-bold text-red-400 transition"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── Free Tier Usage Banner ── */}
        <FreeTierBanner sessionCount={sessions.length} activeCount={activeSessions.length} />

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Games', value: games.length, icon: '🎮', color: '#06b6d4', sub: `${games.reduce((s, g) => s + g.questionCount, 0)} questions total` },
            { label: 'Active', value: activeSessions.length, icon: '🔴', color: '#22c55e', sub: activeSessions.length > 0 ? 'session in progress' : 'no live sessions' },
            { label: 'Sessions', value: sessions.length, icon: '📊', color: '#a855f7', sub: 'last 20 shown' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="ios-glass rounded-2xl p-5 flex flex-col gap-1"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-black tabular-nums" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="text-white/70 font-bold text-sm mt-0.5">{stat.label}</div>
                </div>
                <div className="text-2xl">{stat.icon}</div>
              </div>
              <div className="text-white/30 text-xs">{stat.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Games ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">My Games</h2>
            <Link
              href="/admin/games/new"
              className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition"
            >
              + New Game
            </Link>
          </div>

          {loading ? (
            <div className="ios-glass rounded-2xl p-8 text-center text-white/30">Loading…</div>
          ) : games.length === 0 ? (
            <div className="ios-glass rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">🎮</div>
              <div className="text-white/50 font-bold mb-1">No games yet</div>
              <Link href="/admin/games/new" className="text-cyan-400 text-sm underline">
                Create your first game
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {games.map((game, i) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="ios-glass rounded-2xl p-5 flex items-center gap-5"
                >
                  {/* Accent bar */}
                  <div
                    className="w-1 h-12 rounded-full flex-shrink-0"
                    style={{ background: 'linear-gradient(180deg,#06b6d4,#a855f7)' }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-black text-base truncate">{game.title}</div>
                    {game.description && (
                      <div className="text-white/40 text-xs mt-0.5 truncate">{game.description}</div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee' }}
                      >
                        {game.questionCount} {game.questionCount === 1 ? 'question' : 'questions'}
                      </span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}
                      >
                        {game.time_per_question / 1000}s / question
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/games/${game.id}/builder`}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-white/80 transition hover:text-white"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      ✏️ Edit
                    </Link>
                    {game.questionCount > 0 ? (
                      <StartSessionButton gameId={game.id} userId={user?.id ?? ''} />
                    ) : (
                      <Link
                        href={`/admin/games/${game.id}/builder`}
                        className="rounded-xl px-4 py-2 text-sm font-bold"
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                      >
                        ⚠️ Add Questions
                      </Link>
                    )}
                    <button
                      onClick={() => deleteGame(game.id)}
                      className="rounded-xl px-3 py-2 text-sm font-bold transition"
                      title="Delete game"
                      style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.5)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      🗑️
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recent Sessions ── */}
        {sessions.length > 0 && (
          <section>
            <h2 className="text-lg font-black text-white mb-4">Recent Sessions</h2>
            <div className="ios-glass rounded-2xl overflow-hidden">
              {sessions.map((s, i) => {
                const game = games.find((g) => g.id === s.game_id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 px-5 py-4 transition"
                    style={{
                      borderBottom: i < sessions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      background: 'transparent',
                    }}
                  >
                    {/* Code */}
                    <div
                      className="font-mono text-base font-black w-20 flex-shrink-0"
                      style={{ color: '#06b6d4' }}
                    >
                      {s.code}
                    </div>

                    {/* Game name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white/70 text-sm truncate">
                        {game?.title ?? 'Unknown game'}
                      </div>
                      <div className="text-white/25 text-xs mt-0.5">
                        {new Date(s.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBadge status={s.status} />

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {s.status !== 'finished' && (
                        <Link
                          href={`/admin/sessions/${s.id}/control`}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-black"
                          style={{ background: '#22c55e' }}
                        >
                          Control
                        </Link>
                      )}
                      <Link
                        href={`/display/${s.code}`}
                        target="_blank"
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-white/60 transition hover:text-white"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        📺
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Free Tier Banner ────────────────────────────────────────────────────────── */
function FreeTierBanner({ sessionCount, activeCount }: { sessionCount: number; activeCount: number }) {
  const [expanded, setExpanded] = useState(false);

  // Supabase free tier key limits
  const limits = [
    {
      label: 'Realtime connections',
      limit: 200,
      // Each player ≈ 1 channel, display + admin ≈ 6 channels per active session
      current: activeCount * 66, // rough: 60 players + 6 overhead per session
      note: 'Each player uses ~1 channel. Max ~190 concurrent players.',
      color: '#06b6d4',
    },
    {
      label: 'Monthly active users',
      limit: 50000,
      current: null, // Can't know without server-side
      note: 'Players are anonymous (no auth). Only admin accounts count.',
      color: '#22c55e',
    },
    {
      label: 'API requests',
      limit: 500000,
      current: null,
      note: 'Each answer submit = 1 write. Each session event = 1 write.',
      color: '#a855f7',
    },
  ];

  return (
    <motion.div
      className="ios-glass rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-base">📊</span>
          <div>
            <span className="text-white/80 font-bold text-sm">Supabase Free Tier</span>
            <span className="ml-2 text-white/35 text-xs">
              {activeCount > 0 ? `${activeCount} active session${activeCount > 1 ? 's' : ''}` : 'No active sessions'}
            </span>
          </div>
          {activeCount > 3 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              ⚠️ Watch limits
            </span>
          )}
        </div>
        <svg
          className="w-4 h-4 text-white/30 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : '' }}
          fill="none" viewBox="0 0 10 6"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="px-5 py-4 flex flex-col gap-4">
              {limits.map((limit) => {
                const pct = limit.current != null ? Math.min((limit.current / limit.limit) * 100, 100) : null;
                const isWarn = pct != null && pct > 70;
                return (
                  <div key={limit.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white/60 text-sm font-semibold">{limit.label}</span>
                      <span className="text-xs font-mono" style={{ color: isWarn ? '#f59e0b' : '#ffffff40' }}>
                        {limit.current != null ? `~${limit.current.toLocaleString()} / ${limit.limit.toLocaleString()}` : `limit: ${limit.limit.toLocaleString()}`}
                      </span>
                    </div>
                    {pct != null && (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: isWarn ? '#f59e0b' : limit.color }}
                        />
                      </div>
                    )}
                    <div className="text-white/25 text-xs mt-1">{limit.note}</div>
                  </div>
                );
              })}

              {/* Tips */}
              <div
                className="rounded-xl p-3 mt-1"
                style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}
              >
                <div className="text-cyan-400 text-xs font-bold mb-1">💡 Free Tier Tips</div>
                <ul className="text-white/40 text-xs space-y-0.5">
                  <li>• Keep finished sessions — they don't consume realtime channels</li>
                  <li>• 1 session at a time is optimal on free tier (max ~190 players)</li>
                  <li>• Players are anonymous, so you have unlimited concurrent players (auth-wise)</li>
                  <li>• Check your usage at supabase.com → Project → Usage</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Status badge ────────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Session['status'] }) {
  const map: Record<Session['status'], { label: string; color: string; bg: string }> = {
    waiting:     { label: 'Waiting',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    question:    { label: 'Live',        color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    revealing:   { label: 'Revealing',   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
    leaderboard: { label: 'Standings',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
    finished:    { label: 'Finished',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  };
  const { label, color, bg } = map[status] ?? { label: status, color: '#fff', bg: 'rgba(255,255,255,0.1)' };
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color, background: bg }}
    >
      ● {label}
    </span>
  );
}

/* ── Start Session Button ────────────────────────────────────────────────────── */
function StartSessionButton({ gameId, userId }: { gameId: string; userId: string }) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('sessions')
      .insert({ game_id: gameId, code, status: 'waiting', user_id: userId })
      .select()
      .single();

    if (!error && data) {
      window.location.href = `/admin/sessions/${data.id}/control`;
    } else {
      alert('Error creating session');
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
      {loading ? '…' : '▶ Start'}
    </button>
  );
}

/* ── Small icons for profile dropdown ──────────────────────────────────────── */
function GoogleIconSm() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIconSm() {
  return (
    <svg width="12" height="14" viewBox="0 0 814 1000" fill="rgba(255,255,255,0.7)">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.4-150.3-109.9c-52.3-76.3-94.5-215.3-94.5-349.1 0-149 97.2-228.2 192.7-228.2 66.1 0 114.6 44.7 154.8 44.7 38.3 0 98.9-47.6 172.8-47.6 28.3 0 138.9 2.6 198.3 107.4zm-234.3-198c32.8-39.5 60.2-94.4 60.2-149.3 0-7.7-.6-15.4-1.9-21.8-57 2-123.7 38.1-164.5 82.1-31.5 35-63.6 90-63.6 146.9 0 8.3 1.3 16.7 1.9 19.2 3.2.6 8.4 1.3 13.6 1.3 51.3 0 115.8-34.2 154.3-78.4z"/>
    </svg>
  );
}
