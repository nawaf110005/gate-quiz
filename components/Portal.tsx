'use client';

import { motion } from 'framer-motion';

interface PortalProps {
  label: string;
  optionText: string;
  side: 'A' | 'B';
  isRevealed?: boolean;
  isCorrect?: boolean;
  count?: number;
}

export default function Portal({
  label,
  optionText,
  side,
  isRevealed = false,
  isCorrect = false,
  count = 0,
}: PortalProps) {
  const baseColor = side === 'A' ? '#06b6d4' : '#a855f7';
  const glowColor = side === 'A' ? 'rgba(6,182,212,0.8)' : 'rgba(168,85,247,0.8)';

  let borderColor = baseColor;
  let shadowColor = glowColor;
  let opacity = 1;

  if (isRevealed) {
    if (isCorrect) {
      borderColor = '#22c55e';
      shadowColor = 'rgba(34,197,94,0.9)';
    } else {
      borderColor = '#ef4444';
      shadowColor = 'rgba(239,68,68,0.5)';
      opacity = 0.45;
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: isRevealed && isCorrect ? [1, 1.12, 1] : 1,
        opacity,
        rotate: isRevealed && isCorrect ? [0, 2, -2, 0] : 0,
      }}
      transition={{ duration: 0.7 }}
      className="flex flex-col items-center gap-3 select-none"
    >
      {/* Portal ring */}
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 200,
          height: 200,
          border: `4px solid ${borderColor}`,
          boxShadow: `0 0 40px ${shadowColor}, 0 0 80px ${shadowColor}40, inset 0 0 40px ${shadowColor}20`,
          background: `radial-gradient(circle, ${borderColor}15 0%, transparent 70%)`,
          transition: 'all 0.5s ease',
        }}
      >
        {/* Spinning outer ring */}
        {!isRevealed && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px dashed ${baseColor}60`,
              borderRadius: '50%',
            }}
          />
        )}

        {/* Correct checkmark */}
        {isRevealed && isCorrect && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            className="absolute text-6xl"
          >
            ✅
          </motion.div>
        )}

        {/* Wrong X */}
        {isRevealed && !isCorrect && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            className="absolute text-6xl"
          >
            ❌
          </motion.div>
        )}

        {/* Label */}
        {!isRevealed && (
          <span
            className="text-5xl font-black"
            style={{ color: borderColor, textShadow: `0 0 20px ${shadowColor}` }}
          >
            {label}
          </span>
        )}
      </div>

      {/* Count badge */}
      {count > 0 && (
        <motion.div
          key={count}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="rounded-full px-4 py-1 text-sm font-bold"
          style={{
            background: `${borderColor}30`,
            border: `1px solid ${borderColor}`,
            color: borderColor,
          }}
        >
          {count} لاعب
        </motion.div>
      )}

      {/* Option text */}
      <div
        className="max-w-[220px] rounded-2xl px-5 py-3 text-center text-lg font-bold text-white"
        style={{
          background: `${borderColor}20`,
          border: `1px solid ${borderColor}50`,
        }}
      >
        {optionText}
      </div>
    </motion.div>
  );
}
