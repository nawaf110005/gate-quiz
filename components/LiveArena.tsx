'use client';

import Portal from './Portal';
import PlayerOrb from './PlayerOrb';
import TimerRing from './TimerRing';
import { Answer, Player, Question } from '@/lib/supabase';

interface LiveArenaProps {
  question: Question;
  players: Player[];
  answers: Answer[];
  isRevealed: boolean;
  startedAt: string | null;
}

export default function LiveArena({
  question,
  players,
  answers,
  isRevealed,
  startedAt,
}: LiveArenaProps) {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const countA = answers.filter((a) => a.choice === 'A').length;
  const countB = answers.filter((a) => a.choice === 'B').length;

  // Map players to their choices
  const playerAnswers = Object.fromEntries(answers.map((a) => [a.player_id, a]));

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden select-none">
      {/* Background particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
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
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 60px rgba(6,182,212,0.1)',
        }}
      >
        {question.text}
      </div>

      {/* Portals + Timer row */}
      <div className="relative flex items-center gap-24">
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
              durationMs={10000}
              startedAt={startedAt}
              size={100}
            />
          )}
          {isRevealed && (
            <div className="text-center">
              <div className="text-5xl">🏆</div>
              <div className="mt-2 text-lg font-bold text-yellow-400">
                {question.correct_choice === 'A' ? question.option_a : question.option_b}
              </div>
            </div>
          )}
          <div className="text-xs text-white/40 mt-1">
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

        {/* Player orbs floating in arena */}
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
