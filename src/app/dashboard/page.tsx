'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_ENDPOINTS } from '@/lib/api-config';
import { canAccess, type DashboardModule } from '@/lib/rbac';

type ServiceHealth = 'loading' | 'online' | 'offline';

const SERVICES: { key: string; label: string; url: string }[] = [
  { key: 'identity',   label: 'Identity Service',   url: API_ENDPOINTS.AUTH.HEALTH },
  { key: 'plantation', label: 'Plantation Service', url: API_ENDPOINTS.PLANTATIONS.HEALTH },
  { key: 'harvest',    label: 'Harvest Service',    url: API_ENDPOINTS.HARVESTS.HEALTH },
  { key: 'shipment',   label: 'Shipment Service',   url: API_ENDPOINTS.SHIPMENTS.HEALTH },
  { key: 'payroll',    label: 'Payroll Service',    url: API_ENDPOINTS.PAYROLL.HEALTH },
];

const MODULE_CARDS: Array<{
  module: DashboardModule;
  href: string;
  emoji: string;
  title: string;
  description: string;
}> = [
  { module: 'identity',    href: '/dashboard/identity',    emoji: '🔐', title: 'Identity',    description: 'Check auth service health and create dummy users for quick testing' },
  { module: 'plantations', href: '/dashboard/plantations', emoji: '🌴', title: 'Plantations', description: 'Manage palm oil plantations, track areas, and monitor ownership' },
  { module: 'harvests',    href: '/dashboard/harvests',    emoji: '🌾', title: 'Harvests',    description: 'Track harvest records, quality, and production metrics' },
  { module: 'shipments',   href: '/dashboard/shipments',   emoji: '🚚', title: 'Shipments',   description: 'Monitor shipment status, tracking, and delivery schedules' },
  { module: 'payroll',     href: '/dashboard/payroll',     emoji: '💰', title: 'Payroll',     description: 'Manage employee payroll, salaries, and payment records' },
  { module: 'user-admin',  href: '/dashboard/admin/users', emoji: '👤', title: 'User Admin',  description: 'Manage users, assign mandors, and review accounts' },
];

const initialHealth = (): Record<string, ServiceHealth> =>
  Object.fromEntries(SERVICES.map((s) => [s.key, 'loading']));

export default function DashboardPage() {
  const { user } = useAuth();
  const visibleCards = MODULE_CARDS.filter((card) => canAccess(user?.role, card.module));
  const [health, setHealth] = useState<Record<string, ServiceHealth>>(initialHealth);

  const refresh = useCallback(async () => {
    setHealth(initialHealth());
    await Promise.all(
      SERVICES.map(async (svc) => {
        let status: ServiceHealth = 'offline';
        try {
          const res = await fetch(svc.url, { cache: 'no-store' });
          status = res.ok ? 'online' : 'offline';
        } catch {
          status = 'offline';
        }
        setHealth((prev) => ({ ...prev, [svc.key]: status }));
      }),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {visibleCards.map((card) => (
          <Link
            key={card.module}
            href={card.href}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-5xl mb-4">{card.emoji}</div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">{card.title}</h2>
            <p className="text-gray-600 text-sm">{card.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">System Status</h3>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-sm font-medium text-green-700 hover:text-green-900"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {SERVICES.map((svc) => {
            const status = health[svc.key];
            const isOnline = status === 'online';
            const isOffline = status === 'offline';
            const containerClass = isOnline
              ? 'bg-green-50'
              : isOffline
                ? 'bg-red-50'
                : 'bg-gray-50';
            const dotClass = isOnline
              ? 'text-green-600'
              : isOffline
                ? 'text-red-600'
                : 'text-gray-400 animate-pulse';
            const labelClass = isOnline
              ? 'text-green-600'
              : isOffline
                ? 'text-red-600'
                : 'text-gray-500';
            const labelText = isOnline ? 'Online' : isOffline ? 'Offline' : 'Checking…';
            return (
              <div key={svc.key} className={`text-center p-4 rounded-lg ${containerClass}`}>
                <div className={`text-2xl font-bold ${dotClass}`}>●</div>
                <div className="text-sm text-gray-600">{svc.label}</div>
                <div className={`text-xs ${labelClass}`}>{labelText}</div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
