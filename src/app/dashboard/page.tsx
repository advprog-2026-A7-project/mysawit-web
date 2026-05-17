'use client';

import { useCallback, useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';
import { harvestService } from '@/services/harvest.service';
import { shipmentService } from '@/services/shipment.service';
import { payrollService } from '@/services/payroll.service';
import { plantationService } from '@/services/plantation.service';
import { identityService } from '@/services/identity.service';

const SERVICES = [
  { key: 'identity', label: 'Identity', icon: '👤', port: 8081 },
  { key: 'plantation', label: 'Plantation', icon: '🌴', port: 8082 },
  { key: 'harvest', label: 'Harvest', icon: '🌾', port: 8083 },
  { key: 'shipment', label: 'Shipment', icon: '🚚', port: 8084 },
  { key: 'payroll', label: 'Payroll', icon: '💰', port: 8085 },
];

interface ServiceStatus { status: 'UP' | 'DOWN' | 'CHECKING'; latency?: number }
type StatusMap = Record<string, ServiceStatus>;

interface DashboardStats {
  users: number;
  plantations: number;
  harvests: number;
  shipments: number;
  payrolls: number;
}

export default function DashboardPage() {
  const userInfo = authService.getUserInfo();
  const [statuses, setStatuses] = useState<StatusMap>(
    Object.fromEntries(SERVICES.map(s => [s.key, { status: 'CHECKING' as const }]))
  );
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const checkHealth = useCallback(async () => {
    const checks = [
      { key: 'identity',   fn: () => authService.checkHealth() },
      { key: 'plantation', fn: () => plantationService.checkHealth() },
      { key: 'harvest',    fn: () => harvestService.checkHealth() },
      { key: 'shipment',   fn: () => shipmentService.checkHealth() },
      { key: 'payroll',    fn: () => payrollService.checkHealth() },
    ];

    await Promise.allSettled(
      checks.map(async ({ key, fn }) => {
        const t0 = Date.now();
        try {
          const res = await fn();
          const latency = Date.now() - t0;
          const up = typeof res === 'object' && res !== null &&
            ('status' in res ? String((res as { status: unknown }).status).toUpperCase().includes('UP') : true);
          setStatuses(prev => ({ ...prev, [key]: { status: up ? 'UP' : 'DOWN', latency } }));
        } catch {
          setStatuses(prev => ({ ...prev, [key]: { status: 'DOWN', latency: Date.now() - t0 } }));
        }
      })
    );
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [users, plantations, harvests, shipments, payrolls] = await Promise.allSettled([
        identityService.listUsers(),
        plantationService.getAll(),
        harvestService.getAll(),
        shipmentService.getAll(),
        payrollService.getPayrolls(),
      ]);
      setStats({
        users:       users.status === 'fulfilled' ? users.value.length : 0,
        plantations: plantations.status === 'fulfilled' ? plantations.value.length : 0,
        harvests:    harvests.status === 'fulfilled' ? harvests.value.length : 0,
        shipments:   shipments.status === 'fulfilled' ? shipments.value.length : 0,
        payrolls:    payrolls.status === 'fulfilled' ? payrolls.value.length : 0,
      });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    void loadStats();
  }, [checkHealth, loadStats]);

  const upCount = Object.values(statuses).filter(s => s.status === 'UP').length;
  const allUp = upCount === SERVICES.length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const STAT_CARDS = [
    { label: 'Total Users', value: stats?.users, icon: '👤', color: 'from-blue-500/20 to-blue-600/5', iconBg: 'bg-blue-500/20' },
    { label: 'Plantations', value: stats?.plantations, icon: '🌴', color: 'from-green-500/20 to-green-600/5', iconBg: 'bg-green-500/20' },
    { label: 'Harvest Logs', value: stats?.harvests, icon: '🌾', color: 'from-yellow-500/20 to-yellow-600/5', iconBg: 'bg-yellow-500/20' },
    { label: 'Shipments', value: stats?.shipments, icon: '🚚', color: 'from-orange-500/20 to-orange-600/5', iconBg: 'bg-orange-500/20' },
    { label: 'Payroll Records', value: stats?.payrolls, icon: '💰', color: 'from-purple-500/20 to-purple-600/5', iconBg: 'bg-purple-500/20' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-start justify-between pt-2">
        <div>
          <p className="text-sm text-slate-500 font-medium">{greeting()},</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">
            {userInfo?.username || 'Pengguna'}
            <span className="ml-2 badge badge-green text-[10px] align-middle">{userInfo?.role}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => { void checkHealth(); void loadStats(); }}
          className="btn-ghost text-sm"
        >
          ↻ Refresh
        </button>
      </div>

      {/* System Health Banner */}
      <div className={`glass-card p-4 flex items-center gap-4 ${allUp ? 'border-green-500/20' : 'border-yellow-500/20'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${allUp ? 'bg-green-500/15' : 'bg-yellow-500/15'}`}>
          {allUp ? '✅' : '⚠️'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">
            {allUp ? 'Semua sistem berjalan normal' : `${upCount}/${SERVICES.length} layanan aktif`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Microservice health status</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {SERVICES.map(s => {
            const st = statuses[s.key];
            return (
              <div key={s.key} title={`${s.label}: ${st.status}${st.latency ? ` (${st.latency}ms)` : ''}`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  st.status === 'UP' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' :
                  st.status === 'DOWN' ? 'bg-red-400' : 'bg-slate-600 animate-pulse'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="section-title mb-4">
          <span className="w-1 h-5 rounded-full bg-green-500 inline-block" />
          Statistik Sistem
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 stagger-children">
          {STAT_CARDS.map(card => (
            <div key={card.label} className={`stat-card bg-gradient-to-br ${card.color} animate-fade-in-up`}>
              <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center text-lg mb-3`}>
                {card.icon}
              </div>
              {loadingStats ? (
                <div className="skeleton h-7 w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-white">{card.value ?? 0}</p>
              )}
              <p className="text-xs text-slate-500 font-medium mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Service Status Detail */}
      <div>
        <h2 className="section-title mb-4">
          <span className="w-1 h-5 rounded-full bg-green-500 inline-block" />
          Status Microservices
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {SERVICES.map(svc => {
            const st = statuses[svc.key];
            return (
              <div key={svc.key} className="stat-card flex items-center gap-4 animate-fade-in-up">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-lg shrink-0">
                  {svc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{svc.label} Service</p>
                  <p className="text-xs text-slate-500">:{svc.port}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`badge text-[10px] ${
                    st.status === 'UP' ? 'badge-green' :
                    st.status === 'DOWN' ? 'badge-red' : 'badge-gray'
                  }`}>
                    {st.status === 'CHECKING' ? '···' : st.status}
                  </span>
                  {st.latency !== undefined && (
                    <p className="text-[10px] text-slate-600 mt-1">{st.latency}ms</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="section-title mb-4">
          <span className="w-1 h-5 rounded-full bg-green-500 inline-block" />
          Akses Cepat
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {[
            { href: '/dashboard/plantations', icon: '🌴', title: 'Kelola Kebun', desc: 'CRUD kebun sawit & penugasan mandor', gradient: 'from-green-500/10' },
            { href: '/dashboard/harvests', icon: '🌾', title: 'Log Panen', desc: 'Catat & validasi hasil panen buruh', gradient: 'from-yellow-500/10' },
            { href: '/dashboard/shipments', icon: '🚚', title: 'Pengiriman', desc: 'Pantau status pengiriman TBS ke pabrik', gradient: 'from-orange-500/10' },
            { href: '/dashboard/payroll', icon: '💰', title: 'Payroll', desc: 'Kelola penggajian & approval', gradient: 'from-purple-500/10' },
          ].map(item => (
            <a key={item.href} href={item.href}
              className={`glass-card p-5 group cursor-pointer hover:border-green-500/25 transition-all hover:-translate-y-1 animate-fade-in-up bg-gradient-to-br ${item.gradient} to-transparent`}>
              <div className="text-2xl mb-3 group-hover:scale-110 transition-transform inline-block">{item.icon}</div>
              <p className="font-semibold text-white text-[15px] mb-1">{item.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              <p className="mt-3 text-xs text-green-500 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Buka → 
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
