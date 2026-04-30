'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, Question } from '@/lib/supabase';
import { useSessionByCode, usePlayers, useAnswers } from '@/lib/realtime';
import { motion, AnimatePresence } from 'framer-motion';
import LiveArena from '@/components/LiveArena';
import Leaderboard from '@/components/Leaderboard';
import { computeSessionStats } from '@/lib/logic';

export default function DisplayPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const code = (sessionCode ?? '').toUpperCase();

  const { session, loading } = useSessionByCode(code);
  const players = usePlayers(session?.id ?? '');
  const answers = useAnswers(session?.id ?? '', session?.current_question_id ?? null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [allAnswers, setAllAnswers] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!session?.current_question_id) return;
    supabase
      .from('questions')
      .select('*')
      .eq('id', session.current_question_id)
      .single()
      .then(({ data }) => { if (data) setCurrentQ(data); });
  }, [session?.current_question_id]);

  useEffect(() => {
    if (!session?.id) return;
    supabase.from('answers').select('*').eq('session_id', session.id)
      .then(({ data }) => setAllAnswers(data ?? []));
    if (session.game_id) {
      supabase.from('questions').select('*').eq('game_id', session.game_id).order('order_index')
        .then(({ data }) => setAllQuestions(data ?? []));
    }
  }, [session?.id, session?.status, session?.game_id]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div
          className="text-6xl font-black"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          بوابة القرار
        </div>
        {loading ? (
          <div className="text-white/30">جاري التحميل…</div>
        ) : (
          <div className="text-white/30">لم يتم العثور على الجلسة: {code}</div>
        )}
      </div>
    );
  }

  const stats = session.status === 'finished'
    ? computeSessionStats(allAnswers, allQuestions, players)
    : null;

  return (
    <div
      className="min-h-screen overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #1a0030 0%, #0a0012 70%)' }}
    >
      {/* Persistent header */}
      <div className="flex items-center justify-between px-10 pt-6 pb-2">
        <div
          className="text-3xl font-black"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          بوابة القرار
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono text-2xl font-black text-white/30">{code}</span>
          <span className="text-white/30 text-sm">{players.length} لاعب</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* WAITING */}
        {session.status === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[85vh] gap-8"
          >
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <div
                className="text-[120px] font-black leading-none"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                بوابة القرار
              </div>
            </motion.div>

            <div className="text-center">
              <div className="text-white/50 text-2xl mb-3">انضم الآن بالكود</div>
              <div
                className="text-8xl font-black tracking-widest"
                style={{ color: '#06b6d4', textShadow: '0 0 40px rgba(6,182,212,0.8)' }}
              >
                {code}
              </div>
            </div>

            <div className="text-white/30 text-xl">
              {players.length > 0
                ? `${players.length} لاعب انضم`
                : 'في انتظار اللاعبين…'}
            </div>

            {/* Live players joining */}
            {players.length > 0 && (
              <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
                {players.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-full px-4 py-2 text-sm font-bold text-white"
                    style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}
                  >
                    {p.name}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* QUESTION / REVEALING */}
        {(session.status === 'question' || session.status === 'revealing') && currentQ && (
          <motion.div
            key={`q-${session.current_question_id}-${session.status}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-[85vh]"
          >
            {/* Question index bar */}
            <div className="flex items-center justify-center gap-2 py-2">
              {allQuestions.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 w-8 rounded-full transition-all"
                  style={{
                    background: i === session.current_question_index
                      ? '#06b6d4'
                      : i < session.current_question_index
                      ? 'rgba(6,182,212,0.3)'
                      : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>

            <LiveArena
              question={currentQ}
              players={players}
              answers={answers}
              isRevealed={session.status === 'revealing'}
              startedAt={session.question_started_at}
            />
          </motion.div>
        )}

        {/* LEADERBOARD */}
        {session.status === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="min-h-[85vh] flex flex-col items-center justify-center px-10 gap-8"
          >
            <h2
              className="text-5xl font-black"
              style={{ color: '#f59e0b', textShadow: '0 0 40px rgba(245,158,11,0.6)' }}
            >
              🏆 الترتيب الحالي
            </h2>
            <div className="w-full max-w-2xl">
              <Leaderboard players={players} limit={10} showStats />
            </div>
          </motion.div>
        )}

        {/* FINISHED */}
        {session.status === 'finished' && (
          <motion.div
            key="finished"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-[85vh] flex flex-col items-center justify-center px-10 gap-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-8xl"
            >
              🎉
            </motion.div>
            <h2 className="text-5xl font-black text-white">انتهت اللعبة!</h2>

            {players.length > 0 && (
              <div className="glass rounded-3xl px-10 py-6 text-center">
                <div className="text-white/40 mb-1">الفائز</div>
                <div
                  className="text-5xl font-black"
                  style={{ color: '#f59e0b', textShadow: '0 0 40px rgba(245,158,11,0.7)' }}
                >
                  {[...players].sort((a, b) => b.score - a.score)[0]?.name}
                </div>
                <div className="text-3xl font-black text-white mt-2">
                  {[...players].sort((a, b) => b.score - a.score)[0]?.score} نقطة
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
              <div className="w-full col-span-2">
                <Leaderboard players={players} limit={10} showStats />
              </div>

              {/* Session stats */}
              {stats && (
                <div className="col-span-2 grid grid-cols-4 gap-4">
                  {[
                    { label: 'إجمالي الإجابات', value: stats.totalAnswers, icon: '📝' },
                    { label: 'دقة الإجابات', value: `${stats.accuracy}%`, icon: '🎯' },
                    { label: 'أسرع لاعب', value: stats.fastestPlayer?.name ?? '—', icon: '⚡' },
                    { label: 'أصعب سؤال', value: stats.hardestQuestion ? `${stats.hardestQuestion.difficultyPct}%` : '—', icon: '🔥' },
                  ].map((s) => (
                    <div key={s.label} className="glass rounded-2xl p-4 text-center">
                      <div className="text-3xl mb-1">{s.icon}</div>
                      <div className="text-xl font-black text-white">{s.value}</div>
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
  );
}
