'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/auth.service';
import { harvestService } from '@/services/harvest.service';
import { shipmentService } from '@/services/shipment.service';
import { plantationService } from '@/services/plantation.service';
import { identityService } from '@/services/identity.service';
import {
  ArrowUpRight,
  Map,
  RefreshCw,
  Truck,
  Users,
  Wheat,
} from 'lucide-react';

interface DashboardStats {
  users: number;
  plantations: number;
  harvests: number;
  shipments: number;
}

export default function DashboardPage() {
  const userInfo = authService.getUserInfo();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [users, plantations, harvests, shipments] = await Promise.allSettled([
        identityService.listUsers(),
        plantationService.getAll(),
        harvestService.getAll(),
        shipmentService.getAll(),
      ]);
      setStats({
        users:       users.status === 'fulfilled' ? users.value.length : 0,
        plantations: plantations.status === 'fulfilled' ? plantations.value.length : 0,
        harvests:    harvests.status === 'fulfilled' ? harvests.value.length : 0,
        shipments:   shipments.status === 'fulfilled' ? shipments.value.length : 0,
      });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const statCards = useMemo(() => [
    { label: 'Anggota Tim', value: stats?.users, Icon: Users, iconBg: 'bg-cyan-500/15 text-cyan-300' },
    { label: 'Kebun Terdaftar', value: stats?.plantations, Icon: Map, iconBg: 'bg-green-500/15 text-green-300' },
    { label: 'Catatan Panen', value: stats?.harvests, Icon: Wheat, iconBg: 'bg-amber-500/15 text-amber-300' },
    { label: 'Pengiriman', value: stats?.shipments, Icon: Truck, iconBg: 'bg-orange-500/15 text-orange-300' },
  ], [stats]);

  const quickActions = [
    { href: '/dashboard/plantations', Icon: Map, title: 'Kelola Kebun', desc: 'Data lokasi, luas, koordinator, dan supir kebun.', iconBg: 'bg-green-500/15 text-green-300' },
    { href: '/dashboard/harvests', Icon: Wheat, title: 'Catat Panen', desc: 'Input hasil panen dan validasi status pekerjaan.', iconBg: 'bg-amber-500/15 text-amber-300' },
    { href: '/dashboard/shipments', Icon: Truck, title: 'Pantau Pengiriman', desc: 'Ikuti muatan TBS dari kebun sampai tujuan.', iconBg: 'bg-orange-500/15 text-orange-300' },
  ];

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div>
          <p className="page-eyebrow">{greeting()},</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
            {userInfo?.username || 'Pengguna'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => { void loadStats(); }}
          className="btn-ghost text-sm"
        >
          <RefreshCw size={15} aria-hidden="true" />
          Perbarui Data
        </button>
      </div>

      <div className="surface-panel p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">Ringkasan operasional kebun</p>
          <p className="text-sm text-slate-500 mt-1">Pantau kebun, panen, dan pengiriman dari satu tempat.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Data siap diperbarui kapan saja
        </div>
      </div>

      <div>
        <h2 className="section-title mb-4">
          <span className="w-1 h-5 rounded-full bg-green-500 inline-block" />
          Ringkasan Data
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
          {statCards.map(card => (
            <div key={card.label} className="stat-card">
              <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center mb-3`}>
                <card.Icon size={18} aria-hidden="true" />
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

      <div>
        <h2 className="section-title mb-4">
          <span className="w-1 h-5 rounded-full bg-green-500 inline-block" />
          Pekerjaan Utama
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
          {quickActions.map(item => (
            <Link key={item.href} href={item.href}
              className="glass-card p-5 group cursor-pointer hover:border-green-500/25 transition-colors">
              <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center mb-3`}>
                <item.Icon size={19} aria-hidden="true" />
              </div>
              <p className="font-semibold text-white text-[15px] mb-1">{item.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              <p className="mt-3 text-xs text-green-500 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Buka
                <ArrowUpRight size={12} aria-hidden="true" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
