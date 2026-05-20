'use client';

import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, Clock3, PackagePlus, Save, Search, CheckCircle2, XCircle, Truck, X } from 'lucide-react';
import { Shipment, SupirAssignment, Harvest } from '@/types';
import { shipmentService } from '@/services/shipment.service';
import { harvestService } from '@/services/harvest.service';
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

const MAX_SHIPMENT_KG = 400;

interface MandorShipmentViewProps {
  shipments: Shipment[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export default function MandorShipmentView({ shipments, loading, error, onRefresh }: MandorShipmentViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Data for Dropdowns
  const [supirs, setSupirs] = useState<SupirAssignment[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form State
  const [selectedSupirId, setSelectedSupirId] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedHarvestIds, setSelectedHarvestIds] = useState<string[]>([]);
  
  // Approval State
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (showForm) {
      loadFormData();
    }
  }, [showForm]);

  const loadFormData = async () => {
    try {
      setLoadingData(true);
      setFormError('');
      
      let supirData: SupirAssignment[] = [];
      let harvestData: Harvest[] = [];
      let errors: string[] = [];

      try {
        supirData = await shipmentService.getAvailableSupirs();
      } catch (err) {
        console.error('Error fetching supirs:', err);
        errors.push(`Supir: ${err instanceof Error ? err.message : 'Gagal memuat'}`);
      }

      try {
        harvestData = await harvestService.getAll({ status: 'APPROVED' as any });
      } catch (err) {
        console.error('Error fetching harvests:', err);
        errors.push(`Panen: ${err instanceof Error ? err.message : 'Gagal memuat'}`);
      }

      setSupirs(supirData);
      setHarvests(harvestData);

      if (errors.length > 0) {
        setFormError(errors.join(' | '));
      }
    } finally {
      setLoadingData(false);
    }
  };

  const toggleHarvestSelection = (id: string) => {
    setSelectedHarvestIds(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
    );
  };

  const selectedHarvestsData = useMemo(() => {
    return harvests.filter(h => selectedHarvestIds.includes(String(h.id)));
  }, [harvests, selectedHarvestIds]);

  const totalKg = useMemo(() => {
    return selectedHarvestsData.reduce((sum, h) => sum + (h.weight || 0), 0);
  }, [selectedHarvestsData]);

  const isOverLimit = totalKg > MAX_SHIPMENT_KG;
  const canSubmit = selectedSupirId && destination && selectedHarvestIds.length > 0 && !isOverLimit && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSaving(true);
      setFormError('');
      
      const items = selectedHarvestsData.map(h => ({
        harvestId: String(h.id),
        weightKg: h.weight || 0
      }));

      await shipmentService.create({
        supirUserId: selectedSupirId,
        destination,
        items,
        weight: totalKg,
      });

      setShowForm(false);
      setSelectedSupirId('');
      setDestination('');
      setSelectedHarvestIds([]);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal membuat pengiriman');
    } finally {
      setSaving(false);
    }
  };

  const handleApproval = async (shipmentId: string, approved: boolean) => {
    try {
      setUpdatingId(shipmentId);
      const status = approved ? 'MANDOR_APPROVED' : 'MANDOR_REJECTED';
      await shipmentService.approveByMandor(shipmentId, { status });
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memproses persetujuan');
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
      <header className="page-heading flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="page-eyebrow">Manajemen Logistik</p>
          <h1 className="text-xl font-bold text-white md:text-2xl">Pengiriman Panen</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Tugaskan supir dan setujui pengiriman yang telah tiba.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className={`btn-primary shrink-0 ${showForm ? 'bg-slate-700 hover:bg-slate-600 border-slate-600' : ''}`}
        >
          {showForm ? <X size={16} /> : <PackagePlus size={16} />}
          {showForm ? 'Batal' : '+ Buat Pengiriman'}
        </button>
      </header>

      {error && (
        <div className="alert-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <div className="surface-panel bg-white p-6 shadow-xl border-t-4 border-t-brand-500 animate-slide-up">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PackagePlus size={20} className="text-brand-400" />
              Tugaskan Pengiriman Baru
            </h2>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-brand-500/20 text-brand-300'}`}>
              <Truck size={16} />
              {formatKg(totalKg)} / {MAX_SHIPMENT_KG} kg
            </div>
          </div>

          {formError && (
            <div className="alert-error mb-6" role="alert">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="block">
                <span className="label-sm">Pilih Supir Truk</span>
                <select
                  value={selectedSupirId}
                  onChange={(e) => setSelectedSupirId(e.target.value)}
                  className="ms-input bg-slate-900 border-slate-700 h-12"
                  disabled={loadingData}
                  required
                >
                  <option value="">-- Pilih Supir --</option>
                  {supirs.map(s => (
                    <option key={s.userId as string} value={s.userId as string}>{s.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="label-sm">Tujuan Pabrik</span>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Contoh: Pabrik Sawit Utara"
                  className="ms-input h-12"
                  required
                />
              </label>
            </div>

            <div className="block">
              <span className="label-sm mb-3 block">Pilih Panen yang Akan Diangkut</span>
              {loadingData ? (
                <div className="p-8 text-center text-slate-500 border border-white/10 rounded-lg border-dashed">
                  <Clock3 className="animate-spin mx-auto mb-2" size={24} />
                  Memuat daftar panen...
                </div>
              ) : harvests.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-white/10 rounded-lg border-dashed">
                  Tidak ada panen dengan status Disetujui yang siap diangkut.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {harvests.map(h => {
                    const isSelected = selectedHarvestIds.includes(String(h.id));
                    return (
                      <label 
                        key={h.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                          ${isSelected ? 'bg-brand-500/20 border-brand-500' : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'}`}
                      >
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleHarvestSelection(String(h.id))}
                          className="w-5 h-5 rounded border-slate-600 text-brand-500 focus:ring-brand-500 bg-slate-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold">{formatKg(h.weight || 0)}</p>
                          <p className="text-xs text-slate-400 truncate">{h.harvesterName}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-ghost"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary min-w-[200px] justify-center text-base py-2.5"
              >
                <Save size={18} className="mr-2" />
                {saving ? 'Menyimpan...' : 'Tugaskan Pengiriman'}
              </button>
            </div>
          </form>
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="empty-state bg-white p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-white">Belum ada pengiriman</h3>
          <p className="text-sm text-slate-400">Buat pengiriman baru untuk menugaskan supir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {shipments.map(shipment => (
            <div key={shipment.id} className="surface-panel bg-white p-5 flex flex-col hover:border-white/20 transition-colors">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <span className={`badge ${shipmentStatusBadge[shipment.status] || 'badge-gray'}`}>
                    {formatShipmentStatus(shipment.status)}
                  </span>
                  <span className="text-xs font-mono text-slate-500">#{getShortId(shipment.id)}</span>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock3 size={12} /> {formatDateTime(shipment.createdAt)}
                </span>
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-4 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 truncate">{shipment.destination || '-'}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Tujuan</p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 truncate">{getWorkerDisplay(shipment.supirName, shipment.supirUserId)}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Supir</p>
                </div>
                <div className="col-span-2 bg-slate-900/50 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Total Muatan</span>
                  <span className="text-base font-bold text-brand-400">{formatKg(getShipmentWeight(shipment))}</span>
                </div>
              </div>

              <div className="mb-5">
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

              {shipment.status === 'TIBA' ? (
                <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleApproval(shipment.id as string, true)}
                    disabled={updatingId === shipment.id}
                    className="btn-primary justify-center bg-green-600 hover:bg-green-500 text-white"
                  >
                    <CheckCircle2 size={18} className="mr-2" />
                    Setujui
                  </button>
                  <button
                    onClick={() => handleApproval(shipment.id as string, false)}
                    disabled={updatingId === shipment.id}
                    className="btn-secondary justify-center text-red-400 border-red-500/30 hover:bg-red-500/10"
                  >
                    <XCircle size={18} className="mr-2" />
                    Tolak
                  </button>
                </div>
              ) : (
                <div className="mt-auto pt-3 border-t border-white/10 text-center text-sm text-slate-500">
                  {shipment.status === 'MEMUAT' || shipment.status === 'MENGIRIM' 
                    ? 'Sedang dalam proses perjalanan' 
                    : 'Persetujuan selesai'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
