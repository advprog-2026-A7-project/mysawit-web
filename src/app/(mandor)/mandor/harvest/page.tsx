'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { harvestService } from '@/services/harvest.service';
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
  date: string;
  status: HarvestStatus | '';
}

const emptyFilters: HarvestFilters = {
  harvesterName: '',
  date: '',
  status: '',
};

const ITEMS_PER_PAGE = 12;

export default function MandorHarvestsPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<HarvestFilters>(emptyFilters);

  const totalPages = Math.max(1, Math.ceil(harvests.length / ITEMS_PER_PAGE));
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentHarvests = harvests.slice(indexOfFirstItem, indexOfLastItem);

  const totals = useMemo(() => {
    const totalWeight = harvests.reduce((sum, harvest) => sum + harvest.weight, 0);
    const pending = harvests.filter((harvest) => harvest.status === 'PENDING').length;
    const approved = harvests.filter((harvest) => harvest.status === 'APPROVED').length;
    const rejected = harvests.filter((harvest) => harvest.status === 'REJECTED').length;

    return { totalWeight, pending, approved, rejected };
  }, [harvests]);

  const loadHarvests = useCallback(async (nextFilters: HarvestFilters = emptyFilters) => {
    try {
      setLoading(true);
      const data = await harvestService.getAll({
        harvesterName: nextFilters.harvesterName || undefined,
        date: nextFilters.date || undefined,
      });
      // Optionally filter by status locally if backend doesn't support it for mandor
      const finalData = nextFilters.status 
        ? data.filter(h => h.status === nextFilters.status)
        : data;
        
      setHarvests(finalData);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat catatan panen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHarvests();
  }, [loadHarvests]);

  const handleFilter = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    await loadHarvests(filters);
  };

  const handleAction = async (harvestId: string | number, status: HarvestStatus, reason?: string) => {
    try {
      const updatedHarvest = await harvestService.updateStatus({
        id: String(harvestId),
        status: status,
        rejectionReason: reason || undefined,
      });
      setHarvests((current) =>
        current.map((harvest) =>
          String(harvest.id) === String(harvestId)
            ? { ...harvest, ...updatedHarvest }
            : harvest,
        ),
      );

      const nextFilters = filters.status && filters.status !== status
        ? { ...filters, status: '' as const }
        : filters;

      if (nextFilters !== filters) {
        setFilters(nextFilters);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status panen');
    }
  };

  return (
    <div className="page-shell space-y-6 animate-fade-in max-w-7xl mx-auto">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Validasi Lapangan</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Persetujuan Panen</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">Lakukan verifikasi hasil panen harian yang diajukan oleh buruh di kebun Anda.</p>
        </div>
      </header>

      <main className="space-y-6">
        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="metric-card bg-slate-900/50 border border-slate-800">
            <p className="text-sm text-slate-400">Total Catatan</p>
            <p className="text-2xl font-bold text-white">{harvests.length}</p>
          </div>
          <div className="metric-card bg-slate-900/50 border border-slate-800">
            <p className="text-sm text-slate-400">Berat Total</p>
            <p className="text-2xl font-bold text-white">{totals.totalWeight.toLocaleString('id-ID')} kg</p>
          </div>
          <div className="metric-card bg-green-900/10 border border-green-900/30">
            <p className="text-sm text-green-400">Telah Disetujui</p>
            <p className="text-2xl font-bold text-green-300">{totals.approved}</p>
          </div>
          <div className="metric-card bg-amber-900/10 border border-amber-900/30">
            <p className="text-sm text-amber-400">Menunggu / Ditolak</p>
            <p className="text-2xl font-bold text-amber-300">{totals.pending} / {totals.rejected}</p>
          </div>
        </div>

        <form onSubmit={handleFilter} className="surface-panel p-5 bg-[#0a1614] border border-[#152e2a]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Saring Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="label-sm mb-1">Nama Buruh</label>
              <input
                type="text"
                value={filters.harvesterName}
                onChange={(event) => setFilters({ ...filters, harvesterName: event.target.value })}
                placeholder="Cari nama..."
                className="ms-input"
              />
            </div>
            <div>
              <label className="label-sm mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value as HarvestStatus | '' })}
                className="ms-input"
              >
                <option value="">Semua Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{statusLabel[status]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-sm mb-1">Tanggal</label>
              <input
                type="date"
                value={filters.date}
                onChange={(event) => setFilters({ ...filters, date: event.target.value })}
                className="ms-input"
              />
            </div>
            <button type="submit" className="btn-primary justify-center h-[42px]">
              Terapkan Filter
            </button>
          </div>
        </form>

        {loading ? (
          <div className="surface-panel p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
            Memuat daftar panen...
          </div>
        ) : harvests.length === 0 ? (
          <div className="empty-state bg-[#0a1614] border border-[#152e2a] p-12 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Belum ada catatan panen</h3>
            <p className="text-slate-400">Tidak ada data yang sesuai dengan filter saat ini.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentHarvests.map((harvest) => (
                <div key={harvest.id} className="surface-panel bg-[#0a1614] border border-[#152e2a] hover:border-green-500/30 transition-colors flex flex-col h-full">
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{harvest.harvesterName || 'Buruh Harian'}</h3>
                        <p className="text-xs text-slate-500">{formatDateTime(harvest.harvestDate)}</p>
                      </div>
                      <span className={`badge ${harvest.status === 'APPROVED' ? 'badge-green' : harvest.status === 'REJECTED' ? 'badge-red' : 'badge-gray'}`}>
                        {statusLabel[harvest.status || 'PENDING']}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">Blok Kebun</p>
                        <p className="text-sm font-medium text-slate-300">{harvest.plantationId}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">Berat Timbangan</p>
                        <p className="text-sm font-bold text-green-400">{harvest.weight} Kg</p>
                      </div>
                    </div>
                    
                    {harvest.news && (
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Keterangan Buruh</p>
                        <p className="text-sm text-slate-300 italic">&quot;{harvest.news}&quot;</p>
                      </div>
                    )}
                    
                    {harvest.rejectionReason && harvest.status === 'REJECTED' && (
                      <div className="mb-4 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                        <p className="text-xs uppercase tracking-wider text-red-400/70 mb-1">Alasan Ditolak</p>
                        <p className="text-sm text-red-300">{harvest.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                  
                  {harvest.status === 'PENDING' && (
                    <div className="p-4 border-t border-[#152e2a] bg-black/20 flex gap-3">
                      <button 
                        onClick={() => handleAction(harvest.id, 'APPROVED')}
                        data-testid="harvest-approve-button"
                        className="flex-1 btn-primary bg-green-600 hover:bg-green-500 text-white justify-center py-2"
                      >
                        Setujui
                      </button>
                      <button 
                        onClick={() => {
                          const reason = prompt('Masukkan alasan penolakan:');
                          if (reason !== null) {
                            const trimmedReason = reason.trim();
                            if (!trimmedReason) {
                              setError('Alasan penolakan wajib diisi');
                              return;
                            }
                            handleAction(harvest.id, 'REJECTED', trimmedReason);
                          }
                        }}
                        className="flex-1 btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/10 justify-center py-2"
                      >
                        Tolak
                      </button>
                    </div>
                  )}
                  
                  {harvest.status !== 'PENDING' && (
                    <div className="p-4 border-t border-[#152e2a] bg-black/20 flex gap-3 items-center justify-center text-slate-500 text-sm">
                      Telah {statusLabel[harvest.status || 'PENDING'].toLowerCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center">
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-[#0a1614] border border-[#152e2a] rounded-l-lg hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-4 py-2 text-sm font-medium border-t border-b border-[#152e2a] bg-[#050a09] text-slate-300">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-[#0a1614] border border-[#152e2a] rounded-r-lg hover:bg-white/[0.06] disabled:opacity-50"
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
