'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Game, Question } from '@/lib/supabase';

export default function BuilderPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Game settings
  const [timeSetting, setTimeSetting] = useState(10000);
  const [savingTime, setSavingTime] = useState(false);

  // New question form state
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [correct, setCorrect] = useState<'A' | 'B'>('A');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [gRes, qRes] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('questions').select('*').eq('game_id', gameId).order('order_index'),
    ]);
    setGame(gRes.data);
    if (gRes.data?.time_per_question) setTimeSetting(gRes.data.time_per_question);
    setQuestions(qRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [gameId]);

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !optA.trim() || !optB.trim()) return;
    setSaving(true);

    await supabase.from('questions').insert({
      game_id: gameId,
      text: qText.trim(),
      option_a: optA.trim(),
      option_b: optB.trim(),
      correct_choice: correct,
      order_index: questions.length,
    });

    setQText(''); setOptA(''); setOptB(''); setCorrect('A');
    await fetchData();
    setSaving(false);
  };

  const saveTimeSetting = async () => {
    setSavingTime(true);
    await supabase.from('games').update({ time_per_question: timeSetting }).eq('id', gameId);
    setSavingTime(false);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('questions').delete().eq('id', id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white/40">جاري التحميل…</div>;

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-white/40 hover:text-white/70">← الرجوع</Link>
          <div>
            <h1 className="text-2xl font-black text-white">{game?.title}</h1>
            <p className="text-white/40 text-sm">{questions.length} سؤال</p>
          </div>
        </div>
        {questions.length > 0 && (
          <StartSessionButton gameId={gameId} />
        )}
      </div>

      {/* Game Settings */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h3 className="font-bold text-white mb-3 text-sm">إعدادات اللعبة</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-white/50 text-xs">وقت السؤال (ثانية)</label>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 20, 30].map((s) => (
                <button
                  key={s}
                  onClick={() => setTimeSetting(s * 1000)}
                  className="rounded-xl px-3 py-1.5 text-sm font-bold transition"
                  style={{
                    background: timeSetting === s * 1000 ? '#06b6d4' : 'rgba(6,182,212,0.1)',
                    color: timeSetting === s * 1000 ? '#000' : '#06b6d4',
                    border: `1px solid ${timeSetting === s * 1000 ? '#06b6d4' : 'rgba(6,182,212,0.3)'}`,
                  }}
                >
                  {s}s
                </button>
              ))}
              <button
                onClick={saveTimeSetting}
                disabled={savingTime}
                className="rounded-xl px-4 py-1.5 text-sm font-bold text-black disabled:opacity-40 transition"
                style={{ background: '#22c55e' }}
              >
                {savingTime ? '...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Questions list */}
      <div className="mb-8 flex flex-col gap-3">
        {questions.map((q, idx) => (
          <div key={q.id} className="glass rounded-2xl p-5 flex gap-4 items-start">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black"
              style={{ background: 'rgba(6,182,212,0.2)', color: '#06b6d4' }}
            >
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white mb-2">{q.text}</div>
              <div className="flex gap-3">
                <span
                  className="rounded-lg px-3 py-1 text-sm font-semibold"
                  style={{
                    background: q.correct_choice === 'A' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)',
                    color: q.correct_choice === 'A' ? '#22c55e' : '#f87171',
                    border: `1px solid ${q.correct_choice === 'A' ? '#22c55e40' : '#ef444440'}`,
                  }}
                >
                  A: {q.option_a} {q.correct_choice === 'A' && '✓'}
                </span>
                <span
                  className="rounded-lg px-3 py-1 text-sm font-semibold"
                  style={{
                    background: q.correct_choice === 'B' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)',
                    color: q.correct_choice === 'B' ? '#22c55e' : '#f87171',
                    border: `1px solid ${q.correct_choice === 'B' ? '#22c55e40' : '#ef444440'}`,
                  }}
                >
                  B: {q.option_b} {q.correct_choice === 'B' && '✓'}
                </span>
              </div>
            </div>
            <button
              onClick={() => deleteQuestion(q.id)}
              className="text-white/30 hover:text-red-400 text-xl transition"
            >
              ✕
            </button>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-white/30">
            لا توجد أسئفة بعد — أضف أول سؤال أدماه
          </div>
        )}
      </div>

      {/* Add question form */}
      <div className="glass rounded-3xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">إضافة سؤال جديد</h2>
        <form onSubmit={addQuestion} className="flex flex-col gap-4">
          <textarea
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="نص السؤال"
            rows={2}
            required
            className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-cyan-400 mb-1 font-semibold">الخيار A</label>
              <input
                value={optA}
                onChange={(e) => setOptA(e.target.value)}
                placeholder="الخيار الأول"
                required
                className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.3)' }}
              />
            </div>
            <div>
              <label className="block text-xs text-purple-400 mb-1 font-semibold">الخيار B</label>
              <input
                value={optB}
                onChange={(e) => setOptB(e.target.value)}
                placeholder="الخيار الثاني"
                required
                className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-2">الإجابة الصحيحة</label>
            <div className="flex gap-3">
              {(['A', 'B'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCorrect(c)}
                  className="flex-1 rounded-xl py-3 font-bold text-lg transition"
                  style={{
                    background: correct === c ? (c === 'A' ? '#06b6d4' : '#a855f7') : 'rgba(255,255,255,0.05)',
                    color: correct === c ? '#000' : '#ffffff60',
                    border: `2px solid ${correct === c ? (c === 'A' ? '#06b6d4' : '#a855f7') : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {c} {correct === c && '✓'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl py-3 font-bold text-white transition hover:scale-105 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#a855f7,#6b21a8)' }}
          >
            {saving ? 'جاري الحفظ…' : '+ إضافة السؤال'}
          </button>
        </form>
      </div>
    </div>
  );
}

function StartSessionButton({ gameId }: { gameId: string }) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('sessions')
      .insert({ game_id: gameId, code, status: 'waiting' })
      .select()
      .single();

    if (!error && data) {
      window.location.href = `/admin/sessions/${data.id}/control`;
    } else {
      alert('خط في in إنجاء الجلسة');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={start}
      disabled={loading}
      className="rounded-xl px-6 py-3 font-bold text-black transition hover:scale-105 disabled:opacity-40"
      style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
    >
      {loading ? '…' : '▶ بدء جلسة مباشرة'}
    </button>
  );
}
