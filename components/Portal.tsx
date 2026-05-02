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
  const gateColor = isRevealed ? (isCorrect ? '#22c55e' : '#ef4444') : baseColor;

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: isRevealed && isCorrect ? [1, 1.07, 1] : 1,
        opacity: isRevealed && !isCorrect ? 0.38 : 1,
      }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
      className="flex flex-col items-center gap-3 select-none"
    >
      {/* ── Arch Gate ───────────────────────────────── */}
      <div className="relative" style={{ width: 170, height: 220 }}>

        {/* Outer pulse glow */}
        <motion.div
          animate={!isRevealed
            ? { opacity: [0.35, 0.85, 0.35] }
            : { opacity: isCorrect ? 1 : 0.15 }
          }
          transition={!isRevealed
            ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.5 }
          }
          className="pointer-events-none absolute"
          style={{
            inset: -10,
            borderRadius: '95px 95px 18px 18px',
            boxShadow: `0 0 35px ${gateColor}, 0 0 70px ${gateColor}55`,
          }}
        />

        {/* Main arch frame */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: '85px 85px 8px 8px',
            border: `3px solid ${gateColor}`,
            transition: 'border-color 0.4s, box-shadow 0.4s',
            boxShadow: isRevealed && isCorrect
              ? `0 0 50px #22c55e, inset 0 0 30px #22c55e18`
              : `inset 0 0 20px ${gateColor}15`,
          }}
        />

        {/* Rotating outer dashed ring — active only */}
        {!isRevealed && (
          <motion.div
            animate={{ rotate: side === 'A' ? 360 : -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute pointer-events-none"
            style={{
              inset: -8,
              borderRadius: '93px 93px 16px 16px',
              border: `1.5px dashed ${gateColor}40`,
            }}
          />
        )}

        {/* Inner energy field */}
        <div
          className="absolute overflow-hidden"
          style={{
            inset: 3,
            borderRadius: '82px 82px 5px 5px',
            background: `radial-gradient(ellipse at 50% 25%, ${gateColor}20 0%, #060010 75%)`,
          }}
        >
          {/* Floating particles */}
          {!isRevealed && Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ y: [220, -10], opacity: [0, 0.7, 0] }}
              transition={{
                duration: 1.6 + i * 0.25,
                delay: i * 0.35,
                repeat: Infinity,
                ease: 'easeIn',
              }}
              className="absolute rounded-full"
              style={{
                width: i % 2 === 0 ? 2 : 3,
                height: i % 2 === 0 ? 2 : 3,
                background: gateColor,
                left: `${12 + i * 12}%`,
                bottom: 0,
                boxShadow: `0 0 4px ${gateColor}`,
              }}
            />
          ))}

          {/* Horizontal scan line */}
          {!isRevealed && (
            <motion.div
              animate={{ y: [-10, 230] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
              className="absolute left-0 right-0"
              style={{
                height: 1,
                background: `linear-gradient(90deg, transparent 5%, ${gateColor}60 35%, ${gateColor}90 50%, ${gateColor}60 65%, transparent 95%)`,
                top: 0,
              }}
            />
          )}

          {/* Correct flash */}
          {isRevealed && isCorrect && (
            <motion.div
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
              style={{ background: '#22c55e20' }}
            />
          )}

          {/* Subtle vertical grid lines */}
          {!isRevealed && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${gateColor}20 0px, transparent 1px, transparent 28px, ${gateColor}20 29px)`,
              }}
            />
          )}
        </div>

        {/* Center label / icon */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: -8 }}>
          {!isRevealed ? (
            <motion.span
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="font-black"
              style={{
                fontSize: 52,
                lineHeight: 1,
                color: gateColor,
                textShadow: `0 0 25px ${gateColor}, 0 0 50px ${gateColor}70`,
                fontFamily: 'monospace',
              }}
            >
              {label}
            </motion.span>
          ) : isCorrect ? (
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <motion.path
                d="M 12 36 L 28 54 L 60 18"
                stroke="#22c55e"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </svg>
          ) : (
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <motion.path
                d="M 18 18 L 54 54"
                stroke="#ef4444"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              />
              <motion.path
                d="M 54 18 L 18 54"
                stroke="#ef4444"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.18 }}
              />
            </svg>
          )}
        </div>

        {/* Bottom corner accents — gate post brackets */}
        <div className="absolute bottom-0 left-0 w-4 h-4" style={{ borderLeft: `2px solid ${gateColor}70`, borderBottom: `2px solid ${gateColor}70` }} />
        <div className="absolute bottom-0 right-0 w-4 h-4" style={{ borderRight: `2px solid ${gateColor}70`, borderBottom: `2px solid ${gateColor}70` }} />
      </div>

      {/* Count */}
      <motion.div
        key={count}
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        className="font-mono font-black text-xl h-7"
        style={{ color: gateColor, textShadow: `0 0 12px ${gateColor}` }}
      >
        {count > 0 ? `×${count}` : ''}
      </motion.div>

      {/* Option text */}
      <div
        className="max-w-[190px] rounded-xl px-4 py-2 text-center text-sm font-semibold text-white/85"
        style={{
          background: `${gateColor}12`,
          border: `1px solid ${gateColor}35`,
        }}
      >
        {optionText}
      </div>
    </motion.div>
  );
}
