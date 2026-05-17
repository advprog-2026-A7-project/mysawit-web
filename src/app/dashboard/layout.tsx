'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/auth.service';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '⊞', exact: true },
  { href: '/dashboard/identity', label: 'Identity & Users', icon: '👤' },
  { href: '/dashboard/plantations', label: 'Plantations', icon: '🌴' },
  { href: '/dashboard/harvests', label: 'Harvests', icon: '🌾' },
  { href: '/dashboard/shipments', label: 'Shipments', icon: '🚚' },
  { href: '/dashboard/payroll', label: 'Payroll', icon: '💰' },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'badge-purple',
  MANDOR: 'badge-blue',
  BURUH: 'badge-green',
  SUPIR: 'badge-orange',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<{ id: string | null; username: string | null; role: string | null } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    setUserInfo(authService.getUserInfo());
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const isActive = (item: typeof NAV_ITEMS[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== '/dashboard';
  // special case for overview
  const isOverviewActive = pathname === '/dashboard';

  if (!authService.isAuthenticated()) return null;

  return (
    <div className="ms-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`ms-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-lg shadow-lg shadow-green-900/40 group-hover:scale-105 transition-transform">
              🌴
            </div>
            <div>
              <p className="font-bold text-white text-[15px] leading-tight tracking-tight">MySawit</p>
              <p className="text-[11px] text-slate-500">BurhanSawit Platform</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-3 mb-2 mt-2">Menu Utama</p>
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? isOverviewActive : isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`ms-nav-item ${active ? 'active' : ''}`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 border border-white/10 shrink-0">
              {userInfo?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{userInfo?.username || 'User'}</p>
              <span className={`badge text-[10px] mt-0.5 inline-flex ${ROLE_COLORS[userInfo?.role || ''] || 'badge-gray'}`}>
                {userInfo?.role || 'UNKNOWN'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors text-sm"
            >
              ↗
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ms-main">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[var(--bg-surface)] sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400">
            ☰
          </button>
          <span className="font-bold text-white text-[15px]">MySawit</span>
          <div className="w-8" />
        </div>
        {children}
      </main>
    </div>
  );
}
