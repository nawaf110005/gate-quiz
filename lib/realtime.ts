'use client';

import { useEffect, useState } from 'react';
import { supabase, Session, Player, Answer } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Hook: subscribe to session changes ──────────────────────────────────────
export function useSession(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch
    supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => setSession(data));

    // Realtime subscription
    const channel: RealtimeChannel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as Session)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return session;
}

// ─── Hook: subscribe to session by code ──────────────────────────────────────
export function useSessionByCode(code: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .single()
      .then(({ data }) => {
        setSession(data);
        setLoading(false);
      });

    const channel: RealtimeChannel = supabase
      .channel(`session-code:${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `code=eq.${code}` },
        (payload) => setSession(payload.new as Session)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [code]);

  return { session, loading };
}

// ─── Hook: subscribe to players in a session ─────────────────────────────────
export function usePlayers(sessionId: string) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })
      .then(({ data }) => setPlayers(data ?? []));

    const channel: RealtimeChannel = supabase
      .channel(`players:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sessionId}` },
        () => {
          // Refetch sorted
          supabase
            .from('players')
            .select('*')
            .eq('session_id', sessionId)
            .order('score', { ascending: false })
            .then(({ data }) => setPlayers(data ?? []));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return players;
}

// ─── Hook: subscribe to answers for current question ─────────────────────────
export function useAnswers(sessionId: string, questionId: string | null) {
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    if (!sessionId || !questionId) {
      setAnswers([]);
      return;
    }

    supabase
      .from('answers')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .then(({ data }) => setAnswers(data ?? []));

    const channel: RealtimeChannel = supabase
      .channel(`answers:${sessionId}:${questionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const newAnswer = payload.new as Answer;
          if (newAnswer.question_id === questionId) {
            setAnswers((prev) => {
              if (prev.find((a) => a.id === newAnswer.id)) return prev;
              return [...prev, newAnswer];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, questionId]);

  return answers;
}
