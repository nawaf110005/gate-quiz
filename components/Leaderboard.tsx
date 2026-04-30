'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/supabase';

interface LeaderboardProps {
  players: Player[];
  limit?: number;
  showStats?: boolean;
}

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ players, limit = 10, showStats = false }: LeaderboardProps) {
  const sorted = [...players]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      <AnimatePresence>
        {sorted.map((player, idx) => (
          <motion.div
            key={player.id}
            layout
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ delay: idx * 0.06 }}
            className="flex items-center gap-4 rounded-2xl px-5 py-3"
            style={{
              background:
                idx === 0
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.05))'
                  : idx === 1
                  ? 'linear-gradient(135deg, rgba(148,163,184,0.2), rgba(148,163,184,0.05))'
                  : idx === 2
                  ? 'linear-gradient(135deg, rgba(180,83,9,0.2), rgba(180,83,9,0.05))'
                  : 'rgba(255,255,255,0.05)',
              border: `1px solid ${
                idx === 0
                  ? 'rgba(245,158,11,0.4)'
                  : idx === 1
                  ? 'rgba(148,163,184,0.3)'
                  : idx === 2
                  ? 'rgba(180,83,9,0.3)'
                  : 'rgba(255,255,255,0.08)'
              }`,
            }}
          >
            {/* Rank */}
            <div className="w-8 text-center text-xl">
              {idx < 3 ? medals[idx] : <span className="text-white/40 text-sm font-bold">#{idx + 1}</span>}
            </div>

            {/* Name */}
            <div className="flex-1 font-bold text-white text-lg truncate">{player.name}</div>

            {/* Stats (optional) */}
            {showStats && (
              <div className="flex gap-4 text-xs text-white/50">
                <span>✅ {player.correct_count}</span>
                <span>❌ {player.wrong_count}</span>
                {player.streak > 2 && (
                  <span className="text-orange-400">🔥 ×{player.streak}</span>
                )}
              </div>
            )}

            {/* Score */}
            <div
              className="text-xl font-black tabular-nums"
              style={{
                color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#22d3ee',
              }}
            >
              {player.score.toLocaleString()}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {players.length === 0 && (
        <div className="text-center text-white/30 py-10">لا يوجد لاعبون بعد…</div>
      )}
    </div>
  );
}
