'use client';

import { useState, useCallback } from 'react';
import Portal from './Portal';
import PlayerOrb from './PlayerOrb';
import TimerRing from './TimerRing';
import FallingText from './FallingText';
import { Answer, Player, Question } from '@/lib/supabase';

interface LiveArenaProps {
  question: Question;
  players: Player[];
  answers: Answer[];
  isRevealed: boolean;
  startedAt: string | null;
  timeLimitMs?: number;
}

export default function LiveArena({
  question,
  players,
  answers,
  isRevealed,
  startedAt,
  timeLimitMs = 10000,
}: LiveArenaProps) {
  const [showTimeUp, setShowTimeUp] = useState(false);

  const handleExpire = useCallback(() => {
    if (isRevealed) return;
    setShowTimeUp(true);
    setTimeout(() => setShowTimeUp(false), 3000);
  }, [isRevealed]);

  // Map player_id → answer
  const playerAnswers = Object.fromEntries(answers.map((a) => [a.player_id, a]));

  const countA = answers.filter((a) => a.choice === 'A').length;
  const countB = answers.filter((a) => a.choice === 'B').length;

  // Compute group index (position within the A-group or B-group) for each player.
  // This keeps orbs neatly stacked inside their portal arch.
  const groupIndexMap: Record<string, number> = {};
  let aIdx = 0;
  let bIdx = 0;
  let unIdx = 0;
  players.forEach((p) => {
    const choice = playerAnswers[p.id]?.choice;
    if (choice === 'A') {
      groupIndexMap[p.id] = aIdx++;
    } else if (choice === 'B') {
      groupIndexMap[p.id] = bIdx++;
    } else {
      groupIndexMap[p.id] = unIdx++;
    }
  });

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden select-none">
      {/* Time-up FallingText overlay */}
      {showTimeUp && (
        <div
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        >
          <FallingText
            text="انتهى الوقت!"
            trigger="auto"
            fontSize="4rem"
            gravity={1.2}
            mouseConstraintStiffness={0}
            backgroundColor="transparent"
          />
        </div>
      )}
      {/* Background particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-15"
            style={{
              width: Math.random() * 5 + 2,
              height: Math.random() * 5 + 2,
              background: i % 2 === 0 ? '#06b6d4' : '#a855f7',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `orbFloat ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Question text */}
      <div
        className="mb-10 max-w-3xl rounded-3xl px-10 py-6 text-center text-2xl font-bold text-white"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {question.text}
      </div>

      {/* Portals + Timer row */}
      <div className="relative flex items-center gap-20">
        {/* Portal A */}
        <Portal
          label="A"
          optionText={question.option_a}
          side="A"
          isRevealed={isRevealed}
          isCorrect={question.correct_choice === 'A'}
          count={countA}
        />

        {/* Timer in center */}
        <div className="flex flex-col items-center gap-2">
          {!isRevealed && (
            <TimerRing
              durationMs={timeLimitMs}
              startedAt={startedAt}
              size={100}
              onExpire={handleExpire}
            />
          )}
          {isRevealed && (
            <div className="text-center">
              <div
                className="text-4xl font-black"
                style={{ color: '#f59e0b', textShadow: '0 0 20px rgba(245,158,11,0.7)' }}
              >
                ★
              </div>
              <div className="mt-2 text-base font-bold text-yellow-400 max-w-[120px] text-center">
                {question.correct_choice === 'A' ? question.option_a : question.option_b}
              </div>
            </div>
          )}
          <div className="text-xs text-white/35 mt-1">
            {answers.length} / {players.length} أجابوا
          </div>
        </div>

        {/* Portal B */}
        <Portal
          label="B"
          optionText={question.option_b}
          side="B"
          isRevealed={isRevealed}
          isCorrect={question.correct_choice === 'B'}
          count={countB}
        />

        {/* Player orbs — centered in the portals row */}
        <div
          className="pointer-events-none absolute"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          {players.map((player, i) => {
            const ans = playerAnswers[player.id];
            return (
              <PlayerOrb
                key={player.id}
                name={player.name}
                choice={ans?.choice ?? null}
                index={i}
                groupIndex={groupIndexMap[player.id] ?? i}
                isRevealed={isRevealed}
                isCorrect={ans?.is_correct ?? false}
                score={ans?.score_earned}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
