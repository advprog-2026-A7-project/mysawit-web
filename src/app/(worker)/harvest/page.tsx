'use client';

import { useEffect, useState } from 'react';
import { harvestService } from '@/services/harvest.service';
import { authService } from '@/services/auth.service';
import { Harvest } from '@/types';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatWeight = (kg: number) =>
  `${kg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;

const statusConfig: Record<string, { label: string; badge: string }> = {
  PENDING:  { label: 'Menunggu',  badge: 'badge badge-yellow' },
  APPROVED: { label: 'Disetujui', badge: 'badge badge-green' },
  REJECTED: { label: 'Ditolak',   badge: 'badge badge-red' },
};

export default function WorkerHarvestPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userInfo = authService.getUserInfo();

  useEffect(() => {
    const fetchHarvests = async () => {
      try {
        setLoading(true);
        if (!userInfo?.id) return;

        try {
          const data = await harvestService.getMine();
          setHarvests(data);
        } catch {
          const data = await harvestService.getAll();
          const myHarvests = data.filter(
            (h) => String(h.harvesterId) === String(userInfo.id),
          );
          setHarvests(myHarvests);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data panen');
      } finally {
        setLoading(false);
      }
    };

    fetchHarvests();
  }, [userInfo?.id]);

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-3xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
          Memuat catatan panen Anda...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in max-w-3xl mx-auto">
      <header>
        <p className="page-eyebrow">Panen</p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Catatan Panen Saya</h1>
        <p className="text-slate-400 mt-1 text-sm">Riwayat hasil panen yang telah Anda catat.</p>
      </header>

      {error && <div className="alert-error"><span>{error}</span></div>}

      {harvests.length === 0 ? (
        <div className="empty-state">
          <h3 className="text-lg font-bold text-white mb-2">Belum ada catatan panen</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Anda belum memiliki catatan panen. Catatan panen akan muncul di sini setelah Anda atau Mandor mencatat hasil panen.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="surface-panel p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Panen</p>
              <p className="text-xl font-bold text-white">{harvests.length}</p>
            </div>
            <div className="surface-panel p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Berat</p>
              <p className="text-xl font-bold text-green-400">
                {formatWeight(harvests.reduce((sum, h) => sum + (h.weight || 0), 0))}
              </p>
            </div>
            <div className="surface-panel p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Disetujui</p>
              <p className="text-xl font-bold text-emerald-400">
                {harvests.filter((h) => h.status === 'APPROVED').length}
              </p>
            </div>
          </div>

          {/* Harvest List */}
          {harvests.map((harvest) => {
            const status = statusConfig[harvest.status || 'PENDING'] || statusConfig.PENDING;

            return (
              <div key={harvest.id} className="surface-panel overflow-hidden">
                <div className="p-5 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
                  <div>
                    <h3 className="text-base font-bold text-white">{formatWeight(harvest.weight)}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(harvest.harvestDate || harvest.createdAt)} · ID #{String(harvest.id).slice(0, 8)}
                    </p>
                  </div>
                  <span className={status.badge}>{status.label}</span>
                </div>

                <div className="p-5 space-y-3">
                  {harvest.quality && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Kualitas</span>
                      <span className={`badge ${
                        harvest.quality === 'PREMIUM' ? 'badge-green'
                        : harvest.quality === 'STANDARD' ? 'badge-yellow'
                        : 'badge-red'
                      }`}>
                        {harvest.quality}
                      </span>
                    </div>
                  )}

                  {(harvest.notes || harvest.news) && (
                    <div className="p-3 bg-white/[0.03] border border-white/5 rounded-lg text-sm text-slate-300">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Catatan</span>
                      {harvest.notes || harvest.news}
                    </div>
                  )}

                  {harvest.rejectionReason && harvest.status === 'REJECTED' && (
                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-sm text-red-300">
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wider block mb-1">Alasan Penolakan</span>
                      {harvest.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
