'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase, Question, Player } from '@/lib/supabase';
import { useSessionByCode, usePlayers } from '@/lib/realtime';
import { motion } from 'framer-motion';
import TimerRing from '@/components/TimerRing';
import Leaderboard from '@/components/Leaderboard';
import Ballpit from '@/components/Ballpit';

type Phase = 'join' | 'waiting' | 'question' | 'answered' | 'revealing' | 'leaderboard' | 'finished';

const BallpitColors = [0x06b6d4, 0xa855f7, 0x22c55e, 0xf59e0b, 0x3b82f6];

function BallpitBg() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Ballpit
        count={35}
        gravity={0.4}
        friction={0.9975}
        wallBounce={0.95}
        followCursor={true}
        colors={BallpitColors}
        ambientColor={0xffffff}
        ambientIntensity={0.7}
        lightIntensity={120}
        minSize={0.35}
        maxSize={0.85}
      />
    </div>
  );
}

export default function PlayerPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');
  const code = (sessionCode ?? codeParam ?? '').toUpperCase();

  const { session, loading: sessionLoading } = useSessionByCode(code);
  const players = usePlayers(session?.id ?? '');

  const [player, setPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [myChoice, setMyChoice] = useState<'A' | 'B' | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('join');
  const [joining, setJoining] = useState(false);
  const [choiceResult, setChoiceResult] = useState<{ isCorrect: boolean; scored: number } | null>(null);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !session) return;
    setJoining(true);
    const { data, error } = await supabase
      .from('players')
      .insert({ session_id: session.id, name: playerName.trim() })
      .select()
      .single();
    if (!error && data) {
      setPlayer(data);
      setPhase('waiting');
      localStorage.setItem(`gate_player_${code}`, JSON.stringify(data));
    } else {
      alert('خطأ في الدخول');
    }
    setJoining(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem(`gate_player_${code}`);
    if (saved) {
      try { const p = JSON.parse(saved); setPlayer(p); setPhase('waiting'); } catch {}
    }
  }, [code]);

  useEffect(() => {
    if (!session || !player) return;
    if (session.status === 'waiting') {
      setPhase('waiting'); setMyChoice(null); setChoiceResult(null);
    } else if (session.status === 'question' && session.current_question_id) {
      setMyChoice(null); setChoiceResult(null); setPhase('question');
      supabase.from('questions').select('*').eq('id', session.current_question_id).single()
        .then(({ data }) => { if (data) setCurrentQ(data); });
    } else if (session.status === 'revealing') {
      setPhase('revealing');
      if (session.current_question_id && player) {
        supabase.from('answers').select('*')
          .eq('question_id', session.current_question_id)
          .eq('player_id', player.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setChoiceResult({ isCorrect: data.is_correct ?? false, scored: data.score_earned });
              setMyScore((prev) => prev + (data.score_earned ?? 0));
            }
          });
      }
    } else if (session.status === 'leaderboard') {
      setPhase('leaderboard');
    } else if (session.status === 'finished') {
      setPhase('finished');
    }
  }, [session?.status, session?.current_question_id, player?.id]);

  useEffect(() => {
    if (!player) return;
    const me = players.find((p) => p.id === player.id);
    if (me) setMyScore(me.score);
  }, [players, player?.id]);

  const submitAnswer = async (choice: 'A' | 'B') => {
    if (!player || !session || !currentQ || myChoice) return;
    setMyChoice(choice);
    const responseTimeMs = session.question_started_at
      ? Date.now() - new Date(session.question_started_at).getTime()
      : null;
    await supabase.from('answers').insert({
      session_id: session.id,
      question_id: currentQ.id,
      player_id: player.id,
      choice,
      response_time_ms: responseTimeMs,
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <BallpitBg />
        <div className="relative z-10 text-white/40 text-lg">جاري البحث عن الجلسة…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-6 text-center overflow-hidden">
        <BallpitBg />
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-white mb-2">لم يتم العثور على الجلسة</h2>
          <p className="text-white/40">تحقق من الكود وحاول مرة أخرى</p>
        </div>
      </div>
    );
  }

  // ── Join form ──────────────────────────────────────────────────────────────
  if (phase === 'join') {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
        <BallpitBg />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1
              className="text-4xl font-black"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              بوابة القرار
            </h1>
            <div className="mt-2 font-mono text-2xl font-black text-cyan-400">{code}</div>
          </div>
          <form onSubmit={join} className="glass rounded-3xl p-6 flex flex-col gap-4">
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="اسمك في اللعبة"
              maxLength={20}
              required
              autoFocus
              className="w-full rounded-xl px-4 py-4 text-center text-xl font-bold text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <button
              type="submit"
              disabled={joining || !playerName.trim()}
              className="rounded-2xl py-4 text-lg font-bold text-black transition hover:scale-105 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}
            >
              {joining ? 'جاري الدخول…' : 'دخول اللعبة'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Waiting lobby ──────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center gap-6 overflow-hidden">
        <BallpitBg />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            <h2 className="text-2xl font-bold text-white">في انتظار البدء</h2>
            <p className="text-white/40 mt-2">المدير سيبدأ اللعبة قريباً</p>
          </motion.div>
          <div className="glass rounded-2xl px-8 py-4">
            <div className="text-white/40 text-sm">مرحباً</div>
            <div className="text-2xl font-black text-cyan-400">{player?.name}</div>
          </div>
          <div className="text-white/30 text-sm">{players.length} لاعب في الجلسة</div>
        </div>
      </div>
    );
  }

  // ── Question phase ─────────────────────────────────────────────────────────
  if ((phase === 'question' || phase === 'answered') && currentQ) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 gap-6 overflow-hidden">
        <BallpitBg />
        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
          <TimerRing
            durationMs={10000}
            startedAt={session.question_started_at}
            size={80}
          />
          <div className="glass rounded-3xl px-6 py-5 w-full text-center">
            <div className="text-white/40 text-xs mb-2">
              سؤال {(session.current_question_index ?? 0) + 1}
            </div>
            <h2 className="text-xl font-bold text-white leading-relaxed">{currentQ.text}</h2>
          </div>
          <div className="flex flex-col gap-4 w-full">
            {(['A', 'B'] as const).map((c) => {
              const isChosen = myChoice === c;
              const text = c === 'A' ? currentQ.option_a : currentQ.option_b;
              const color = c === 'A' ? '#06b6d4' : '#a855f7';
              return (
                <motion.button
                  key={c}
                  onClick={() => submitAnswer(c)}
                  disabled={!!myChoice}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-3xl py-5 text-lg font-bold transition"
                  style={{
                    background: isChosen ? color : `${color}15`,
                    color: isChosen ? '#000' : 'white',
                    border: `3px solid ${isChosen ? color : `${color}50`}`,
                    boxShadow: isChosen ? `0 0 30px ${color}80` : 'none',
                    opacity: myChoice && !isChosen ? 0.4 : 1,
                  }}
                >
                  <span className="font-black text-2xl mr-3">{c}</span>
                  {text}
                </motion.button>
              );
            })}
          </div>
          {myChoice && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white/50 text-sm"
            >
              ✓ اخترت {myChoice} — في انتظار كشف الإجابة
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ── Revealing phase ────────────────────────────────────────────────────────
  if (phase === 'revealing' && currentQ) {
    const isCorrect = choiceResult?.isCorrect ?? false;
    const scored = choiceResult?.scored ?? 0;
    const resultColor = isCorrect ? '#22c55e' : '#ef4444';
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center gap-6 overflow-hidden">
        <BallpitBg />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: `${resultColor}25`, border: `3px solid ${resultColor}`, boxShadow: `0 0 40px ${resultColor}60` }}
          >
            {!myChoice ? (
              <span className="text-3xl font-black text-white/60">—</span>
            ) : isCorrect ? (
              <svg width="40" height="40" viewBox="0 0 40 40"><path d="M6 20 L15 30 L34 10" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 40 40"><path d="M10 10 L30 30 M30 10 L10 30" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" fill="none" /></svg>
            )}
          </motion.div>
          <div>
            <h2 className="text-2xl font-black text-white">
              {!myChoice ? 'لم تجب!' : isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
            </h2>
            {isCorrect && scored > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-black text-yellow-400 mt-2"
              >
                +{scored} نقطة
              </motion.div>
            )}
          </div>
          <div className="glass rounded-2xl px-8 py-4">
            <div className="text-white/40 text-sm">الإجابة الصحيحة</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">
              {currentQ.correct_choice === 'A' ? currentQ.option_a : currentQ.option_b}
            </div>
          </div>
          <div className="glass rounded-2xl px-8 py-3">
            <div className="text-white/40 text-sm">مجموع نقاطك</div>
            <div className="text-3xl font-black text-white">{myScore}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Leaderboard ────────────────────────────────────────────────────────────
  if (phase === 'leaderboard') {
    const myRank = [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === player?.id) + 1;
    return (
      <div className="relative min-h-screen p-6 overflow-hidden">
        <BallpitBg />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white text-center mb-6">★ الترتيب</h2>
          {myRank > 0 && (
            <div className="glass rounded-2xl px-6 py-3 text-center mb-4">
              <span className="text-white/40 text-sm">مرتبتك: </span>
              <span className="text-xl font-black text-cyan-400">#{myRank}</span>
              <span className="text-white/40 text-sm mr-4">نقاطك: </span>
              <span className="text-xl font-black text-yellow-400">{myScore}</span>
            </div>
          )}
          <Leaderboard players={players} />
        </div>
      </div>
    );
  }

  // ── Finished ───────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const myRank = [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === player?.id) + 1;
    const winner = [...players].sort((a, b) => b.score - a.score)[0];
    return (
      <div className="relative min-h-screen p-6 flex flex-col items-center justify-center gap-6 overflow-hidden">
        <BallpitBg />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-7xl font-black"
            style={{ color: '#f59e0b', textShadow: '0 0 40px rgba(245,158,11,0.8)' }}
          >
            {myRank === 1 ? '★' : '★'}
          </motion.div>
          <h2 className="text-3xl font-black text-white text-center">
            {myRank === 1 ? 'أنت الفائز!' : 'انتهت اللعبة!'}
          </h2>
          {winner && myRank !== 1 && (
            <div className="text-white/60 text-center">
              الفائز: <span className="text-yellow-400 font-bold">{winner.name}</span>
            </div>
          )}
          <div className="glass rounded-2xl px-8 py-4 text-center">
            <div className="text-white/40 text-sm">نقاطك النهائية</div>
            <div className="text-4xl font-black text-cyan-400">{myScore}</div>
            <div className="text-white/40 text-sm mt-1">المرتبة #{myRank}</div>
          </div>
          <Leaderboard players={players} limit={5} />
        </div>
      </div>
    );
  }

  return null;
}
