'use client';

import { useEffect, useState } from 'react';
import { shipmentService } from '@/services/shipment.service';
import { authService } from '@/services/auth.service';
import { Shipment, ShipmentStatus } from '@/types';
import { Filter, RefreshCw } from 'lucide-react';
import {
  formatShipmentStatus,
  shipmentStatusBadge,
  formatKg,
  getShipmentWeight,
  formatDateTime,
  getShortId,
  getProgressState,
  isRejectedStatus,
} from '@/utils/shipment';

const HISTORY_STATUSES: ShipmentStatus[] = [
  'TIBA',
  'MANDOR_APPROVED',
  'MANDOR_REJECTED',
  'ADMIN_APPROVED',
  'ADMIN_REJECTED',
  'PARTIALLY_REJECTED',
];

const timelineSteps: { status: ShipmentStatus; label: string; dateField: keyof Shipment }[] = [
  { status: 'MEMUAT',          label: 'Memuat',            dateField: 'createdAt' },
  { status: 'MENGIRIM',        label: 'Dalam Perjalanan',  dateField: 'updatedAt' },
  { status: 'TIBA',            label: 'Tiba di Tujuan',    dateField: 'updatedAt' },
  { status: 'MANDOR_APPROVED', label: 'Review Mandor',     dateField: 'mandorReviewedAt' },
  { status: 'ADMIN_APPROVED',  label: 'Review Admin',      dateField: 'adminReviewedAt' },
];

export default function WorkerShipmentHistoryPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const userInfo = authService.getUserInfo();

  const fetchHistory = async (date = dateFilter) => {
    try {
      setLoading(true);
      if (!userInfo?.id) return;

      const data = await shipmentService.getAll({
        supirUserId: userInfo.id,
        date: date || undefined,
      });

      const history = data.filter((s) =>
        HISTORY_STATUSES.includes(s.status as ShipmentStatus),
      );

      history.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      setShipments(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat pengiriman');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-3xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
          Memuat riwayat pengiriman...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in max-w-3xl mx-auto">
      <header>
        <p className="page-eyebrow">Pengiriman</p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Riwayat Pengiriman</h1>
        <p className="text-slate-400 mt-1 text-sm">Daftar pengiriman yang sudah selesai atau ditolak.</p>
      </header>

      {error && <div className="alert-error"><span>{error}</span></div>}

      <section className="surface-panel p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void fetchHistory(dateFilter);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="label-sm">Tanggal Pengiriman</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="ms-input"
            />
          </div>
          <button type="submit" className="btn-primary justify-center">
            <Filter size={15} aria-hidden="true" />Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFilter('');
              void fetchHistory('');
            }}
            className="btn-ghost justify-center"
          >
            <RefreshCw size={15} aria-hidden="true" />Reset
          </button>
        </form>
      </section>

      {/* Summary */}
      {shipments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="surface-panel p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total</p>
            <p className="text-xl font-bold text-white">{shipments.length}</p>
          </div>
          <div className="surface-panel p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Disetujui</p>
            <p className="text-xl font-bold text-green-400">
              {shipments.filter((s) => s.status === 'ADMIN_APPROVED' || s.status === 'MANDOR_APPROVED').length}
            </p>
          </div>
          <div className="surface-panel p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ditolak</p>
            <p className="text-xl font-bold text-red-400">
              {shipments.filter((s) => isRejectedStatus(s.status)).length}
            </p>
          </div>
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="empty-state">
          <h3 className="text-lg font-bold text-white mb-2">Belum ada riwayat</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Riwayat pengiriman yang sudah selesai atau ditolak akan ditampilkan di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment) => {
            const weight = getShipmentWeight(shipment);
            const badgeClass = shipmentStatusBadge[shipment.status] || 'badge-yellow';

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
                      <span className="text-white font-medium truncate ml-2">{shipment.destination}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Berat</span>
                      <span className="text-white font-medium">{formatKg(weight)}</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Timeline</p>
                    <div className="space-y-0">
                      {timelineSteps.map((step, i) => {
                        const state = getProgressState(shipment.status, step.status);
                        const isActive = state === 'progress-step-active';
                        const isLast = i === timelineSteps.length - 1;
                        const dateValue = shipment[step.dateField] as string | undefined;

                        return (
                          <div key={step.status} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs ${
                                isActive
                                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                                  : state === 'progress-step-rejected'
                                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                                  : 'border-white/10 bg-white/[0.03] text-slate-600'
                              }`}>
                                {i + 1}
                              </div>
                              {!isLast && (
                                <div className={`w-0.5 h-5 ${
                                  isActive ? 'bg-green-500/30' : 'bg-white/10'
                                }`} />
                              )}
                            </div>

                            <div className="pb-3">
                              <p className={`text-sm font-medium ${
                                isActive ? 'text-white' : 'text-slate-500'
                              }`}>
                                {step.label}
                              </p>
                              {isActive && dateValue && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {formatDateTime(dateValue)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {shipment.rejectionReason && isRejectedStatus(shipment.status) && (
                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-sm text-red-300">
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wider block mb-1">Alasan Penolakan</span>
                      {shipment.rejectionReason}
                    </div>
                  )}

                  {/* Final status */}
                  {isRejectedStatus(shipment.status) && (
                    <div className="w-full p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium border text-red-400 bg-red-500/10 border-red-500/20">
                      {formatShipmentStatus(shipment.status)}
                    </div>
                  )}
                  {shipment.status === 'ADMIN_APPROVED' && (
                    <div className="w-full p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium border text-green-400 bg-green-500/10 border-green-500/20">
                      Selesai — Disetujui
                    </div>
                  )}

                  {shipment.notes && (
                    <div className="p-3 bg-white/[0.03] border border-white/5 rounded-lg text-sm text-slate-300">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Catatan</span>
                      {shipment.notes}
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
