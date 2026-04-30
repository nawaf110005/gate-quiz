'use client';

import { motion } from 'framer-motion';

interface PlayerOrbProps {
  name: string;
  choice?: 'A' | 'B' | null;
  index: number;
  isRevealed?: boolean;
  isCorrect?: boolean;
  score?: number;
}

const ORB_COLORS = [
  '#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
];

export default function PlayerOrb({
  name,
  choice,
  index,
  isRevealed = false,
  isCorrect = false,
  score,
}: PlayerOrbProps) {
  const color = ORB_COLORS[index % ORB_COLORS.length];

  // Position in waiting state: scattered in center area
  const centerX = 0;
  const centerY = 0;

  // After choosing, move toward portal
  const choiceX = choice === 'A' ? -260 : choice === 'B' ? 260 : centerX;
  const choiceY = -60 + (index % 8) * 20;

  // After reveal, bounce or fade
  const targetX = choice ? choiceX : centerX;
  const targetY = choice ? choiceY : centerY + (index % 5) * 15;

  return (
    <motion.div
      initial={{ x: 0, y: 80, opacity: 0, scale: 0 }}
      animate={{
        x: targetX,
        y: targetY,
        opacity: isRevealed && !isCorrect ? 0.3 : 1,
        scale: isRevealed && isCorrect ? [1, 1.3, 1] : 1,
      }}
      transition={{
        x: { duration: 0.8, delay: choice ? index * 0.03 : 0, ease: 'easeOut' },
        y: { duration: 0.8, delay: choice ? index * 0.03 : 0, ease: 'easeOut' },
        scale: { duration: 0.5, delay: isRevealed ? 0.3 : 0 },
        opacity: { duration: 0.3 },
      }}
      className="absolute flex flex-col items-center"
      style={{ zIndex: 10 }}
    >
      {/* Orb */}
      <div
        className="relative flex h-10 w-10 items-center justify-center rounded-full font-black text-sm text-black"
        style={{
          background: `radial-gradient(circle at 35% 35%, white, ${color})`,
          boxShadow: `0 0 16px ${color}, 0 0 32px ${color}60`,
        }}
      >
        {name[0]?.toUpperCase()}

        {/* Score pop */}
        {isRevealed && isCorrect && score !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [1, 1, 0], y: -30 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="absolute -top-6 text-xs font-bold text-yellow-400 whitespace-nowrap"
          >
            +{score}
          </motion.div>
        )}
      </div>

      {/* Name label */}
      <div
        className="mt-1 rounded px-1 text-[10px] font-semibold text-white/80 whitespace-nowrap max-w-[60px] truncate text-center"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
      >
        {name}
      </div>
    </motion.div>
  );
}
