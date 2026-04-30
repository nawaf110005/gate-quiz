'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, Session, Question, Player, Answer } from '@/lib/supabase';
import { useSession, usePlayers, useAnswers } from '@/lib/realtime';
import Leaderboard from '@/components/Leaderboard';
import { calculateScore } from '@/lib/logic';
import { motion } from 'framer-motion';

export default function ControlPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const session = useSession(sessionId);
  const players = usePlayers(sessionId);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allAnswers, setAllAnswers] = useState<Answer[]>([]);
  const currentQ = session?.current_question_id
    ? questions.find((q) => q.id === session.current_question_id) ?? null
    : null;
  const answers = useAnswers(sessionId, session?.current_question_id ?? null);

  useEffect(() => {
    if (!session?.game_id) return;
    supabase
      .from('questions')
      .select('*')
      .eq('game_id', session.game_id)
      .order('order_index')
      .then(({ data }) => setQuestions(data ?? []));
  }, [session?.game_id]);

  // Sync all answers for stats
  useEffect(() => {
    if (!sessionId) return;
    supabase.from('answers').select('*').eq('session_id', sessionId)
      .then(({ data }) => setAllAnswers(data ?? []));
  }, [sessionId, session?.status]);

  const updateSession = useCallback(
    async (update: Partial<Session>) => {
      await supabase.from('sessions').update(update).eq('id', sessionId);
    },
    [sessionId]
  );

  const startQuestion = async (qIndex: number) => {
    const q = questions[qIndex];
    if (!q) return;
    await updateSession({
      status: 'question',
      current_question_index: qIndex,
      current_question_id: q.id,
      question_started_at: new Date().toISOString(),
    });
  };

  const revealAnswer = async () => {
    if (!currentQ || !session) return;
    await updateSession({ status: 'revealing' });

    // Score all answers
    const unanswered = players.filter(
      (p) => !answers.find((a) => a.player_id === p.id)
    );

    const scoreUpdates = answers.map(async (ans) => {
      const player = players.find((p) => p.id === ans.player_id);
      if (!player) return;
      const isCorrect = ans.choice === currentQ.correct_choice;
      const scored = calculateScore(
        isCorrect,
        ans.response_time_ms ?? 10000,
        (questions[0] as any)?.time_per_question ?? 10000,
        player.streak
      );
      const newStreak = isCorrect ? player.streak + 1 : 0;

      await Promise.all([
        supabase.from('answers').update({
          is_correct: isCorrect,
          score_earned: scored,
        }).eq('id', ans.id),
        supabase.from('players').update({
          score: player.score + scored,
          streak: newStreak,
          correct_count: player.correct_count + (isCorrect ? 1 : 0),
          wrong_count: player.wrong_count + (isCorrect ? 0 : 1),
        }).eq('id', ans.player_id),
      ]);
    });

    await Promise.all(scoreUpdates);
  };

  const showLeaderboard = () => updateSession({ status: 'leaderboard' });
  const nextQuestion = () => {
    const nextIdx = (session?.current_question_index ?? 0) + 1;
    if (nextIdx < questions.length) {
      startQuestion(nextIdx);
    } else {
      updateSession({ status: 'finished' });
    }
  };
  const endGame = () => updateSession({ status: 'finished' });

  if (!session) return <div className="min-h-screen flex items-center justify-center text-white/40">جاري التحميل…</div>;

  const qIdx = session.current_question_index;
  const hasMore = qIdx + 1 < questions.length;

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-white/40 hover:text-white/70">← الرجوع</Link>
          <div>
            <h1 className="text-2xl font-black text-white">التحكم بالجلسة</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-2xl font-black text-cyan-400">{session.code}</span>
              <StatusBadge status={session.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/display/${session.code}`}
            target="_blank"
            className="rounded-xl px-4 py-2 text-sm font-bold text-white glass"
          >
            📺 شاشة العرض
          </Link>
          <Link
            href={`/play/${session.code}`}
            target="_blank"
            className="rounded-xl px-4 py-2 text-sm font-bold text-white glass"
          >
            📱 صفحة اللاعبين
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: controls */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Waiting state */}
          {session.status === 'waiting' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-8 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-white mb-2">في انتظار اللاعبين</h2>
              <p className="text-white/40 mb-6">{players.length} لاعب انضم حتى الآن</p>
              <div
                className="mx-auto mb-6 rounded-2xl p-4 text-center w-fit"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}
              >
                <div className="text-xs text-white/40 mb-1">كود الدخول</div>
                <div className="text-5xl font-black text-cyan-400 tracking-widest">{session.code}</div>
                <div className="text-xs text-white/30 mt-2">على جوالك: {typeof window !== 'undefined' ? window.location.origin : ''}/play/{session.code}</div>
              </div>
              {questions.length > 0 ? (
                <button
                  onClick={() => startQuestion(0)}
                  className="rounded-2xl px-10 py-4 text-xl font-black text-black transition hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
                >
                  ابدأ اللعبة 🚀
                </button>
              ) : (
                <p className="text-yellow-400">⚠️ أضف أسئلة للعبة أولاً</p>
              )}
            </motion.div>
          )}

          {/* Question state */}
          {(session.status === 'question' || session.status === 'revealing') && currentQ && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/40 text-sm">
                  سؤال {qIdx + 1} / {questions.length}
                </span>
                <span className="text-white/40 text-sm">
                  {answers.length} / {players.length} أجابوا
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-6">{currentQ.text}</h2>

              {/* Answer distribution */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {(['A', 'B'] as const).map((c) => {
                  const count = answers.filter((a) => a.choice === c).length;
                  const pct = answers.length > 0 ? (count / answers.length) * 100 : 0;
                  const isCorrect = currentQ.correct_choice === c;
                  return (
                    <div key={c} className="rounded-2xl p-4" style={{ background: `rgba(${c === 'A' ? '6,182,212' : '168,85,247'},0.1)`, border: `1px solid rgba(${c === 'A' ? '6,182,212' : '168,85,247'},0.3)` }}>
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-white">{c}: {c === 'A' ? currentQ.option_a : currentQ.option_b}</span>
                        {session.status === 'revealing' && (
                          <span>{isCorrect ? '✅' : '❌'}</span>
                        )}
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c === 'A' ? '#06b6d4' : '#a855f7' }} />
                      </div>
                      <div className="text-white/60 text-sm mt-1">{count} ({Math.round(pct)}%)</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                {session.status === 'question' && (
                  <button onClick={revealAnswer} className="flex-1 rounded-2xl py-3 font-bold text-black" style={{ background: '#f59e0b' }}>
                    كشف الإجابة 👁️
                  </button>
                )}
                {session.status === 'revealing' && (
                  <>
                    <button onClick={showLeaderboard} className="flex-1 rounded-2xl py-3 font-bold text-black" style={{ background: '#a855f7' }}>
                      عرض الترتيب 🏆
                    </button>
                    <button onClick={nextQuestion} className="flex-1 rounded-2xl py-3 font-bold text-black" style={{ background: hasMore ? '#22c55e' : '#ef4444' }}>
                      {hasMore ? 'السؤال التالي ▶' : 'إنهاء اللعبة 🏁'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Leaderboard state */}
          {session.status === 'leaderboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 text-center">🏆 الترتيب الحالي</h2>
              <Leaderboard players={players} showStats />
              <div className="mt-6 flex gap-3">
                <button onClick={nextQuestion} className="flex-1 rounded-2xl py-3 font-bold text-black" style={{ background: hasMore ? '#22c55e' : '#ef4444' }}>
                  {hasMore ? `السؤال التالي (${qIdx + 2}/${questions.length}) ▶` : 'إنهاء اللعبة 🏁'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Finished state */}
          {session.status === 'finished' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-black text-white mb-2">انتهت اللعبة!</h2>
              <Leaderboard players={players} limit={10} showStats />
            </motion.div>
          )}
        </div>

        {/* Right: live player list */}
        <div className="glass rounded-3xl p-5 h-fit">
          <h3 className="font-bold text-white mb-3">
            اللاعبون ({players.length})
          </h3>
          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex-1 text-sm text-white truncate">{p.name}</div>
                <div className="text-cyan-400 font-bold text-sm tabular-nums">{p.score}</div>
              </div>
            ))}
            {players.length === 0 && <div className="text-white/30 text-sm text-center py-4">لا يوجد لاعبون</div>}
          </div>
        </div>
      </div>
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
  return <span className="text-sm font-semibold" style={{ color }}>● {label}</span>;
}
