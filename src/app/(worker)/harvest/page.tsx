'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { harvestService } from '@/services/harvest.service';
import { authService } from '@/services/auth.service';
import { plantationService } from '@/services/plantation.service';
import { Harvest, HarvestStatus, Plantation } from '@/types';
import { Camera, Filter, RefreshCw, Send } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plantationsLoading, setPlantationsLoading] = useState(true);
  const [plantationMessage, setPlantationMessage] = useState('');
  const [assignedPlantations, setAssignedPlantations] = useState<Plantation[]>([]);
  const [form, setForm] = useState({
    plantationId: '',
    weight: '',
    news: '',
    files: null as FileList | null,
  });
  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    status: HarvestStatus | '';
  }>({
    startDate: '',
    endDate: '',
    status: '',
  });

  const userInfo = authService.getUserInfo();
  const mandorId = userInfo?.mandorId;

  const hasLoggedToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return harvests.some((harvest) => {
      const sourceDate = harvest.harvestDate || harvest.createdAt;
      if (!sourceDate) return false;
      const parsed = new Date(sourceDate);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === today;
    });
  }, [harvests]);

  const fetchHarvests = async (nextFilters = filters) => {
    try {
      setLoading(true);
      if (!userInfo?.id) return;

      try {
        const data = await harvestService.getMine({
          startDate: nextFilters.startDate || undefined,
          endDate: nextFilters.endDate || undefined,
          status: nextFilters.status || undefined,
        });
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

  const fetchAssignedPlantations = async () => {
    try {
      setPlantationsLoading(true);
      setPlantationMessage('');
      setAssignedPlantations([]);

      if (!userInfo?.id) return;

      if (!mandorId) {
        setPlantationMessage('Anda belum ditugaskan ke Mandor. Hubungi Admin untuk menyelesaikan penugasan.');
        return;
      }

      const mine = await plantationService.getByMandor(mandorId);
      setAssignedPlantations(mine);

      if (mine.length === 0) {
        setPlantationMessage('Mandor Anda belum ditugaskan ke kebun manapun.');
        setForm((current) => ({ ...current, plantationId: '' }));
        return;
      }

      setForm((current) => (
        current.plantationId
          ? current
          : { ...current, plantationId: mine.length === 1 ? String(mine[0].id) : '' }
      ));
    } catch (err) {
      setPlantationMessage(err instanceof Error ? err.message : 'Gagal memuat kebun yang ditugaskan');
    } finally {
      setPlantationsLoading(false);
    }
  };

  useEffect(() => {
    void fetchHarvests();
    void fetchAssignedPlantations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id, mandorId]);

  const handleFilter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) {
      setError('Tanggal akhir tidak boleh sebelum tanggal mulai');
      return;
    }

    setError('');
    await fetchHarvests(filters);
  };

  const handleResetFilter = async () => {
    const emptyFilters = { startDate: '', endDate: '', status: '' as HarvestStatus | '' };
    setFilters(emptyFilters);
    setError('');
    await fetchHarvests(emptyFilters);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (hasLoggedToday) {
      setError('Anda sudah mencatat panen hari ini. Silakan tunggu hari berikutnya.');
      return;
    }

    if (!form.plantationId) {
      setError('Pilih kebun yang ditugaskan sebelum mengirim log panen.');
      return;
    }

    const weight = Number(form.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Berat panen harus lebih dari 0 kg');
      return;
    }

    if (!form.files || form.files.length === 0) {
      setError('Minimal 1 foto hasil panen harus dilampirkan');
      return;
    }

    try {
      setSaving(true);
      await harvestService.create({
        plantationId: form.plantationId,
        weight,
        news: form.news.trim(),
        files: form.files,
      });
      setSuccess('Log panen berhasil dikirim dan menunggu validasi mandor.');
      setForm({
        plantationId: assignedPlantations.length === 1 ? String(assignedPlantations[0].id) : '',
        weight: '',
        news: '',
        files: null,
      });
      const fileInput = document.getElementById('harvest-photos') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      await fetchHarvests(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim log panen');
    } finally {
      setSaving(false);
    }
  };

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
      {success && <div className="alert-success"><span>{success}</span></div>}

      <section className="surface-panel p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-green-500/15 text-green-300 flex items-center justify-center shrink-0">
            <Camera size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="section-title">Log Panen Baru</h2>
            <p className="text-sm text-slate-500 mt-1">Kirim hasil panen harian untuk divalidasi mandor.</p>
          </div>
        </div>
        {hasLoggedToday && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Catatan panen hari ini sudah tersimpan. Form akan aktif lagi besok.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {plantationMessage && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {plantationMessage}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="harvest-plantation" className="label-sm">Kebun</label>
              <select
                id="harvest-plantation"
                data-testid="harvest-plantation-select"
                value={form.plantationId}
                onChange={(event) => setForm({ ...form, plantationId: event.target.value })}
                className="ms-input"
                disabled={plantationsLoading || assignedPlantations.length === 0}
                required
              >
                <option value="">
                  {plantationsLoading ? 'Memuat kebun...' : '-- Pilih Kebun --'}
                </option>
                {assignedPlantations.map((plantation) => (
                  <option key={String(plantation.id)} value={String(plantation.id)}>
                    {plantation.code ? `${plantation.code} - ` : ''}{plantation.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="harvest-weight" className="label-sm">Berat Panen (kg)</label>
              <input
                id="harvest-weight"
                type="number"
                min="0.01"
                step="0.01"
                value={form.weight}
                onChange={(event) => setForm({ ...form, weight: event.target.value })}
                className="ms-input"
                placeholder="120"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="harvest-news" className="label-sm">Catatan Panen</label>
            <textarea
              id="harvest-news"
              rows={3}
              value={form.news}
              onChange={(event) => setForm({ ...form, news: event.target.value })}
              className="ms-input resize-none"
              placeholder="Kondisi buah, blok panen, atau catatan lapangan"
              required
            />
          </div>
          <div>
            <label htmlFor="harvest-photos" className="label-sm">Foto Hasil Panen</label>
            <input
              id="harvest-photos"
              data-testid="harvest-photo-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setForm({ ...form, files: event.target.files })}
              className="ms-input file:mr-3 file:rounded-md file:border-0 file:bg-green-500/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-green-200"
              required
            />
          </div>
          <button type="submit" disabled={saving || hasLoggedToday || plantationsLoading || assignedPlantations.length === 0} data-testid="harvest-create-button" className="btn-primary w-full justify-center py-3">
            <Send size={16} aria-hidden="true" />{saving ? 'Mengirim...' : 'Kirim Log Panen'}
          </button>
        </form>
      </section>

      <section className="surface-panel p-5">
        <form onSubmit={handleFilter} className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
          <div>
            <label className="label-sm">Tanggal Mulai</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
              className="ms-input"
            />
          </div>
          <div>
            <label className="label-sm">Tanggal Akhir</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
              className="ms-input"
            />
          </div>
          <div>
            <label className="label-sm">Status</label>
            <select
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value as HarvestStatus | '' })}
              className="ms-input"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Filter size={15} aria-hidden="true" />Filter
            </button>
            <button type="button" onClick={handleResetFilter} className="btn-ghost justify-center">
              <RefreshCw size={15} aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>

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
