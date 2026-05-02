'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase, Question, Player } from '@/lib/supabase';
import { useSessionByCode, usePlayers } from '@/lib/realtime';
import { motion, AnimatePresence } from 'framer-motion';
import TimerRing from '@/components/TimerRing';
import Leaderboard from '@/components/Leaderboard';
import Ballpit from '@/components/Ballpit';
import GridScan from '@/components/GridScan';

type Phase = 'join' | 'waiting' | 'question' | 'answered' | 'revealing' | 'leaderboard' | 'finished';

/* ── Ballpit colours: purple / silver / black ────────────────────────────── */
const BallpitColors = [
  0x7c3aed, 0x6d28d9, 0x9333ea, 0x7c3aed, 0xa855f7,
  0x6d28d9, 0xc0c0c0, 0x1a1a1a, 0x9333ea,
];

/* ── Shared backgrounds ───────────────────────────────────────────────────── */
function BallpitBg() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{ touchAction: 'none' }}
    >
      <Ballpit
        className="pointer-events-none"
        count={50}
        gravity={0}
        friction={0.9975}
        wallBounce={0.95}
        followCursor={false}
        useDeviceMotion={true}
        colors={BallpitColors}
        ambientColor={0xffffff}
        ambientIntensity={1}
        lightIntensity={200}
        minSize={0.4}
        maxSize={0.9}
      />
    </div>
  );
}

function GridScanBg() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <GridScan speed={8} gridSize={44} />
    </div>
  );
}

/* ── Page root ─────────────────────────────────────────────────────────────── */
export default function PlayerPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');
  const code = (sessionCode ?? codeParam ?? '').toUpperCase();

  const { session, loading: sessionLoading } = useSessionByCode(code);
  const players = usePlayers(session?.id ?? '');

  const [player, setPlayer]           = useState<Player | null>(null);
  const [playerName, setPlayerName]   = useState('');
  const [currentQ, setCurrentQ]       = useState<Question | null>(null);
  const [myChoice, setMyChoice]       = useState<'A' | 'B' | null>(null);
  const [myScore, setMyScore]         = useState(0);
  const [phase, setPhase]             = useState<Phase>('join');
  const [joining, setJoining]         = useState(false);
  const [choiceResult, setChoiceResult] = useState<{ isCorrect: boolean; scored: number } | null>(null);
  const [timeLimitMs, setTimeLimitMs]  = useState(10000);

  /* ── Join ─────────────────────────────────────────────────────────────── */
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
      alert('Error joining');
    }
    setJoining(false);
  };

  /* ── Restore saved player ─────────────────────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem(`gate_player_${code}`);
    if (saved) {
      try { const p = JSON.parse(saved); setPlayer(p); setPhase('waiting'); } catch {}
    }
  }, [code]);

  /* ── Session status → phase ───────────────────────────────────────────── */
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

  /* ── Fetch time limit from game ──────────────────────────────────────── */
  useEffect(() => {
    if (!session?.game_id) return;
    supabase.from('games').select('time_per_question').eq('id', session.game_id).single()
      .then(({ data }) => { if (data?.time_per_question) setTimeLimitMs(data.time_per_question); });
  }, [session?.game_id]);

  /* ── Sync score from live players ────────────────────────────────────── */
  useEffect(() => {
    if (!player) return;
    const me = players.find((p) => p.id === player.id);
    if (me) setMyScore(me.score);
  }, [players, player?.id]);

  /* ── Submit answer — optimistic UI, fire-and-forget DB write ─────────── */
  const submitAnswer = useCallback((choice: 'A' | 'B') => {
    if (!player || !session || !currentQ || myChoice) return;
    // Instant UI feedback — no await
    setMyChoice(choice);
    const responseTimeMs = session.question_started_at
      ? Date.now() - new Date(session.question_started_at).getTime()
      : null;
    // Non-blocking DB write
    supabase.from('answers').insert({
      session_id: session.id,
      question_id: currentQ.id,
      player_id: player.id,
      choice,
      response_time_ms: responseTimeMs,
    }).then(() => {});
  }, [player, session, currentQ, myChoice]);

  /* ══════════════════════════════════════════════════════════════════════ */
  /*  LOADING                                                               */
  /* ══════════════════════════════════════════════════════════════════════ */
  if (sessionLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: '#06030f' }}>
        <GridScanBg />
        <div className="relative z-10 ios-glass rounded-2xl px-8 py-5 text-white/60 text-base">
          Looking for session…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 text-center overflow-hidden" style={{ background: '#06030f' }}>
        <GridScanBg />
        <div className="relative z-10 ios-glass rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-2">Session not found</h2>
          <p className="text-white/40">Check the code and try again</p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /*  JOIN FORM                                                             */
  /* ══════════════════════════════════════════════════════════════════════ */
  if (phase === 'join') {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
        style={{ background: '#06030f' }}
      >
        <BallpitBg />
        <div className="relative z-10 w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black"
              style={{
                background: 'linear-gradient(135deg,#a855f7,#7c3aed,#c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none',
              }}
            >
              Gate of Decision
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 font-mono text-3xl font-black tracking-widest"
              style={{ color: '#a855f7', textShadow: '0 0 20px rgba(168,85,247,0.6)' }}
            >
              {code}
            </motion.div>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={join}
            className="ios-glass rounded-3xl p-6 flex flex-col gap-4"
          >
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              required
              autoFocus
              className="w-full rounded-2xl px-5 py-4 text-center text-xl font-bold text-white placeholder-white/25 outline-none focus:ring-2 focus:ring-purple-500/50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(168,85,247,0.25)',
                WebkitAppearance: 'none',
              }}
            />
            <motion.button
              type="submit"
              disabled={joining || !playerName.trim()}
              whileTap={{ scale: 0.97 }}
              className="rounded-2xl py-4 text-lg font-bold text-white transition-all disabled:opacity-40 active:scale-95"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#9333ea)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.5)',
              }}
            >
              {joining ? 'Joining…' : 'Join Game ←'}
            </motion.button>
          </motion.form>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /*  WAITING LOBBY  — GridScan background                                 */
  /* ══════════════════════════════════════════════════════════════════════ */
  if (phase === 'waiting') {
    return (
      <div
        className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center gap-6 overflow-hidden"
        style={{ background: '#06030f' }}
      >
        <GridScanBg />

        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
          {/* Pulsing brand */}
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="text-center"
          >
            <div
              className="text-4xl font-black"
              style={{
                background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Gate of Decision
            </div>
          </motion.div>

          {/* Player name card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ios-glass rounded-3xl px-10 py-6 w-full text-center"
          >
            <div className="text-white/40 text-sm mb-1">Welcome</div>
            <div
              className="text-3xl font-black"
              style={{ color: '#c084fc', textShadow: '0 0 20px rgba(192,132,252,0.5)' }}
            >
              {player?.name}
            </div>
          </motion.div>

          {/* Waiting indicator */}
          <div className="ios-glass rounded-2xl px-6 py-4 w-full text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#a855f7' }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                />
              ))}
            </div>
            <p className="text-white/60 text-sm">Waiting for game to start</p>
            <p className="text-white/30 text-xs mt-1">{players.length} {players.length === 1 ? 'player' : 'players'} in session</p>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /*  QUESTION / ANSWERED                                                  */
  /* ══════════════════════════════════════════════════════════════════════ */
  if ((phase === 'question' || phase === 'answered') && currentQ) {
    const qIndex = (session.current_question_index ?? 0) + 1;
    return (
      <div
        className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
        style={{ background: '#06030f' }}
      >
        {/* GridScan replaces Ballpit — pure CSS, zero main-thread cost */}
        <GridScanBg />

        <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-md py-8">

          {/* ── Timer ── */}
          <div className="ios-glass rounded-3xl p-4 flex flex-col items-center">
            <TimerRing
              durationMs={timeLimitMs}
              startedAt={session.question_started_at}
              size={104}
            />
          </div>

          {/* ── Question card ── */}
          <div className="ios-glass rounded-3xl px-6 py-6 w-full text-center">
            <div
              className="text-xs font-bold tracking-widest mb-3 uppercase"
              style={{ color: '#a855f7' }}
            >
              QUESTION {qIndex}
            </div>
            <h2 className="text-xl font-bold text-white leading-relaxed">
              {currentQ.text}
            </h2>
          </div>

          {/* ── Options — plain buttons, onPointerDown for zero-latency response ── */}
          <div className="flex flex-col gap-3 w-full">
            {(['A', 'B'] as const).map((c) => {
              const isChosen = myChoice === c;
              const text     = c === 'A' ? currentQ.option_a : currentQ.option_b;
              const accent   = c === 'A' ? '#a855f7' : '#7c3aed';

              return (
                <button
                  key={c}
                  onPointerDown={(e) => { e.preventDefault(); submitAnswer(c); }}
                  disabled={!!myChoice}
                  className="w-full rounded-2xl text-left"
                  style={{
                    background: isChosen
                      ? `linear-gradient(135deg, ${accent}cc, #4c1d95cc)`
                      : myChoice
                        ? 'rgba(14,10,28,0.38)'
                        : 'rgba(14,10,28,0.68)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: `1.5px solid ${isChosen ? accent : 'rgba(168,85,247,0.22)'}`,
                    boxShadow: isChosen
                      ? `0 0 28px ${accent}50, inset 0 1px 0 rgba(255,255,255,0.12)`
                      : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    padding: '18px 20px',
                    opacity: myChoice && !isChosen ? 0.4 : 1,
                    transform: isChosen ? 'scale(1.01)' : 'scale(1)',
                    transition: 'opacity 0.2s, transform 0.15s, border-color 0.15s, background 0.15s',
                    touchAction: 'manipulation',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    cursor: myChoice ? 'default' : 'pointer',
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Label badge */}
                    <span
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-black"
                      style={{
                        background: isChosen ? 'rgba(255,255,255,0.22)' : 'rgba(168,85,247,0.18)',
                        color: isChosen ? 'white' : accent,
                        border: `1px solid ${isChosen ? 'rgba(255,255,255,0.2)' : 'rgba(168,85,247,0.2)'}`,
                      }}
                    >
                      {c}
                    </span>
                    <span className="text-base font-bold text-white leading-snug flex-1">
                      {text}
                    </span>
                    {isChosen && (
                      <span className="flex-shrink-0 text-white/80 text-lg">✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Waiting confirmation ── */}
          {myChoice && (
            <div className="ios-glass rounded-2xl px-6 py-3 text-center w-full">
              <p className="text-white/60 text-sm">
                You chose <span className="font-black text-purple-300">{myChoice}</span> — Waiting for reveal…
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /*  REVEALING                                                            */
  /* ══════════════════════════════════════════════════════════════════════ */
  if (phase === 'revealing' && currentQ) {
    const isCorrect  = choiceResult?.isCorrect ?? false;
    const scored     = choiceResult?.scored ?? 0;
    const resultColor = isCorrect ? '#22c55e' : '#ef4444';

    return (
      <div
        className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center gap-5 overflow-hidden"
        style={{ background: '#06030f' }}
      >
        <BallpitBg />

        <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm">
          {/* Result icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: `${resultColor}18`,
              border: `3px solid ${resultColor}`,
              boxShadow: `0 0 48px ${resultColor}55`,
            }}
          >
            {!myChoice ? (
              <span className="text-4xl font-black text-white/50">—</span>
            ) : isCorrect ? (
              <svg width="44" height="44" viewBox="0 0 44 44">
                <path d="M6 22 L17 33 L38 10" stroke="#22c55e" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            ) : (
              <svg width="44" height="44" viewBox="0 0 44 44">
                <path d="M11 11 L33 33 M33 11 L11 33" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              </svg>
            )}
          </motion.div>

          {/* Result text */}
          <div>
            <h2 className="text-2xl font-black text-white">
              {!myChoice ? 'No answer!' : isCorrect ? 'Correct! 🎉' : 'Wrong!'}
            </h2>
            {isCorrect && scored > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="text-5xl font-black text-yellow-400 mt-2"
                style={{ textShadow: '0 0 30px rgba(250,204,21,0.6)' }}
              >
                +{scored}
              </motion.div>
            )}
          </div>

          {/* Correct answer */}
          <div className="ios-glass rounded-2xl px-8 py-5 w-full">
            <div className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-2">CORRECT ANSWER</div>
            <div className="text-xl font-bold text-purple-300">
              {currentQ.correct_choice === 'A' ? currentQ.option_a : currentQ.option_b}
            </div>
          </div>

          {/* Total score */}
          <div className="ios-glass rounded-2xl px-8 py-4 w-full text-center">
            <div className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-1">YOUR SCORE</div>
            <div className="text-4xl font-black text-white">{myScore}</div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /*  LEADERBOARD                                                          */
  /* ══════════════════════════════════════════════════════════════════════ */
  if (phase === 'leaderboard') {
    const myRank = [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === player?.id) + 1;
    return (
      <div
        className="relative min-h-screen px-4 pt-6 pb-10 overflow-hidden"
        style={{ background: '#06030f' }}
      >
        <GridScanBg />
        <div className="relative z-10 max-w-md mx-auto">
          <h2 className="text-2xl font-black text-white text-center mb-5">
            <span style={{ color: '#f59e0b' }}>★</span> Standings
          </h2>
          {myRank > 0 && (
            <div className="ios-glass rounded-2xl px-6 py-4 text-center mb-4 flex justify-center gap-8">
              <div>
                <div className="text-white/40 text-xs mb-1">YOUR RANK</div>
                <div className="text-2xl font-black text-purple-400">#{myRank}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="text-white/40 text-xs mb-1">YOUR SCORE</div>
                <div className="text-2xl font-black text-yellow-400">{myScore}</div>
              </div>
            </div>
          )}
          <Leaderboard players={players} />
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /*  FINISHED                                                             */
  /* ══════════════════════════════════════════════════════════════════════ */
  if (phase === 'finished') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((p) => p.id === player?.id) + 1;
    const winner = sorted[0];
    const iWon   = myRank === 1;

    return (
      <div
        className="relative min-h-screen px-4 flex flex-col items-center justify-center gap-6 overflow-hidden"
        style={{ background: '#06030f' }}
      >
        <GridScanBg />

        <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm">
          {/* Trophy */}
          <motion.div
            initial={{ scale: 0, y: -30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="text-8xl"
            style={{ filter: iWon ? 'drop-shadow(0 0 40px rgba(245,158,11,0.8))' : 'none' }}
          >
            {iWon ? '🏆' : '🎖️'}
          </motion.div>

          <h2 className="text-3xl font-black text-white text-center">
            {iWon ? 'You Won! 🎉' : 'Game Over!'}
          </h2>

          {winner && !iWon && (
            <div className="ios-glass rounded-2xl px-6 py-3 text-center w-full">
              <div className="text-white/40 text-xs mb-1">Winner</div>
              <div className="text-xl font-bold text-yellow-400">{winner.name}</div>
            </div>
          )}

          {/* Final score */}
          <div className="ios-glass rounded-3xl px-10 py-6 text-center w-full">
            <div className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-2">FINAL SCORE</div>
            <div className="text-5xl font-black text-purple-300">{myScore}</div>
            <div className="text-white/40 text-sm mt-2">RANK #{myRank}</div>
          </div>

          <Leaderboard players={players} limit={5} />
        </div>
      </div>
    );
  }

  return null;
}
