'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Sprout, Menu, X } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { AuthProvider } from '@/contexts/auth-context';

const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Ringkasan' },
  { href: '/admin/users', label: 'Pengguna' },
  { href: '/admin/plantations', label: 'Perkebunan' },
  { href: '/admin/shipments', label: 'Pengiriman' },
  { href: '/admin/payroll', label: 'Payroll' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const userInfo = authService.getUserInfo();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
    } else if (userInfo?.role !== 'ADMIN') {
      router.push('/login');
    }
  }, [router, userInfo]);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const isActive = (item: typeof ADMIN_NAV_ITEMS[0]) => pathname.startsWith(item.href);

  if (!authService.isAuthenticated() || userInfo?.role !== 'ADMIN') return null;

  return (
    <div className="ms-layout">
      <header className="ms-navbar z-50">
        <div className="ms-navbar-inner max-w-7xl mx-auto w-full px-4 md:px-6 flex items-center justify-between h-16">
          <Link href="/admin/dashboard" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <span className="bg-green-600 text-white p-1.5 rounded-md flex items-center justify-center">
              <Sprout size={18} />
            </span>
            <span className="font-bold text-white tracking-tight hidden sm:block">MySawit<span className="text-green-400 font-normal"> Admin</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    active 
                      ? 'text-white' 
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0a1614] border border-[#152e2a] rounded-full">
              <div className="w-6 h-6 rounded-full bg-green-900/50 flex items-center justify-center text-xs font-bold text-green-400">
                {userInfo?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="text-sm font-medium text-slate-200 truncate max-w-[100px]">{userInfo?.username || 'Admin'}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition"
            >
              <LogOut size={18} />
            </button>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden p-2 text-slate-300 hover:text-white"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-[#0a1614] border-b border-[#152e2a] shadow-xl">
            <nav className="flex flex-col py-2 px-4 space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg text-base font-medium ${
                      active 
                        ? 'text-white' 
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <AuthProvider>
        <main className="ms-main bg-[#050a09] pt-16 min-h-screen">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </AuthProvider>
    </div>
  );
}
