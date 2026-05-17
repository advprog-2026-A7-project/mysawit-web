import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--bg-base)]" />
      <div className="absolute top-[-15%] left-[-5%] w-[600px] h-[600px] bg-green-600/10 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '4s' }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.03)_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-4xl text-center space-y-10">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
          MySawit Platform v2.0
        </div>

        {/* Hero */}
        <div className="animate-fade-in-up space-y-5" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400">
              Manajemen Kebun
            </span>
            <br />
            <span className="text-white">Sawit Modern.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Platform terintegrasi <strong className="text-slate-200">BurhanSawit</strong> untuk mengkoordinasi buruh, mandor, 
            supir truk, dan admin — dari panen hingga pengiriman ke pabrik produksi.
          </p>
        </div>

        {/* CTA */}
        <div className="animate-fade-in-up flex flex-col sm:flex-row gap-4 justify-center" style={{ animationDelay: '0.2s' }}>
          <Link href="/login" className="btn-primary text-base px-8 py-4 rounded-xl justify-center shadow-lg shadow-green-900/40">
            Masuk ke Dashboard →
          </Link>
          <Link href="/register" className="btn-secondary text-base px-8 py-4 rounded-xl justify-center">
            Daftar Akun Baru
          </Link>
        </div>

        {/* Feature grid */}
        <div className="animate-fade-in-up grid grid-cols-2 md:grid-cols-4 gap-4 pt-4" style={{ animationDelay: '0.3s' }}>
          {[
            { icon: '👤', title: 'Identity & RBAC', desc: 'JWT, OAuth Google, Role Management' },
            { icon: '🌴', title: 'Plantations', desc: 'CRUD Kebun, Koordinat, Mandor' },
            { icon: '🌾', title: 'Harvest', desc: 'Log Panen, Approval, Foto' },
            { icon: '🚚', title: 'Shipment', desc: 'State Machine, Logistik TBS' },
          ].map(f => (
            <div key={f.title} className="glass-card p-5 text-left group hover:border-green-500/20 transition-all hover:-translate-y-1">
              <div className="text-2xl mb-3 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
              <p className="font-bold text-white text-sm mb-1">{f.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Roles */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-xs text-slate-600 mb-3 uppercase tracking-widest">Didukung untuk semua peran</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { role: 'Admin Utama', cls: 'badge-purple' },
              { role: 'Mandor', cls: 'badge-blue' },
              { role: 'Buruh Sawit', cls: 'badge-green' },
              { role: 'Supir Truk', cls: 'badge-orange' },
            ].map(r => (
              <span key={r.role} className={`badge ${r.cls} text-[11px] px-4 py-1.5`}>{r.role}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-[var(--bg-base)] to-transparent pointer-events-none" />
    </div>
  );
}
