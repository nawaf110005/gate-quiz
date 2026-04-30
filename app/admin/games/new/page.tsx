'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function NewGamePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(10);
  const [loading, setLoading] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('games')
      .insert({ title, description, time_per_question: timePerQuestion * 1000 })
      .select()
      .single();

    if (!error && data) {
      router.push(`/admin/games/${data.id}/builder`);
    } else {
      alert('خطأ في إنشاء اللعبة');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/admin" className="text-white/40 hover:text-white/70">← الرجوع</Link>
          <h1 className="text-2xl font-black text-white">إنشاء لعبة جديدة</h1>
        </div>

        <form onSubmit={create} className="glass rounded-3xl p-8 flex flex-col gap-5">
          <div>
            <label className="block text-sm text-white/60 mb-2">اسم اللعبة *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مسابقة الثقافة العامة"
              required
              className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">وصف (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للعبة"
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">
              وقت كل سؤال: <span className="text-cyan-400 font-bold">{timePerQuestion} ثانية</span>
            </label>
            <input
              type="range"
              min={5}
              max={30}
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>5 ث</span><span>30 ث</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="mt-2 rounded-2xl py-4 text-lg font-bold text-black transition hover:scale-105 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}
          >
            {loading ? 'جاري الإنشاء…' : 'إنشاء اللعبة → إضافة الأسئلة'}
          </button>
        </form>
      </div>
    </div>
  );
}
