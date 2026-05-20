'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Filter, RefreshCcw, Route, Search, ShieldCheck, Truck, Weight, X, AlertTriangle, XCircle } from 'lucide-react';
import { Shipment, ShipmentStatus } from '@/types';
import { shipmentService } from '@/services/shipment.service';
import {
  formatShipmentStatus,
  shipmentStatusBadge,
  getShortId,
  getWorkerDisplay,
  formatKg,
  getShipmentWeight,
  formatDateTime,
  progressStatuses,
  getProgressState,
} from '../utils';

interface AdminShipmentViewProps {
  shipments: Shipment[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export default function AdminShipmentView({ shipments, loading, error, onRefresh }: AdminShipmentViewProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState('');
  
  // State for Partial / Reject Modal
  const [actionModal, setActionModal] = useState<{
    type: 'PARTIAL' | 'REJECT' | null;
    shipment: Shipment | null;
  }>({ type: null, shipment: null });
  const [reason, setReason] = useState('');
  const [kgAccepted, setKgAccepted] = useState('');

  const totals = useMemo(() => {
    const totalKg = shipments.reduce((sum, shipment) => sum + getShipmentWeight(shipment), 0);
    const active = shipments.filter((shipment) => shipment.status === 'MEMUAT' || shipment.status === 'MENGIRIM').length;
    const completed = shipments.filter((shipment) => shipment.status === 'TIBA').length;
    const needsReview = shipments.filter((shipment) => shipment.status === 'MANDOR_APPROVED').length;

    return { totalKg, active, completed, needsReview };
  }, [shipments]);

  const handleApprove = async (shipmentId: string) => {
    try {
      setUpdatingId(shipmentId);
      setUpdateError('');
      await shipmentService.approveByAdmin(shipmentId, 'ADMIN_APPROVED');
      onRefresh();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Gagal menyetujui pengiriman');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleActionModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal.shipment || !actionModal.type) return;

    try {
      setUpdatingId(actionModal.shipment.id as string);
      setUpdateError('');
      
      const payload = {
        status: actionModal.type === 'PARTIAL' ? 'PARTIALLY_REJECTED' : 'ADMIN_REJECTED',
        rejectionReason: reason || undefined,
        kgAccepted: actionModal.type === 'PARTIAL' ? Number.parseFloat(kgAccepted) : undefined,
      };

      await shipmentService.approveByAdmin(actionModal.shipment.id as string, payload as any);
      
      setActionModal({ type: null, shipment: null });
      setReason('');
      setKgAccepted('');
      onRefresh();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Gagal menyimpan keputusan');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="surface-panel bg-white p-8 text-center text-sm text-slate-500">
        <Clock3 size={20} aria-hidden="true" className="mx-auto mb-3 text-slate-500" />
        Memuat data pengiriman...
      </div>
    );
  }

  return (
    <div className="page-shell space-y-5 animate-fade-in">
      <header className="page-heading">
        <div className="min-w-0">
          <p className="page-eyebrow">Tinjauan Eksekutif</p>
          <h1 className="text-xl font-bold text-white md:text-2xl">Pusat Persetujuan Admin</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Pantau seluruh arus pengiriman dan kelola persetujuan dengan cepat.
          </p>
        </div>
      </header>

      {(error || updateError) && (
        <div className="alert-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{error || updateError}</span>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="surface-panel bg-white p-4">
          <p className="text-sm text-slate-400">Total Pengiriman</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-xl font-bold text-white">{shipments.length}</p>
            <Truck size={18} aria-hidden="true" className="text-slate-500" />
          </div>
        </div>
        <div className="surface-panel bg-white p-4">
          <p className="text-sm text-slate-400">Berat Total</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-xl font-bold text-white">{formatKg(totals.totalKg)}</p>
            <Weight size={18} aria-hidden="true" className="text-slate-500" />
          </div>
        </div>
        <div className="surface-panel bg-white p-4 border-l-4 border-amber-500/50">
          <p className="text-sm text-slate-400">Perlu Persetujuan</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-xl font-bold text-amber-300">{totals.needsReview}</p>
            <ShieldCheck size={18} aria-hidden="true" className="text-amber-500/70" />
          </div>
        </div>
        <div className="surface-panel bg-white p-4">
          <p className="text-sm text-slate-400">Sedang Berjalan</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-xl font-bold text-cyan-300">{totals.active}</p>
            <Route size={18} aria-hidden="true" className="text-cyan-500/70" />
          </div>
        </div>
      </section>

      {/* Action Modal (Partial / Reject) */}
      {actionModal.shipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-panel bg-slate-900 p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {actionModal.type === 'PARTIAL' ? <AlertTriangle className="text-amber-500" size={20} /> : <XCircle className="text-red-500" size={20} />}
                {actionModal.type === 'PARTIAL' ? 'Koreksi Parsial' : 'Tolak Pengiriman'}
              </h2>
              <button 
                onClick={() => setActionModal({ type: null, shipment: null })}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Pengiriman #{getShortId(actionModal.shipment.id)} (Total: {formatKg(getShipmentWeight(actionModal.shipment))})
            </p>
            
            <form onSubmit={handleActionModalSubmit} className="space-y-4">
              {actionModal.type === 'PARTIAL' && (
                <label className="block">
                  <span className="label-sm">Berat yang disetujui (Kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={kgAccepted}
                    onChange={(e) => setKgAccepted(e.target.value)}
                    className="ms-input"
                    placeholder="Contoh: 350"
                  />
                </label>
              )}
              <label className="block">
                <span className="label-sm">Alasan {actionModal.type === 'PARTIAL' ? 'Koreksi' : 'Penolakan'}</span>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="ms-input"
                  placeholder="Masukkan alasan detail..."
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal({ type: null, shipment: null })}
                  className="btn-ghost"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingId === actionModal.shipment.id}
                  className={`btn-primary ${actionModal.type === 'REJECT' ? 'bg-red-600 hover:bg-red-500 text-white' : ''}`}
                >
                  {updatingId === actionModal.shipment.id ? 'Menyimpan...' : 'Simpan Keputusan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="empty-state bg-white p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-white">Belum ada pengiriman</h3>
          <p className="text-sm text-slate-400">Tidak ada data yang tersedia di sistem.</p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="section-title text-base">Daftar Pengiriman</h2>
          </div>

          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="surface-panel bg-white p-5 hover:border-white/10 transition-colors">
                <div className="flex flex-col xl:flex-row gap-6">
                  
                  {/* Left Column: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 flex items-center gap-3">
                      <span className={`badge ${shipmentStatusBadge[shipment.status] || 'badge-gray'}`}>
                        {formatShipmentStatus(shipment.status)}
                      </span>
                      <span className="text-xs font-mono text-slate-500">#{getShortId(shipment.id)}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(shipment.createdAt)}</span>
                    </div>
                    
                    <h3 className="text-base font-bold text-white mb-4">{shipment.destination || 'Tujuan Belum Diisi'}</h3>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm bg-white/[0.02] p-4 rounded-lg border border-white/5">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Mandor</p>
                        <p className="text-slate-300 font-medium">{getWorkerDisplay(shipment.mandorName, shipment.mandorUserId)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Supir</p>
                        <p className="text-slate-300 font-medium">{getWorkerDisplay(shipment.supirName, shipment.supirUserId)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Details & Progress */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Progres</p>
                      <ol className="grid grid-cols-5 gap-1">
                        {progressStatuses.map((status) => (
                          <li
                            key={status}
                            title={formatShipmentStatus(status)}
                            className={`h-2 rounded-full ${getProgressState(shipment.status, status)}`}
                          />
                        ))}
                      </ol>
                    </div>

                    <div className="flex items-center justify-between bg-brand-500/10 border border-brand-500/20 p-3 rounded-lg">
                      <span className="text-sm text-brand-200">Total Muatan</span>
                      <span className="text-lg font-bold text-brand-300">{formatKg(getShipmentWeight(shipment))}</span>
                    </div>
                    {shipment.rejectionReason && (
                      <div className="mt-3 text-xs bg-red-500/10 border border-red-500/20 text-red-200 p-2 rounded-md">
                        <strong>Keterangan:</strong> {shipment.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Admin Actions */}
                  {shipment.status === 'MANDOR_APPROVED' && (
                    <div className="xl:w-64 flex flex-col gap-2 justify-center border-t xl:border-t-0 xl:border-l border-white/10 pt-4 xl:pt-0 xl:pl-6">
                      <p className="text-xs text-center text-slate-400 mb-2">Keputusan Admin</p>
                      <button
                        onClick={() => handleApprove(shipment.id as string)}
                        disabled={updatingId === shipment.id}
                        className="btn-primary w-full justify-center bg-green-600 hover:bg-green-500 text-white"
                      >
                        <CheckCircle2 size={16} className="mr-1" />
                        {updatingId === shipment.id ? 'Memproses...' : 'Setujui Penuh'}
                      </button>
                      <button
                        onClick={() => setActionModal({ type: 'PARTIAL', shipment })}
                        disabled={updatingId === shipment.id}
                        className="btn-secondary w-full justify-center border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      >
                        <AlertTriangle size={16} className="mr-1" />
                        Koreksi Parsial
                      </button>
                      <button
                        onClick={() => setActionModal({ type: 'REJECT', shipment })}
                        disabled={updatingId === shipment.id}
                        className="btn-secondary w-full justify-center border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle size={16} className="mr-1" />
                        Tolak
                      </button>
                    </div>
                  )}
                  
                  {shipment.status !== 'MANDOR_APPROVED' && (
                    <div className="xl:w-64 flex flex-col justify-center items-center border-t xl:border-t-0 xl:border-l border-white/10 pt-4 xl:pt-0 xl:pl-6 text-center">
                       <ShieldCheck size={24} className="text-slate-600 mb-2" />
                       <span className="text-xs text-slate-500">
                         {shipment.status === 'MEMUAT' || shipment.status === 'MENGIRIM' || shipment.status === 'TIBA' 
                           ? 'Menunggu proses di lapangan' 
                           : 'Selesai diproses'}
                       </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
