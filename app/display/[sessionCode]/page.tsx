'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, Question } from '@/lib/supabase';
import { useSessionByCode, usePlayers, useAnswers } from '@/lib/realtime';
import { motion, AnimatePresence } from 'framer-motion';
import LiveArena from '@/components/LiveArena';
import Leaderboard from '@/components/Leaderboard';
import { computeSessionStats } from '@/lib/logic';
import { QRCodeSVG } from 'qrcode.react';
import GridScan from '@/components/GridScan';
import RotatingText from '@/components/RotatingText';
import Stepper, { Step } from '@/components/Stepper';

export default function DisplayPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const code = (sessionCode ?? '').toUpperCase();
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${code}`
    : `https://gate-quiz-rose.vercel.app/play/${code}`;

  const { session, loading } = useSessionByCode(code);
  const players = usePlayers(session?.id ?? '');
  const answers = useAnswers(session?.id ?? '', session?.current_question_id ?? null);
  const [currentQ, setCurrentQ]       = useState<Question | null>(null);
  const [allAnswers, setAllAnswers]    = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [timeLimitMs, setTimeLimitMs] = useState(10000);

  useEffect(() => {
    if (!session?.current_question_id) return;
    supabase.from('questions').select('*').eq('id', session.current_question_id).single()
      .then(({ data }) => { if (data) setCurrentQ(data); });
  }, [session?.current_question_id]);

  useEffect(() => {
    if (!session?.game_id) return;
    supabase.from('games').select('time_per_question').eq('id', session.game_id).single()
      .then(({ data }) => { if (data?.time_per_question) setTimeLimitMs(data.time_per_question); });
  }, [session?.game_id]);

  useEffect(() => {
    if (!session?.id) return;
    supabase.from('answers').select('*').eq('session_id', session.id)
      .then(({ data }) => setAllAnswers(data ?? []));
    if (session.game_id) {
      supabase.from('questions').select('*').eq('game_id', session.game_id).order('order_index')
        .then(({ data }) => setAllQuestions(data ?? []));
    }
  }, [session?.id, session?.status, session?.game_id]);

  /* ── Loading / not found ─────────────────────────────────────────────── */
  if (loading || !session) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center gap-6 overflow-hidden" style={{ background: '#06030f' }}>
        <div className="absolute inset-0 z-0">
          <GridScan gridColor="rgba(6,182,212,0.1)" scanColor="rgba(6,182,212,0.5)" speed={6} gridSize={48} bg="#06030f" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="text-6xl font-black"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gate of Decision
          </div>
          <div className="text-white/30">
            {loading ? 'Loading…' : `Session not found: ${code}`}
          </div>
        </div>
      </div>
    );
  }

  const stats = session.status === 'finished'
    ? computeSessionStats(allAnswers, allQuestions, players)
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#06030f' }}>
      {/* GridScan background */}
      <div className="absolute inset-0 z-0">
        <GridScan
          gridColor="rgba(6,182,212,0.09)"
          scanColor="rgba(6,182,212,0.45)"
          dotColor="rgba(6,182,212,0.25)"
          speed={7}
          gridSize={52}
          bg="#06030f"
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-10 pt-5 pb-2">
          <div className="text-3xl font-black"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gate of Decision
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono text-2xl font-black text-white/30">{code}</span>
            <span className="ios-glass rounded-xl px-3 py-1 text-sm font-bold text-white/60">
              {players.length} {players.length === 1 ? 'player' : 'players'}
            </span>
          </div>
        </div>

        {/* ── Phase content ── */}
        <div className="flex-1">
          <AnimatePresence mode="wait">

            {/* ════ WAITING ════ */}
            {session.status === 'waiting' && (
              <motion.div key="waiting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[88vh] gap-10"
              >
                {/* Animated title */}
                <div className="overflow-hidden" style={{ height: '110px' }}>
                  <RotatingText
                    texts={['Gate of Decision', 'Get Ready!', 'Who Will Win?', 'Choose Wisely']}
                    rotationInterval={2500}
                    staggerDuration={0.03}
                    staggerFrom="center"
                    splitBy="characters"
                    mainClassName="text-[88px] font-black leading-none text-center"
                    elementLevelClassName="inline-block"
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-120%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  />
                </div>

                {/* Code + QR */}
                <div className="flex items-center gap-16">
                  <div className="text-center">
                    <div className="text-white/50 text-xl mb-3">Join with code</div>
                    <div className="text-7xl font-black tracking-widest"
                      style={{ color: '#06b6d4', textShadow: '0 0 40px rgba(6,182,212,0.8)' }}>
                      {code}
                    </div>
                    <div className="text-white/25 text-sm mt-3 font-mono">{joinUrl}</div>
                  </div>

                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="rounded-2xl p-4"
                      style={{ background: 'white', boxShadow: '0 0 40px rgba(6,182,212,0.5)' }}>
                      <QRCodeSVG value={joinUrl} size={180} bgColor="#ffffff" fgColor="#0a0012" level="M" />
                    </div>
                    <div className="text-white/40 text-sm">Scan to join</div>
                  </motion.div>
                </div>

                {/* Player chips */}
                <div className="text-white/30 text-xl">
                  {players.length > 0
                    ? `${players.length} ${players.length === 1 ? 'player' : 'players'} joined`
                    : 'Waiting for players…'}
                </div>
                {players.length > 0 && (
                  <div className="flex flex-wrap gap-3 justify-center max-w-4xl">
                    {players.slice(0, 40).map((p, i) => (
                      <motion.div key={p.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.05, 1.0) }}
                        className="rounded-full px-5 py-2 text-sm font-bold text-white"
                        style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)' }}
                      >
                        {p.name}
                      </motion.div>
                    ))}
                    {players.length > 40 && (
                      <div
                        className="rounded-full px-5 py-2 text-sm font-bold"
                        style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc' }}
                      >
                        +{players.length - 40} more
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ════ QUESTION / REVEALING ════ */}
            {(session.status === 'question' || session.status === 'revealing') && currentQ && (
              <motion.div key={`q-${session.current_question_id}-${session.status}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center pt-2 pb-4"
              >
                {/* Step indicator */}
                {allQuestions.length > 0 && (
                  <div className="flex justify-center py-2">
                    <Stepper
                      key={session.current_question_index}
                      initialStep={(session.current_question_index ?? 0) + 1}
                      disableStepIndicators={true}
                      contentClassName="hidden"
                      footerClassName="hidden"
                      stepCircleContainerClassName="mb-0 pb-0"
                    >
                      {allQuestions.map((_, i) => (
                        <Step key={i}><span /></Step>
                      ))}
                    </Stepper>
                  </div>
                )}

                <LiveArena
                  question={currentQ}
                  players={players}
                  answers={answers}
                  isRevealed={session.status === 'revealing'}
                  startedAt={session.question_started_at}
                  timeLimitMs={timeLimitMs}
                />
              </motion.div>
            )}

            {/* ════ LEADERBOARD ════ */}
            {session.status === 'leaderboard' && (
              <motion.div key="leaderboard"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="min-h-[88vh] flex flex-col items-center justify-center px-10 gap-8"
              >
                <h2 className="text-5xl font-black"
                  style={{ color: '#f59e0b', textShadow: '0 0 40px rgba(245,158,11,0.6)' }}>
                  ★ Standings
                </h2>
                <div className="w-full max-w-2xl">
                  <Leaderboard players={players} limit={10} showStats />
                </div>
              </motion.div>
            )}

            {/* ════ FINISHED ════ */}
            {session.status === 'finished' && (
              <motion.div key="finished"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[88vh] flex flex-col items-center justify-center px-10 gap-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="text-8xl"
                  style={{ filter: 'drop-shadow(0 0 60px rgba(245,158,11,0.8))' }}
                >
                  🏆
                </motion.div>
                <h2 className="text-5xl font-black text-white">Game Over!</h2>

                {players.length > 0 && (
                  <div className="ios-glass rounded-3xl px-12 py-6 text-center">
                    <div className="text-white/40 text-sm mb-1 uppercase tracking-widest">Winner</div>
                    <div className="text-5xl font-black"
                      style={{ color: '#f59e0b', textShadow: '0 0 40px rgba(245,158,11,0.7)' }}>
                      {[...players].sort((a, b) => b.score - a.score)[0]?.name}
                    </div>
                    <div className="text-3xl font-black text-white mt-2">
                      {[...players].sort((a, b) => b.score - a.score)[0]?.score} pts
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
                  <div className="w-full col-span-2">
                    <Leaderboard players={players} limit={10} showStats />
                  </div>
                  {stats && (
                    <div className="col-span-2 grid grid-cols-4 gap-4">
                      {[
                        { label: 'Total Answers', value: stats.totalAnswers, color: '#06b6d4' },
                        { label: 'Accuracy', value: `${stats.accuracy}%`, color: '#22c55e' },
                        { label: 'Fastest Player', value: stats.fastestPlayer?.name ?? '—', color: '#f59e0b' },
                        { label: 'Hardest Question', value: stats.hardestQuestion ? `${stats.hardestQuestion.difficultyPct}%` : '—', color: '#a855f7' },
                      ].map((s) => (
                        <div key={s.label} className="ios-glass rounded-2xl p-4 text-center">
                          <div className="text-xl font-black mt-1" style={{ color: s.color }}>{s.value}</div>
                          <div className="text-white/40 text-xs mt-1">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
