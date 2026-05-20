'use client';

import { useState } from 'react';
import { AlertCircle, Clock3, Truck, Route, CheckCircle2 } from 'lucide-react';
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

interface SupirShipmentViewProps {
  shipments: Shipment[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export default function SupirShipmentView({ shipments, loading, error, onRefresh }: SupirShipmentViewProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState('');

  const activeShipments = shipments.filter(s => s.status === 'MEMUAT' || s.status === 'MENGIRIM');
  const historyShipments = shipments.filter(s => s.status !== 'MEMUAT' && s.status !== 'MENGIRIM');

  const handleUpdateStatus = async (shipmentId: string, newStatus: ShipmentStatus) => {
    try {
      setUpdatingId(shipmentId);
      setUpdateError('');
      await shipmentService.updateStatus(shipmentId, { status: newStatus });
      onRefresh();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Gagal memperbarui status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="surface-panel bg-white p-8 text-center text-sm text-slate-500">
        <Clock3 size={20} aria-hidden="true" className="mx-auto mb-3 text-slate-500" />
        Memuat tugas Anda...
      </div>
    );
  }

  return (
    <div className="page-shell space-y-5 animate-fade-in">
      <header className="page-heading">
        <div className="min-w-0">
          <p className="page-eyebrow">Tugas Anda</p>
          <h1 className="text-xl font-bold text-white md:text-2xl">Pengiriman Aktif</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Perbarui status perjalanan Anda dengan satu klik.
          </p>
        </div>
      </header>

      {(error || updateError) && (
        <div className="alert-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{error || updateError}</span>
        </div>
      )}

      {activeShipments.length === 0 ? (
        <div className="empty-state bg-white p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-white">Tidak Ada Tugas Aktif</h3>
          <p className="text-sm text-slate-400">Anda belum ditugaskan untuk mengirim panen apa pun saat ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {activeShipments.map(shipment => (
            <div key={shipment.id} className="surface-panel bg-white p-5 flex flex-col h-full border-t-4 border-t-brand-500">
              <div className="flex-1">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span className={`badge ${shipmentStatusBadge[shipment.status] || 'badge-gray'}`}>
                    {formatShipmentStatus(shipment.status)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">#{getShortId(shipment.id)}</span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">{shipment.destination || 'Tujuan Belum Diisi'}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Truck size={14} />
                  <span>Total Muatan: {formatKg(getShipmentWeight(shipment))}</span>
                </div>

                <div className="space-y-3 mb-6">
                  <ol className="grid grid-cols-5 gap-1" aria-label="Progres pengiriman">
                    {progressStatuses.map((status) => (
                      <li
                        key={status}
                        title={formatShipmentStatus(status)}
                        className={`h-2 rounded-full ${getProgressState(shipment.status, status)}`}
                      />
                    ))}
                  </ol>
                  <p className="text-xs text-slate-500">Dari Mandor: {getWorkerDisplay(shipment.mandorName, shipment.mandorUserId)}</p>
                </div>
              </div>

              <div className="mt-auto">
                {shipment.status === 'MEMUAT' && (
                  <button
                    onClick={() => handleUpdateStatus(shipment.id as string, 'MENGIRIM')}
                    disabled={updatingId === shipment.id}
                    className="btn-primary w-full justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3"
                  >
                    <Route size={18} className="mr-2" />
                    {updatingId === shipment.id ? 'Memproses...' : 'Mulai Perjalanan'}
                  </button>
                )}
                {shipment.status === 'MENGIRIM' && (
                  <button
                    onClick={() => handleUpdateStatus(shipment.id as string, 'TIBA')}
                    disabled={updatingId === shipment.id}
                    className="btn-primary w-full justify-center bg-green-600 hover:bg-green-500 text-white font-semibold py-3"
                  >
                    <CheckCircle2 size={18} className="mr-2" />
                    {updatingId === shipment.id ? 'Memproses...' : 'Tiba di Pabrik'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {historyShipments.length > 0 && (
        <div className="mt-12">
          <h2 className="section-title text-base mb-4">Riwayat Pengiriman</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {historyShipments.map(shipment => (
              <div key={shipment.id} className="surface-panel bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${shipmentStatusBadge[shipment.status] || 'badge-gray'}`}>
                      {formatShipmentStatus(shipment.status)}
                    </span>
                    <span className="text-sm font-semibold text-white">{shipment.destination}</span>
                  </div>
                  <p className="text-xs text-slate-400">{formatDateTime(shipment.createdAt)} • {formatKg(getShipmentWeight(shipment))}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500">#{getShortId(shipment.id)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
