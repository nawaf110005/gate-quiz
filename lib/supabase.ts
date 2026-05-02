import { createClient } from '@supabase/supabase-js';

// Production Supabase project (gate-quiz, null forge org).
// Pinned directly so the correct project is always used regardless of
// any stale values that may exist in the hosting platform env dashboard.
const supabaseUrl = 'https://wdnkxlucmvrequmqksgv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkbmt4bHVjbXZyZXF1bXFrc2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTc2OTQsImV4cCI6MjA5MzEzMzY5NH0' +
  '.MmauupyyCHEyPcm4eChJAt3skKigJPiy9Jda-lJ-5mU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Game = {
  id: string;
  title: string;
  description: string | null;
  time_per_question: number;
  created_at: string;
};

export type Question = {
  id: string;
  game_id: string;
  text: string;
  option_a: string;
  option_b: string;
  correct_choice: 'A' | 'B';
  order_index: number;
  created_at: string;
};

export type Session = {
  id: string;
  game_id: string;
  code: string;
  status: 'waiting' | 'question' | 'revealing' | 'leaderboard' | 'finished';
  current_question_index: number;
  current_question_id: string | null;
  question_started_at: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  session_id: string;
  name: string;
  score: number;
  streak: number;
  correct_count: number;
  wrong_count: number;
  avg_speed_ms: number;
  created_at: string;
};

export type Answer = {
  id: string;
  session_id: string;
  question_id: string;
  player_id: string;
  choice: 'A' | 'B';
  answered_at: string;
  response_time_ms: number | null;
  is_correct: boolean | null;
  score_earned: number;
};
