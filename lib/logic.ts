// ============================================================
// بوابة القرار — Game Logic
// ============================================================

export const TIME_LIMIT_MS = 10_000; // 10 seconds default

/**
 * Calculate score earned for a correct answer based on speed.
 * Faster = more points. Wrong = 0.
 */
export function calculateScore(
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitMs: number = TIME_LIMIT_MS,
  currentStreak: number = 0
): number {
  if (!isCorrect) return 0;

  // Base: 50 pts, speed bonus up to 50 pts
  const ratio = Math.max(0, 1 - responseTimeMs / timeLimitMs);
  const speedBonus = Math.round(ratio * 50);
  const base = 50 + speedBonus;

  // Streak multiplier
  const streakBonus = getStreakBonus(currentStreak + 1); // +1 because this answer is correct
  return base + streakBonus;
}

/**
 * Returns streak bonus points.
 * 3 in a row: +20, 5 in a row: +50, 10 in a row: +100
 */
export function getStreakBonus(streak: number): number {
  if (streak >= 10) return 100;
  if (streak >= 5) return 50;
  if (streak >= 3) return 20;
  return 0;
}

/**
 * Build leaderboard from players array, sorted by score desc.
 */
export function buildLeaderboard(players: {
  id: string;
  name: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  streak: number;
  avg_speed_ms: number;
}[]) {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => ({ ...p, rank: idx + 1 }));
}

/**
 * Compute session stats from all answers + players.
 */
export function computeSessionStats(
  answers: {
    player_id: string;
    question_id: string;
    is_correct: boolean | null;
    response_time_ms: number | null;
    choice: string;
  }[],
  questions: { id: string; text: string; correct_choice: string }[],
  players: { id: string; name: string; score: number }[]
) {
  const totalAnswers = answers.length;
  const correctAnswers = answers.filter((a) => a.is_correct).length;
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  const fastestAnswer = answers
    .filter((a) => a.is_correct && a.response_time_ms != null)
    .sort((a, b) => (a.response_time_ms ?? 0) - (b.response_time_ms ?? 0))[0];

  const fastestPlayer = fastestAnswer
    ? players.find((p) => p.id === fastestAnswer.player_id)
    : null;

  // Per-question difficulty
  const questionStats = questions.map((q) => {
    const qAnswers = answers.filter((a) => a.question_id === q.id);
    const correct = qAnswers.filter((a) => a.is_correct).length;
    const total = qAnswers.length;
    const difficultyPct = total > 0 ? Math.round(((total - correct) / total) * 100) : 0;
    return { ...q, correct, total, difficultyPct };
  });

  const hardestQuestion = [...questionStats].sort((a, b) => b.difficultyPct - a.difficultyPct)[0];
  const easiestQuestion = [...questionStats].sort((a, b) => a.difficultyPct - b.difficultyPct)[0];

  return {
    totalAnswers,
    correctAnswers,
    accuracy,
    fastestPlayer,
    fastestAnswerMs: fastestAnswer?.response_time_ms ?? null,
    hardestQuestion,
    easiestQuestion,
    questionStats,
  };
}

/**
 * Generate a random 6-character session code (uppercase letters + digits).
 */
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Get speed label based on response time.
 */
export function getSpeedLabel(ms: number, limit: number = TIME_LIMIT_MS): string {
  const ratio = ms / limit;
  if (ratio <= 0.2) return '⚡ خاطف البوابة';
  if (ratio <= 0.4) return '🔥 سريع';
  if (ratio <= 0.6) return '✅ متوسط';
  if (ratio <= 0.8) return '🐢 بطيء';
  return '⏱ في آخر اللحظة';
}
