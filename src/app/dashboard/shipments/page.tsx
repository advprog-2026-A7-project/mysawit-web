'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  PackagePlus,
  RefreshCcw,
  Route,
  Save,
  Search,
  ShieldCheck,
  Truck,
  Weight,
  X,
} from 'lucide-react';
import { shipmentService } from '@/services/shipment.service';
import { authService } from '@/services/auth.service';
import { API_ENDPOINTS } from '@/lib/api-config';
import { AdminApprovalRequest, AuthResponse, Shipment, ShipmentFilters, ShipmentStatus } from '@/types';

const MAX_SHIPMENT_KG = 400;
const VISIBLE_SHIPMENT_LIMIT = 24;

const shipmentStatuses: ShipmentStatus[] = [
  'MEMUAT',
  'MENGIRIM',
  'TIBA',
  'MANDOR_APPROVED',
  'MANDOR_REJECTED',
  'ADMIN_APPROVED',
  'ADMIN_REJECTED',
  'PARTIALLY_REJECTED',
];

const shipmentStatusLabel: Partial<Record<ShipmentStatus, string>> = {
  MEMUAT: 'Memuat',
  MENGIRIM: 'Dalam Perjalanan',
  TIBA: 'Tiba di Tujuan',
  MANDOR_APPROVED: 'Disetujui Mandor',
  MANDOR_REJECTED: 'Ditolak Mandor',
  ADMIN_APPROVED: 'Disetujui',
  ADMIN_REJECTED: 'Ditolak Admin',
  PARTIALLY_REJECTED: 'Perlu Koreksi',
};

const shipmentStatusBadge: Partial<Record<ShipmentStatus, string>> = {
  MEMUAT: 'badge-yellow',
  MENGIRIM: 'badge-blue',
  TIBA: 'badge-purple',
  MANDOR_APPROVED: 'badge-green',
  MANDOR_REJECTED: 'badge-red',
  ADMIN_APPROVED: 'badge-green',
  ADMIN_REJECTED: 'badge-red',
  PARTIALLY_REJECTED: 'badge-orange',
};

const progressStatuses: ShipmentStatus[] = ['MEMUAT', 'MENGIRIM', 'TIBA', 'MANDOR_APPROVED', 'ADMIN_APPROVED'];

interface ShipmentFilterState {
  status: string;
  date: string;
  search: string;
}

interface AdminFormState {
  shipmentId: string;
  status: Extract<ShipmentStatus, 'ADMIN_APPROVED' | 'ADMIN_REJECTED' | 'PARTIALLY_REJECTED'>;
  rejectionReason: string;
  kgAccepted: string;
}

const emptyFilters: ShipmentFilterState = {
  status: '',
  date: '',
  search: '',
};

const formatShipmentStatus = (status: ShipmentStatus) => shipmentStatusLabel[status] || status;

const getShipmentWeight = (shipment: Shipment) => shipment.totalKg ?? shipment.weight ?? 0;

const formatKg = (value: number): string =>
  `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const parseItems = (value: string) =>
  value
    .split('\n')
    .map((line) => {
      const [harvestId = '', weightKg = ''] = line.split(',').map((part) => part.trim());
      return {
        harvestId,
        weightKg: Number.parseFloat(weightKg),
      };
    })
    .filter((item) => item.harvestId && Number.isFinite(item.weightKg));

const toShipmentFilters = (filters: ShipmentFilterState): ShipmentFilters | undefined => {
  const trimmedSearch = filters.search.trim();

  if (!filters.status && !filters.date && !trimmedSearch) {
    return undefined;
  }

  return {
    status: filters.status || undefined,
    date: filters.date || undefined,
    mandorName: trimmedSearch || undefined,
    supirName: trimmedSearch || undefined,
  };
};

const getShortId = (id: Shipment['id']) => String(id).slice(0, 8);

const getWorkerDisplay = (name?: string, userId?: Shipment['supirUserId'], fallback = '-') =>
  name || (userId ? fallback : '-');

const isRejectedStatus = (status: ShipmentStatus) =>
  status === 'MANDOR_REJECTED' || status === 'ADMIN_REJECTED' || status === 'PARTIALLY_REJECTED';

const getProgressState = (shipmentStatus: ShipmentStatus, stepStatus: ShipmentStatus) => {
  if (isRejectedStatus(shipmentStatus)) return 'progress-step-rejected';

  const currentIndex = progressStatuses.indexOf(shipmentStatus);
  const stepIndex = progressStatuses.indexOf(stepStatus);

  if (currentIndex >= stepIndex && currentIndex !== -1) return 'progress-step-active';
  return 'progress-step-inactive';
};

const buildAdminPayload = (form: AdminFormState): AdminApprovalRequest | ShipmentStatus => {
  const rejectionReason = form.rejectionReason.trim();
  const kgAccepted = Number.parseFloat(form.kgAccepted);

  if (!rejectionReason && !Number.isFinite(kgAccepted)) {
    return form.status;
  }

  return {
    status: form.status,
    rejectionReason: rejectionReason || undefined,
    kgAccepted: Number.isFinite(kgAccepted) ? kgAccepted : undefined,
  };
};

const filterControlStyle = {
  height: '52px',
  borderRadius: '8px',
};

const isUnauthorizedError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes('unauthorized');

const refreshAuthSession = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const authResponse = await response.json() as AuthResponse;
    authService.saveAuth(authResponse);
    return true;
  } catch {
    return false;
  }
};

export default function ShipmentsPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<ShipmentFilterState>(emptyFilters);
  const [formData, setFormData] = useState({
    supirUserId: '',
    destination: '',
    items: '',
  });
  const [statusForm, setStatusForm] = useState({
    shipmentId: '',
    status: 'MENGIRIM' as ShipmentStatus,
  });
  const [adminForm, setAdminForm] = useState<AdminFormState>({
    shipmentId: '',
    status: 'ADMIN_APPROVED',
    rejectionReason: '',
    kgAccepted: '',
  });

  const requestShipments = useCallback(async (nextFilters: ShipmentFilterState = emptyFilters) => {
    const hasOnlyStatus = nextFilters.status && !nextFilters.date && !nextFilters.search.trim();
    return hasOnlyStatus
      ? shipmentService.getByStatus(nextFilters.status)
      : shipmentService.getAll(toShipmentFilters(nextFilters));
  }, []);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const loadShipments = useCallback(async (nextFilters: ShipmentFilterState = emptyFilters) => {
    try {
      setLoading(true);
      let data: Shipment[];

      try {
        data = await requestShipments(nextFilters);
      } catch (err) {
        if (!isUnauthorizedError(err)) throw err;

        const refreshed = await refreshAuthSession();
        if (!refreshed) {
          authService.logout();
          routerRef.current.push('/login');
          throw new Error('Unauthorized');
        }

        try {
          data = await requestShipments(nextFilters);
        } catch (retryErr) {
          if (isUnauthorizedError(retryErr)) {
            authService.logout();
            routerRef.current.push('/login');
            throw new Error('Unauthorized');
          }
          throw retryErr;
        }
      }

      setShipments(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengiriman');
    } finally {
      setLoading(false);
    }
  }, [requestShipments]);

  const itemSummary = useMemo(() => {
    const items = parseItems(formData.items);
    const totalKg = items.reduce((sum, item) => sum + item.weightKg, 0);
    const uniqueHarvests = new Set(items.map((item) => item.harvestId));

    return {
      items,
      totalKg,
      hasDuplicates: uniqueHarvests.size !== items.length,
      isOverLimit: totalKg > MAX_SHIPMENT_KG,
    };
  }, [formData.items]);

  const totals = useMemo(() => {
    const totalKg = shipments.reduce((sum, shipment) => sum + getShipmentWeight(shipment), 0);
    const active = shipments.filter((shipment) => shipment.status === 'MEMUAT' || shipment.status === 'MENGIRIM').length;

    return {
      totalKg,
      active,
      completed: shipments.filter((shipment) => shipment.status === 'TIBA').length,
      needsReview: shipments.filter((shipment) => shipment.status === 'MANDOR_APPROVED').length,
    };
  }, [shipments]);
  const visibleShipments = useMemo(() => shipments.slice(0, VISIBLE_SHIPMENT_LIMIT), [shipments]);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  const handleFilter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadShipments(filters);
  };

  const handleResetFilter = () => {
    setFilters(emptyFilters);
    void loadShipments(emptyFilters);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (itemSummary.items.length === 0) {
      setError('Minimal satu muatan valid harus diisi');
      return;
    }

    if (itemSummary.hasDuplicates) {
      setError('Harvest ID tidak boleh duplikat dalam satu pengiriman');
      return;
    }

    if (itemSummary.isOverLimit) {
      setError(`Total muatan tidak boleh melebihi ${MAX_SHIPMENT_KG} kg`);
      return;
    }

    try {
      setSaving(true);
      await shipmentService.create({
        supirUserId: formData.supirUserId,
        destination: formData.destination,
        items: itemSummary.items,
        weight: itemSummary.totalKg,
      });
      setShowForm(false);
      setFormData({
        supirUserId: '',
        destination: '',
        items: '',
      });
      await loadShipments(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat pengiriman');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await shipmentService.updateStatus(statusForm.shipmentId, {
        status: statusForm.status,
      });
      setStatusForm({
        shipmentId: '',
        status: 'MENGIRIM',
      });
      await loadShipments(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui pengiriman');
    }
  };

  const handleAdminSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await shipmentService.approveByAdmin(adminForm.shipmentId, buildAdminPayload(adminForm));
      setAdminForm({
        shipmentId: '',
        status: 'ADMIN_APPROVED',
        rejectionReason: '',
        kgAccepted: '',
      });
      await loadShipments(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan persetujuan');
    }
  };

  const adminNeedsDetail = adminForm.status === 'ADMIN_REJECTED' || adminForm.status === 'PARTIALLY_REJECTED';
  const createDisabled = saving || itemSummary.items.length === 0 || itemSummary.hasDuplicates || itemSummary.isOverLimit;

  return (
    <div className="page-shell space-y-5 animate-fade-in">
      <header className="page-heading">
        <div className="min-w-0">
          <p className="page-eyebrow">Kebun ke Pabrik</p>
          <h1 className="text-xl font-bold text-white md:text-2xl">Pengiriman Hasil Panen</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Pantau muatan, tujuan, dan progres pengiriman dari supir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="btn-primary shrink-0"
        >
          {showForm ? <X size={16} aria-hidden="true" /> : <PackagePlus size={16} aria-hidden="true" />}
          {showForm ? 'Batal' : '+ Buat Pengiriman'}
        </button>
      </header>

      <main className="space-y-5">
        {error && (
          <div className="alert-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="surface-panel bg-white p-4">
            <p className="text-sm text-slate-400">Pengiriman</p>
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
          <div className="surface-panel bg-white p-4">
            <p className="text-sm text-slate-400">Berjalan</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-xl font-bold text-amber-300">{totals.active}</p>
              <Route size={18} aria-hidden="true" className="text-amber-500/70" />
            </div>
          </div>
          <div className="surface-panel bg-white p-4">
            <p className="text-sm text-slate-400">Tiba</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-xl font-bold text-cyan-300">{totals.completed}</p>
              <CheckCircle2 size={18} aria-hidden="true" className="text-cyan-500/70" />
            </div>
          </div>
        </section>

        <form onSubmit={handleFilter} className="surface-panel bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title text-base">
              <Filter size={17} aria-hidden="true" />
              Filter Pengiriman
            </h2>
            <span className="text-xs font-semibold text-slate-500">{totals.needsReview} menunggu admin</span>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
            <label className="block lg:col-span-3">
              <span className="label-sm">Status</span>
              <select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                className="ms-input"
                style={filterControlStyle}
              >
                <option value="">Semua status</option>
                {shipmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatShipmentStatus(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block lg:col-span-2">
              <span className="label-sm">Tanggal</span>
              <input
                type="date"
                value={filters.date}
                onChange={(event) => setFilters({ ...filters, date: event.target.value })}
                className="ms-input"
                style={filterControlStyle}
              />
            </label>
            <label className="block lg:col-span-4">
              <span className="label-sm">Mandor / Supir</span>
              <div className="relative">
                <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  placeholder="Cari nama"
                  className="ms-input"
                  style={{ ...filterControlStyle, paddingLeft: '40px' }}
                />
              </div>
            </label>
            <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:pt-[22px]">
              <button type="submit" className="btn-primary justify-center whitespace-nowrap">
                Terapkan Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilter}
                className="btn-ghost justify-center whitespace-nowrap"
              >
                <RefreshCcw size={15} aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>
        </form>

        {showForm && (
          <div className="surface-panel bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-title text-base">
                <PackagePlus size={17} aria-hidden="true" />
                Buat Pengiriman
              </h2>
              <span className={`badge ${itemSummary.isOverLimit || itemSummary.hasDuplicates ? 'badge-red' : 'badge-green'}`}>
                {formatKg(itemSummary.totalKg)} / {MAX_SHIPMENT_KG} kg
              </span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label>
                  <span className="label-sm">Supir</span>
                  <input
                    type="text"
                    value={formData.supirUserId}
                    onChange={(event) => setFormData({ ...formData, supirUserId: event.target.value })}
                    placeholder="Supir"
                    className="ms-input"
                    required
                  />
                </label>
                <label>
                  <span className="label-sm">Tujuan</span>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(event) => setFormData({ ...formData, destination: event.target.value })}
                    placeholder="Tujuan pabrik"
                    className="ms-input"
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="label-sm">Muatan panen</span>
                <textarea
                  rows={4}
                  value={formData.items}
                  onChange={(event) => setFormData({ ...formData, items: event.target.value })}
                  placeholder="Catatan panen dan berat, satu baris per muatan"
                  className="ms-input"
                  required
                />
              </label>
              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
                <span>{itemSummary.items.length} muatan valid</span>
                <span className={itemSummary.isOverLimit || itemSummary.hasDuplicates ? 'text-red-300' : 'text-slate-300'}>
                  {itemSummary.hasDuplicates
                    ? 'Harvest ID duplikat'
                    : itemSummary.isOverLimit
                      ? 'Melebihi kapasitas truk'
                      : 'Siap disimpan'}
                </span>
              </div>
              <button
                type="submit"
                disabled={createDisabled}
                className="btn-primary w-full justify-center"
              >
                <Save size={16} aria-hidden="true" />
                {saving ? 'Menyimpan...' : 'Simpan Pengiriman'}
              </button>
            </form>
          </div>
        )}

        <section className="surface-panel bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title text-base">Operasi Status</h2>
            <p className="text-xs text-slate-500">Gunakan nomor pengiriman dari daftar di bawah.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <form onSubmit={handleStatusSubmit} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-3 flex items-center gap-2">
                <Truck size={16} aria-hidden="true" className="text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Update Supir</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_auto]">
                <input
                  type="text"
                  value={statusForm.shipmentId}
                  onChange={(event) => setStatusForm({ ...statusForm, shipmentId: event.target.value })}
                  placeholder="Nomor pengiriman"
                  className="ms-input"
                  required
                />
                <select
                  value={statusForm.status}
                  onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value as ShipmentStatus })}
                  className="ms-input"
                >
                  <option value="MENGIRIM">Dalam Perjalanan</option>
                  <option value="TIBA">Tiba di Tujuan</option>
                </select>
                <button type="submit" className="btn-secondary justify-center">
                  Simpan Status
                </button>
              </div>
            </form>

            <form onSubmit={handleAdminSubmit} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={16} aria-hidden="true" className="text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Persetujuan Admin</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_auto]">
                <input
                  type="text"
                  value={adminForm.shipmentId}
                  onChange={(event) => setAdminForm({ ...adminForm, shipmentId: event.target.value })}
                  placeholder="Nomor pengiriman"
                  className="ms-input"
                  required
                />
                <select
                  value={adminForm.status}
                  onChange={(event) => setAdminForm({ ...adminForm, status: event.target.value as AdminFormState['status'] })}
                  className="ms-input"
                >
                  <option value="ADMIN_APPROVED">Disetujui</option>
                  <option value="ADMIN_REJECTED">Ditolak Admin</option>
                  <option value="PARTIALLY_REJECTED">Perlu Koreksi</option>
                </select>
                <button type="submit" className="btn-secondary justify-center">
                  Simpan Persetujuan
                </button>
              </div>
              {adminNeedsDetail && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adminForm.kgAccepted}
                    onChange={(event) => setAdminForm({ ...adminForm, kgAccepted: event.target.value })}
                    placeholder="Kg diterima"
                    className="ms-input"
                    disabled={adminForm.status === 'ADMIN_REJECTED'}
                  />
                  <input
                    type="text"
                    value={adminForm.rejectionReason}
                    onChange={(event) => setAdminForm({ ...adminForm, rejectionReason: event.target.value })}
                    placeholder="Alasan keputusan"
                    className="ms-input"
                  />
                </div>
              )}
            </form>
          </div>
        </section>

        {loading ? (
          <div className="surface-panel bg-white p-8 text-center text-sm text-slate-500">
            <Clock3 size={20} aria-hidden="true" className="mx-auto mb-3 text-slate-500" />
            Memuat pengiriman...
          </div>
        ) : shipments.length === 0 ? (
          <div className="empty-state bg-white p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-white">Belum ada pengiriman</h3>
            <p className="text-sm text-slate-400">Buat pengiriman baru atau ubah filter.</p>
          </div>
        ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-title text-base">Daftar Pengiriman</h2>
              <p className="text-xs text-slate-500">
                Menampilkan {visibleShipments.length} dari {shipments.length} pengiriman
              </p>
            </div>

            <div className="space-y-3">
              {visibleShipments.map((shipment) => (
                <div key={shipment.id} className="surface-panel bg-white p-4">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_minmax(240px,0.9fr)] xl:items-center">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`badge ${shipmentStatusBadge[shipment.status] || 'badge-gray'}`}>
                          {formatShipmentStatus(shipment.status)}
                        </span>
                        <span className="text-xs font-medium text-slate-500">#{getShortId(shipment.id)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">Pengiriman Hasil Panen</h3>
                      <p className="mt-1 truncate text-sm text-slate-300">{shipment.destination || '-'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mandor</p>
                        <p className="mt-1 text-slate-300">
                          {getWorkerDisplay(shipment.mandorName, shipment.mandorUserId, 'Sudah diverifikasi')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supir</p>
                        <p className="mt-1 text-slate-300">
                          {getWorkerDisplay(shipment.supirName, shipment.supirUserId, 'Sudah ditugaskan')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
                        <p className="mt-1 font-semibold text-white">{formatKg(getShipmentWeight(shipment))}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dibuat</p>
                        <p className="mt-1 text-slate-300">{formatDateTime(shipment.createdAt)}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <ol className="grid grid-cols-5 gap-1" aria-label="Progres pengiriman">
                        {progressStatuses.map((status) => (
                          <li
                            key={status}
                            title={formatShipmentStatus(status)}
                            className={`h-2 rounded-full ${getProgressState(shipment.status, status)}`}
                          />
                        ))}
                      </ol>
                      {shipment.items && shipment.items.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Muatan</p>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {shipment.items.map((item) => (
                              <li
                                key={`${item.harvestId}-${item.weightKg}`}
                                className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300"
                              >
                                {formatKg(item.weightKg)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">-</p>
                      )}
                      {shipment.rejectionReason && (
                        <p className="rounded-md border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">
                          {shipment.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {shipments.length > visibleShipments.length && (
                <div className="surface-panel bg-white p-4 text-sm text-slate-500">
                  Menampilkan {visibleShipments.length} dari {shipments.length} pengiriman. Gunakan filter status untuk mempersempit daftar.
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
