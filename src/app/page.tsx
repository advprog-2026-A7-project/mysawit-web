import Link from 'next/link';

export default function Home() {
  return (
    <main
      className="min-h-screen bg-cover bg-center text-white"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(8,17,15,0.96) 0%, rgba(8,17,15,0.9) 38%, rgba(8,17,15,0.42) 78%), url('/mysawit-hero.jpg')",
      }}
    >
      <div className="min-h-screen page-shell flex flex-col gap-10">
        <header className="flex items-center justify-between py-2">
          <div>
            <p className="page-eyebrow">MySawit</p>
            <p className="text-sm text-slate-400">Sistem operasional kebun sawit</p>
          </div>
        </header>

        <section className="max-w-3xl flex-1 flex flex-col justify-center space-y-7 pb-12">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Manajemen Kebun Sawit Modern
            </h1>
            <p className="text-base md:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Platform terintegrasi <strong className="text-white">BurhanSawit</strong> untuk mengkoordinasi buruh, mandor,
              supir truk, dan admin dari panen harian sampai pengiriman TBS.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/login" className="btn-primary text-base px-6 py-3 justify-center">
              Masuk ke Dashboard
            </Link>
            <Link href="/register" className="btn-secondary text-base px-6 py-3 justify-center bg-black/30">
              Daftar Akun Baru
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
