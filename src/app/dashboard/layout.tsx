'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Map, Menu, Sprout, Truck, Users, Wheat, X, CircleDollarSign } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { AuthProvider } from '@/contexts/auth-context';

const ALL_NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', Icon: LayoutDashboard, exact: true, roles: ['ADMIN', 'MANDOR'] },
  { href: '/dashboard/identity', label: 'Tim', Icon: Users, roles: ['ADMIN'] },
  { href: '/dashboard/plantations', label: 'Kebun', Icon: Map, roles: ['ADMIN', 'MANDOR'] },
  { href: '/dashboard/harvests', label: 'Panen', Icon: Wheat, roles: ['MANDOR', 'BURUH'] },
  { href: '/dashboard/shipments', label: 'Pengiriman', Icon: Truck, roles: ['ADMIN', 'MANDOR', 'SUPIR'] },
  { href: '/dashboard/payroll', label: 'Gaji', Icon: CircleDollarSign, roles: ['ADMIN', 'MANDOR', 'SUPIR', 'BURUH'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const userInfo = authService.getUserInfo();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const isActive = (item: typeof ALL_NAV_ITEMS[0]) => pathname.startsWith(item.href);
  const isOverviewActive = pathname === '/dashboard';

  if (!authService.isAuthenticated()) return null;

  const allowedNavItems = ALL_NAV_ITEMS.filter((item) => 
    !userInfo?.role || item.roles.includes(userInfo.role)
  );

  return (
    <div className="ms-layout">
      <header className="ms-navbar">
        <div className="ms-navbar-inner">
          <Link href="/dashboard" className="ms-brand" onClick={() => setMenuOpen(false)}>
            <span className="ms-brand-mark">
              <Sprout size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="ms-brand-title">MySawit</span>
              <span className="ms-brand-subtitle">Operasional kebun</span>
            </span>
          </Link>

          <nav className="ms-nav-desktop" aria-label="Navigasi utama">
            {allowedNavItems.map((item) => {
              const active = item.exact ? isOverviewActive : isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ms-nav-item ${active ? 'active' : ''}`}
                >
                  <item.Icon size={16} aria-hidden="true" className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ms-navbar-actions">
            <div className="ms-user-pill">
              <span className="ms-user-avatar">
                {userInfo?.username?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="ms-user-name">{userInfo?.username || 'Pengguna'}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="ms-icon-button"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="ms-icon-button ms-mobile-menu-button"
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="ms-nav-mobile" aria-label="Navigasi mobile">
          {allowedNavItems.map((item) => {
            const active = item.exact ? isOverviewActive : isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`ms-nav-item ${active ? 'active' : ''}`}
              >
                <item.Icon size={17} aria-hidden="true" className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          </nav>
        )}
      </header>

      <AuthProvider>
        <main className="ms-main">
          {children}
        </main>
      </AuthProvider>
    </div>
  );
}
