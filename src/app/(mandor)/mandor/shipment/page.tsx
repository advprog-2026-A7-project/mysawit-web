'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { CalendarDays, CheckCircle2, Hash, MapPinned, X } from 'lucide-react';
import { Shipment, SupirAssignment, Harvest } from '@/types';
import { shipmentService } from '@/services/shipment.service';
import { harvestService } from '@/services/harvest.service';
import { authService } from '@/services/auth.service';
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
} from '@/utils/shipment';

const MAX_SHIPMENT_KG = 400;

const formatHarvestDate = (value?: string) => {
  if (!value) return 'Tanggal belum tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const shortHarvestId = (id: Harvest['id']) => String(id).slice(0, 8);

const harvestNote = (harvest: Harvest) => {
  const note = harvest.news || harvest.notes || '';
  return note.length > 72 ? `${note.slice(0, 72)}...` : note;
};

export default function MandorShipmentPage() {
  // Data State
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form visibility
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

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const allShipments = await shipmentService.getAll();
      const userInfo = authService.getUserInfo();
      // Filter to only show this mandor's shipments
      const myShipments = allShipments.filter(
        (s) => String(s.mandorUserId) === String(userInfo?.id)
      );
      setShipments(myShipments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pengiriman');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

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
      const errors: string[] = [];

      try {
        supirData = await shipmentService.getAvailableSupirs();
      } catch (err) {
        console.error('Error fetching supirs:', err);
        errors.push(`Supir: ${err instanceof Error ? err.message : 'Gagal memuat'}`);
      }

      try {
        harvestData = (await harvestService.getAll({ status: 'APPROVED' }))
          .filter((harvest) => harvest.status === 'APPROVED');
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
    if (!selectedSupirId) {
      setFormError('Pilih supir dari kebun yang sama terlebih dahulu.');
      return;
    }
    if (!destination.trim()) {
      setFormError('Tujuan pabrik wajib diisi.');
      return;
    }
    if (selectedHarvestIds.length === 0) {
      setFormError('Pilih minimal satu hasil panen approved.');
      return;
    }
    if (isOverLimit) {
      setFormError(`Total muatan ${formatKg(totalKg)} melebihi batas ${MAX_SHIPMENT_KG} kg.`);
      return;
    }
    if (saving) return;

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
      });

      setShowForm(false);
      setSelectedSupirId('');
      setDestination('');
      setSelectedHarvestIds([]);
      void loadShipments();
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
      const rejectionReason = approved ? undefined : prompt('Masukkan alasan penolakan pengiriman:')?.trim();
      if (!approved && !rejectionReason) {
        setUpdatingId(null);
        setError('Alasan penolakan wajib diisi');
        return;
      }
      await shipmentService.approveByMandor(shipmentId, { status, rejectionReason });
      void loadShipments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memproses persetujuan');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-5xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
          Memuat data pengiriman...
        </div>
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
          {showForm ? <X size={16} /> : null}
          {showForm ? 'Batal' : '+ Buat Pengiriman'}
        </button>
      </header>

      {error && (
        <div className="alert-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <div className="surface-panel p-6 shadow-xl border-t-4 border-t-brand-500 animate-slide-up">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Tugaskan Pengiriman Baru
            </h2>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-brand-500/20 text-brand-300'}`}>
              {formatKg(totalKg)} / {MAX_SHIPMENT_KG} kg
            </div>
          </div>
          {isOverLimit && (
            <div className="alert-error mb-6" role="alert">
              <span>Total muatan melebihi kapasitas maksimum {MAX_SHIPMENT_KG} kg.</span>
            </div>
          )}

          {formError && (
            <div className="alert-error mb-6" role="alert">
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
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <span className="label-sm mb-1 block">Pilih Panen yang Akan Diangkut</span>
                  <p className="text-xs text-slate-500">Hanya panen berstatus disetujui yang belum masuk pengiriman.</p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {selectedHarvestIds.length} dipilih
                </span>
              </div>
              {loadingData ? (
                <div className="p-8 text-center text-slate-500 border border-white/10 rounded-lg border-dashed">
                  <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-2" />
                  Memuat daftar panen...
                </div>
              ) : harvests.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-white/10 rounded-lg border-dashed">
                  Tidak ada panen dengan status Disetujui yang siap diangkut.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[22rem] overflow-y-auto pr-2 custom-scrollbar">
                  {harvests.map(h => {
                    const isSelected = selectedHarvestIds.includes(String(h.id));
                    const note = harvestNote(h);
                    return (
                      <label
                        key={h.id}
                        className={`group grid min-h-[144px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-lg border p-4 transition-colors
                          ${isSelected ? 'bg-brand-500/15 border-brand-500/80 ring-1 ring-brand-500/40' : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleHarvestSelection(String(h.id))}
                          className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-bold text-white">{formatKg(h.weight || 0)}</p>
                              <p className="mt-0.5 truncate text-sm text-slate-300">{h.harvesterName || 'Buruh'}</p>
                            </div>
                            {isSelected && (
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white">
                                <CheckCircle2 size={16} aria-hidden="true" />
                              </span>
                            )}
                          </div>
                          <div className="grid gap-2 text-xs text-slate-500">
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <CalendarDays size={13} aria-hidden="true" className="shrink-0 text-slate-600" />
                              <span className="truncate">{formatHarvestDate(h.harvestDate || h.createdAt)}</span>
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <MapPinned size={13} aria-hidden="true" className="shrink-0 text-slate-600" />
                              <span className="truncate">Kebun {h.plantationId || '-'}</span>
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <Hash size={13} aria-hidden="true" className="shrink-0 text-slate-600" />
                              <span className="truncate">Panen #{shortHarvestId(h.id)}</span>
                            </span>
                          </div>
                          {note && (
                            <p className="mt-3 line-clamp-2 rounded-md border border-white/[0.06] bg-black/10 px-2 py-1.5 text-xs text-slate-400">
                              {note}
                            </p>
                          )}
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
                data-testid="shipment-create-button"
                className="btn-primary min-w-[200px] justify-center text-base py-2.5"
              >
                {saving ? 'Menyimpan...' : 'Tugaskan Pengiriman'}
              </button>
            </div>
          </form>
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="empty-state p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-white">Belum ada pengiriman</h3>
          <p className="text-sm text-slate-400">Buat pengiriman baru untuk menugaskan supir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {shipments.map(shipment => (
            <div key={shipment.id} className="surface-panel p-5 flex flex-col hover:border-white/20 transition-colors">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <span className={`badge ${shipmentStatusBadge[shipment.status] || 'badge-gray'}`}>
                    {formatShipmentStatus(shipment.status)}
                  </span>
                  <span className="text-xs font-mono text-slate-500">#{getShortId(shipment.id)}</span>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  {formatDateTime(shipment.createdAt)}
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
                    Setujui
                  </button>
                  <button
                    onClick={() => handleApproval(shipment.id as string, false)}
                    disabled={updatingId === shipment.id}
                    className="btn-secondary justify-center text-red-400 border-red-500/30 hover:bg-red-500/10"
                  >
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
