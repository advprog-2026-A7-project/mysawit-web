'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { harvestService } from '@/services/harvest.service';
import { authService } from '@/services/auth.service';
import { Harvest, HarvestStatus } from '@/types';

const statusOptions: HarvestStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const statusLabel: Record<HarvestStatus, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
};

interface HarvestFilters {
  harvesterName: string;
  startDate: string;
  endDate: string;
}

const emptyFilters: HarvestFilters = {
  harvesterName: '',
  startDate: '',
  endDate: '',
};

const ITEMS_PER_PAGE = 10;

export default function HarvestsPage() {
  const router = useRouter();
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<HarvestFilters>(emptyFilters);
  const [formData, setFormData] = useState({
    plantationId: '',
    weight: '',
    news: '',
  });
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [statusForm, setStatusForm] = useState({
    id: '',
    status: 'APPROVED' as HarvestStatus,
    rejectionReason: '',
  });

  const totalPages = Math.max(1, Math.ceil(harvests.length / ITEMS_PER_PAGE));
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentHarvests = harvests.slice(indexOfFirstItem, indexOfLastItem);

  const totals = useMemo(() => {
    const totalWeight = harvests.reduce((sum, harvest) => sum + harvest.weight, 0);
    const pending = harvests.filter((harvest) => harvest.status === 'PENDING').length;
    const approved = harvests.filter((harvest) => harvest.status === 'APPROVED').length;
    const rejected = harvests.filter((harvest) => harvest.status === 'REJECTED').length;

    return {
      totalWeight,
      pending,
      approved,
      rejected,
    };
  }, [harvests]);

  const loadHarvests = useCallback(async (nextFilters: HarvestFilters = emptyFilters) => {
    try {
      setLoading(true);
      const data = await harvestService.getAll({
        harvesterName: nextFilters.harvesterName || undefined,
        startDate: nextFilters.startDate || undefined,
        endDate: nextFilters.endDate || undefined,
      });
      setHarvests(data);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat catatan panen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    void loadHarvests();
  }, [loadHarvests, router]);

  const handleFilter = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    await loadHarvests(filters);
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    if (!photoFiles || photoFiles.length === 0) {
      setError('Minimal 1 foto hasil panen harus dilampirkan');
      return;
    }
    try {
      setSaving(true);
      await harvestService.create({
        plantationId: formData.plantationId,
        weight: Number.parseFloat(formData.weight),
        news: formData.news,
        files: photoFiles,
      });
      setShowForm(false);
      setFormData({ plantationId: '', weight: '', news: '' });
      setPhotoFiles(null);
      await loadHarvests(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan catatan panen');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSubmit = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    try {
      await harvestService.updateStatus({
        id: statusForm.id,
        status: statusForm.status,
        rejectionReason:
          statusForm.status === 'REJECTED' ? statusForm.rejectionReason || undefined : undefined,
      });
      setStatusForm({
        id: '',
        status: 'APPROVED',
        rejectionReason: '',
      });
      await loadHarvests(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status panen');
    }
  };

  return (
    <div className="page-shell space-y-6 animate-fade-in">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Panen Harian</p>
          <h1 className="text-2xl font-bold text-white">Pencatatan Panen</h1>
          <p className="text-sm text-slate-500 mt-1">Catat hasil panen, bukti foto, dan status validasi lapangan.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setCurrentPage(1);
          }}
          className="btn-primary"
        >
          {showForm ? 'Batal' : '+ Catat Panen'}
        </button>
      </header>

      <main className="space-y-6">
        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="metric-card">
            <p className="text-sm text-slate-400">Total Catatan</p>
            <p className="text-2xl font-bold text-white">{harvests.length}</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-slate-400">Berat Total</p>
            <p className="text-2xl font-bold text-white">{totals.totalWeight.toLocaleString('id-ID')} kg</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-slate-400">Disetujui</p>
            <p className="text-2xl font-bold text-green-300">{totals.approved}</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-slate-400">Menunggu / Ditolak</p>
            <p className="text-2xl font-bold text-amber-300">{totals.pending} / {totals.rejected}</p>
          </div>
        </div>

        <form onSubmit={handleFilter} className="surface-panel bg-white p-5">
          <h2 className="section-title mb-4">Filter Catatan Panen</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={filters.harvesterName}
              onChange={(event) => setFilters({ ...filters, harvesterName: event.target.value })}
              placeholder="Nama pekerja"
              className="ms-input"
            />
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
              className="ms-input"
            />
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
              className="ms-input"
            />
            <button
              type="submit"
              className="btn-primary justify-center"
            >
              Terapkan Filter
            </button>
          </div>
        </form>

        {showForm && (
          <div className="surface-panel bg-white p-5">
            <h2 className="section-title mb-4">Catat Panen</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.plantationId}
                  onChange={(event) => setFormData({ ...formData, plantationId: event.target.value })}
                  placeholder="Kebun"
                  className="ms-input"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(event) => setFormData({ ...formData, weight: event.target.value })}
                  placeholder="Berat panen (kg)"
                  className="ms-input"
                  required
                />
              </div>
              <textarea
                rows={3}
                value={formData.news}
                onChange={(event) => setFormData({ ...formData, news: event.target.value })}
                placeholder="Keterangan panen"
                className="ms-input"
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Foto Bukti Panen <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(event) => setPhotoFiles(event.target.files)}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600/20 file:text-green-400 hover:file:bg-green-600/30 cursor-pointer"
                  required
                />
                {photoFiles && photoFiles.length > 0 && (
                  <p className="text-xs text-green-400 mt-1">{photoFiles.length} foto dipilih</p>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full justify-center py-3"
              >
                {saving ? 'Menyimpan...' : 'Simpan Panen'}
              </button>
            </form>
          </div>
        )}

        <div className="surface-panel bg-white p-5">
          <h2 className="section-title mb-4">Ubah Status Panen</h2>
          <form onSubmit={handleStatusSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={statusForm.id}
              onChange={(event) => setStatusForm({ ...statusForm, id: event.target.value })}
              placeholder="Nomor catatan panen"
              className="ms-input"
              required
            />
            <select
              value={statusForm.status}
              onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value as HarvestStatus })}
              className="ms-input"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabel[status]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={statusForm.rejectionReason}
              onChange={(event) => setStatusForm({ ...statusForm, rejectionReason: event.target.value })}
              placeholder="Alasan penolakan"
              className="ms-input"
            />
            <button
              type="submit"
              className="btn-secondary justify-center"
            >
              Simpan Status
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Memuat catatan panen...</div>
        ) : harvests.length === 0 ? (
          <div className="empty-state bg-white p-12 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Belum ada catatan panen</h3>
            <p className="text-slate-400">Catat panen baru atau ubah filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentHarvests.map((harvest) => (
                <div key={harvest.id} className="surface-panel bg-white p-5">
                  <div className="flex justify-between gap-3 items-start mb-3">
                    <h3 className="text-lg font-semibold text-white">Catatan Panen</h3>
                    <span className="badge badge-green">
                      {statusLabel[harvest.status || 'PENDING']}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-400">
                    <p><span className="font-medium text-slate-300">Kebun:</span> {harvest.plantationId}</p>
                    <p><span className="font-medium text-slate-300">Pekerja:</span> {harvest.harvesterName || harvest.harvesterId || '-'}</p>
                    <p><span className="font-medium text-slate-300">Mandor:</span> {harvest.foremanId ? 'Sudah diverifikasi' : '-'}</p>
                    <p><span className="font-medium text-slate-300">Berat:</span> {harvest.weight} kg</p>
                    <p><span className="font-medium text-slate-300">Tanggal:</span> {formatDateTime(harvest.harvestDate)}</p>
                    {harvest.news && <p><span className="font-medium text-slate-300">Catatan:</span> {harvest.news}</p>}
                    {harvest.rejectionReason && (
                      <p><span className="font-medium text-slate-300">Penolakan:</span> {harvest.rejectionReason}</p>
                    )}
                    {harvest.photos && harvest.photos.length > 0 && (
                      <p><span className="font-medium text-slate-300">Foto:</span> {harvest.photos.length} terlampir</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {harvests.length > ITEMS_PER_PAGE && (
              <div className="mt-10 flex flex-col items-center">
                <span className="text-sm text-slate-400 mb-4">
                  Menampilkan <span className="font-semibold text-green-300">{indexOfFirstItem + 1}</span> sampai <span className="font-semibold text-green-300">{Math.min(indexOfLastItem, harvests.length)}</span> dari <span className="font-semibold text-white">{harvests.length}</span> catatan
                </span>
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-[var(--bg-card)] border border-white/[0.08] rounded-l-lg hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-4 py-2 text-sm font-medium border-t border-b border-gray-300 ${
                        currentPage === i + 1
                          ? 'bg-green-700 text-white border-green-700 z-10'
                          : 'bg-[var(--bg-card)] text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-[var(--bg-card)] border border-white/[0.08] rounded-r-lg hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
