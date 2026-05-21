'use client';

import { useEffect, useState } from 'react';
import { shipmentService } from '@/services/shipment.service';
import { authService } from '@/services/auth.service';
import { Shipment, ShipmentStatus } from '@/types';
import {
  formatShipmentStatus,
  shipmentStatusBadge,
  formatKg,
  getShipmentWeight,
  formatDateTime,
  getShortId,
  progressStatuses,
  getProgressState,
} from '@/utils/shipment';

const ACTIVE_STATUSES: ShipmentStatus[] = ['MEMUAT', 'MENGIRIM'];

const nextStatusMap: Partial<Record<ShipmentStatus, { next: ShipmentStatus; label: string }>> = {
  MEMUAT:   { next: 'MENGIRIM', label: 'Mulai Pengiriman' },
  MENGIRIM: { next: 'TIBA',     label: 'Tandai Tiba' },
};

export default function WorkerShipmentActivePage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<Shipment['id'] | null>(null);

  const userInfo = authService.getUserInfo();

  const fetchShipments = async () => {
    try {
      setLoading(true);
      if (!userInfo?.id) return;

      const data = await shipmentService.getAll({
        supirUserId: userInfo.id,
      });

      const active = data.filter((s) =>
        ACTIVE_STATUSES.includes(s.status as ShipmentStatus),
      );
      setShipments(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pengiriman');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  const handleUpdateStatus = async (id: Shipment['id'], newStatus: ShipmentStatus) => {
    try {
      setUpdatingId(id);
      await shipmentService.updateStatus(id, { status: newStatus });
      await fetchShipments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-3xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
          Memuat pengiriman aktif...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in max-w-3xl mx-auto">
      <header>
        <p className="page-eyebrow">Pengiriman</p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Pengiriman Aktif</h1>
        <p className="text-slate-400 mt-1 text-sm">Pengiriman yang sedang Anda tangani saat ini.</p>
      </header>

      {error && <div className="alert-error"><span>{error}</span></div>}

      {shipments.length === 0 ? (
        <div className="empty-state">
          <h3 className="text-lg font-bold text-white mb-2">Tidak ada pengiriman aktif</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Anda belum memiliki pengiriman yang sedang berjalan. Pengiriman baru akan muncul
            di sini setelah ditugaskan oleh Mandor.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment) => {
            const weight = getShipmentWeight(shipment);
            const badgeClass = shipmentStatusBadge[shipment.status] || 'badge-yellow';
            const nextAction = nextStatusMap[shipment.status];
            const isUpdating = updatingId === shipment.id;

            return (
              <div key={shipment.id} className="surface-panel overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Pengiriman #{getShortId(shipment.id)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(shipment.createdAt)}</p>
                  </div>
                  <span className={`badge ${badgeClass}`}>
                    {formatShipmentStatus(shipment.status)}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Tujuan</span>
                      <span className="text-white font-medium">{shipment.destination}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Berat</span>
                      <span className="text-white font-medium">{formatKg(weight)}</span>
                    </div>
                  </div>

                  {shipment.notes && (
                    <div className="p-3 bg-white/[0.03] border border-white/5 rounded-lg text-sm text-slate-300">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Catatan</span>
                      {shipment.notes}
                    </div>
                  )}

                  {/* Progress */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Progress</p>
                    <div className="flex items-center gap-1">
                      {progressStatuses.map((step) => {
                        const state = getProgressState(shipment.status, step);
                        return (
                          <div key={step} className="flex-1">
                            <div className={`h-2 rounded-full transition-colors ${
                              state === 'progress-step-active'
                                ? 'bg-green-500'
                                : state === 'progress-step-rejected'
                                ? 'bg-red-500'
                                : 'bg-white/10'
                            }`} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
                      <span>Memuat</span>
                      <span>Kirim</span>
                      <span>Tiba</span>
                      <span>Mandor</span>
                      <span>Admin</span>
                    </div>
                  </div>

                  {/* Action */}
                  {nextAction && (
                    <button
                      onClick={() => handleUpdateStatus(shipment.id, nextAction.next)}
                      disabled={isUpdating}
                      className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? 'Memperbarui...' : nextAction.label}
                    </button>
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
