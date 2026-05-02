'use client';

import { motion } from 'framer-motion';

interface PlayerOrbProps {
  name: string;
  choice?: 'A' | 'B' | null;
  index: number;       // global index for unanswered spread
  groupIndex: number;  // index within choice group (0-based)
  isRevealed?: boolean;
  isCorrect?: boolean;
  score?: number;
}

const ORB_COLORS = [
  '#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
];

// Players now start in a holding row BELOW the portals.
// To enter the portal arch they must travel up ~240px from their holding position.
const ARCH_CENTER_Y = -240;

// Y spread within each portal group — keeps orbs inside arch
const GROUP_Y = [0, -22, 22, -44, 44, -11, 11, -33, 33, -55, 55, -16, 16, -38, 38];

// Y spread for unanswered players in center
const CENTER_Y = [-20, 20, -40, 40, 0, -10, 10, -30, 30];

export default function PlayerOrb({
  name,
  choice,
  index,
  groupIndex,
  isRevealed = false,
  isCorrect = false,
  score,
}: PlayerOrbProps) {
  const color = ORB_COLORS[index % ORB_COLORS.length];

  // LTR layout: Portal A is on the LEFT, Portal B on the RIGHT
  // So choice A → move LEFT (-), choice B → move RIGHT (+)
  const PORTAL_X = 230;
  const choiceX = choice === 'A' ? -PORTAL_X : choice === 'B' ? PORTAL_X : 0;
  const choiceY = ARCH_CENTER_Y + (GROUP_Y[groupIndex % GROUP_Y.length] ?? 0);

  const unansweredY = CENTER_Y[index % CENTER_Y.length];

  const targetX = choice ? choiceX : 0;
  const targetY = choice ? choiceY : unansweredY;

  return (
    <motion.div
      initial={{ x: 0, y: 60, opacity: 0, scale: 0 }}
      animate={{
        x: targetX,
        y: targetY,
        opacity: isRevealed && !isCorrect ? 0.28 : 1,
        scale: isRevealed && isCorrect ? [1, 1.35, 1] : 1,
      }}
      transition={{
        x: { duration: 0.75, delay: choice ? Math.min(groupIndex * 0.04, 0.5) : 0, ease: 'easeOut' },
        y: { duration: 0.75, delay: choice ? Math.min(groupIndex * 0.04, 0.5) : 0, ease: 'easeOut' },
        scale: { duration: 0.5, delay: isRevealed ? 0.25 : 0 },
        opacity: { duration: 0.3 },
      }}
      className="absolute flex flex-col items-center"
      style={{ zIndex: 10 }}
    >
      {/* Orb circle */}
      <div
        className="relative flex h-10 w-10 items-center justify-center rounded-full font-black text-sm text-black"
        style={{
          background: `radial-gradient(circle at 35% 35%, white, ${color})`,
          boxShadow: `0 0 14px ${color}, 0 0 28px ${color}55`,
        }}
      >
        {name[0]?.toUpperCase()}

        {/* Score pop */}
        {isRevealed && isCorrect && score !== undefined && score > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [1, 1, 0], y: -28 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="absolute -top-6 text-xs font-bold text-yellow-400 whitespace-nowrap"
          >
            +{score}
          </motion.div>
        )}
      </div>

      {/* Name label */}
      <div
        className="mt-1 rounded px-1 text-[10px] font-semibold text-white/80 whitespace-nowrap max-w-[64px] truncate text-center"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
      >
        {name}
      </div>
    </motion.div>
  );
}
