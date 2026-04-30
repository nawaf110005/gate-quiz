import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 text-center">
      {/* Logo */}
      <div>
        <div
          className="mx-auto mb-4 text-7xl font-black"
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          بوابة القرار
        </div>
        <p className="text-white/50 text-xl">اختر بسرعة… واعبر</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/admin"
          className="rounded-2xl px-8 py-4 text-lg font-bold text-black transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        >
          🎮 لوحة الأدمن
        </Link>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0a0012] px-4 text-white/30 text-sm">أو</span>
          </div>
        </div>

        <JoinForm />
      </div>

      {/* Footer */}
      <p className="text-white/20 text-xs mt-8">
        Powered by Next.js + Supabase + Vercel
      </p>
    </main>
  );
}

function JoinForm() {
  return (
    <form action="/play" method="GET" className="flex flex-col gap-3">
      <input
        name="code"
        type="text"
        placeholder="أدخل كود الجلسة"
        maxLength={6}
        className="rounded-2xl px-6 py-4 text-center text-xl font-bold uppercase tracking-widest text-white placeholder-white/30 outline-none"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
      />
      <button
        type="submit"
        className="rounded-2xl px-8 py-4 text-lg font-bold text-white transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #a855f7, #6b21a8)' }}
      >
        دخول اللعبة 🚀
      </button>
    </form>
  );
}
