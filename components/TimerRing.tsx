'use client';

import { useEffect, useState } from 'react';

interface TimerRingProps {
  durationMs: number;
  startedAt: string | null;
  onExpire?: () => void;
  size?: number;
}

export default function TimerRing({
  durationMs,
  startedAt,
  onExpire,
  size = 120,
}: TimerRingProps) {
  const [remaining, setRemaining] = useState(durationMs);

  useEffect(() => {
    if (!startedAt) {
      setRemaining(durationMs);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      const left = Math.max(0, durationMs - elapsed);
      setRemaining(left);
      if (left === 0 && onExpire) onExpire();
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [startedAt, durationMs, onExpire]);

  const pct = remaining / durationMs; // 1 → 0
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * pct;

  const color =
    pct > 0.5 ? '#22d3ee' : pct > 0.25 ? '#f59e0b' : '#ef4444';

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ position: 'absolute' }}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={8}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.1s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        className="font-bold tabular-nums"
        style={{ fontSize: size * 0.3, color }}
      >
        {seconds}
      </span>
    </div>
  );
}
