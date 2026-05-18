'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { shipmentService } from '@/services/shipment.service';
import { Shipment, ShipmentStatus } from '@/types';

const shipmentStatuses: ShipmentStatus[] = [
  'MEMUAT',
  'MENGIRIM',
  'TIBA',
  'ADMIN_APPROVED',
  'PARTIALLY_REJECTED',
];

const shipmentStatusLabel: Partial<Record<ShipmentStatus, string>> = {
  MEMUAT: 'Memuat',
  MENGIRIM: 'Dalam Perjalanan',
  TIBA: 'Tiba',
  ADMIN_APPROVED: 'Disetujui',
  PARTIALLY_REJECTED: 'Perlu Koreksi',
};

const formatShipmentStatus = (status: ShipmentStatus) => shipmentStatusLabel[status] || status;

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
};

const parseItems = (value: string) =>
  value
    .split('\n')
    .map((line) => {
      const [harvestId, weightKg] = line.split(',').map((part) => part.trim());
      return {
        harvestId,
        weightKg: Number.parseFloat(weightKg),
      };
    })
    .filter((item) => item.harvestId && Number.isFinite(item.weightKg));

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    supirUserId: '',
    destination: '',
    items: '',
  });
  const [statusForm, setStatusForm] = useState({
    shipmentId: '',
    status: 'MENGIRIM' as ShipmentStatus,
  });
  const [adminForm, setAdminForm] = useState({
    shipmentId: '',
    status: 'ADMIN_APPROVED' as ShipmentStatus,
  });

  const loadShipments = useCallback(async (status = '') => {
    try {
      setLoading(true);
      const data = status ? await shipmentService.getByStatus(status) : await shipmentService.getAll();
      setShipments(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengiriman');
    } finally {
      setLoading(false);
    }
  }, []);

  const totals = useMemo(() => {
    const totalKg = shipments.reduce((sum, shipment) => sum + (shipment.totalKg ?? shipment.weight ?? 0), 0);
    const active = shipments.filter((shipment) => shipment.status === 'MEMUAT' || shipment.status === 'MENGIRIM').length;

    return {
      totalKg,
      active,
      completed: shipments.filter((shipment) => shipment.status === 'TIBA').length,
    };
  }, [shipments]);
  const visibleShipments = useMemo(() => shipments.slice(0, 24), [shipments]);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  const handleFilter = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    await loadShipments(statusFilter);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    try {
      setSaving(true);
      const items = parseItems(formData.items);

      await shipmentService.create({
        supirUserId: formData.supirUserId,
        destination: formData.destination,
        items,
        weight: items.reduce((sum, item) => sum + item.weightKg, 0),
      });
      setShowForm(false);
      setFormData({
        supirUserId: '',
        destination: '',
        items: '',
      });
      await loadShipments(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat pengiriman');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSubmit = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    try {
      await shipmentService.updateStatus(statusForm.shipmentId, {
        status: statusForm.status,
      });
      setStatusForm({
        shipmentId: '',
        status: 'MENGIRIM',
      });
      await loadShipments(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui pengiriman');
    }
  };

  const handleAdminSubmit = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    try {
      await shipmentService.approveByAdmin(adminForm.shipmentId, adminForm.status);
      setAdminForm({
        shipmentId: '',
        status: 'ADMIN_APPROVED',
      });
      await loadShipments(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan persetujuan');
    }
  };

  return (
    <div className="page-shell space-y-6 animate-fade-in">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Kebun ke Pabrik</p>
          <h1 className="text-2xl font-bold text-white">Pengiriman TBS</h1>
          <p className="text-sm text-slate-500 mt-1">Pantau muatan, tujuan, dan progres pengiriman dari supir.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Batal' : '+ Buat Pengiriman'}
        </button>
      </header>

      <main className="space-y-6">
        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metric-card">
            <p className="text-sm text-slate-400">Pengiriman</p>
            <p className="text-2xl font-bold text-white">{shipments.length}</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-slate-400">Berat Total</p>
            <p className="text-2xl font-bold text-white">{totals.totalKg.toLocaleString('id-ID')} kg</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-slate-400">Berjalan</p>
            <p className="text-2xl font-bold text-amber-300">{totals.active}</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-slate-400">Tiba</p>
            <p className="text-2xl font-bold text-cyan-300">{totals.completed}</p>
          </div>
        </div>

        <form onSubmit={handleFilter} className="surface-panel bg-white p-5">
          <h2 className="section-title mb-4">Filter Pengiriman</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="ms-input"
            >
              <option value="">Semua status</option>
              {shipmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatShipmentStatus(status)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-primary justify-center"
            >
              Terapkan Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('');
                void loadShipments('');
              }}
              className="btn-ghost justify-center"
            >
              Reset
            </button>
          </div>
        </form>

        {showForm && (
          <div className="surface-panel bg-white p-5">
            <h2 className="section-title mb-4">Buat Pengiriman</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.supirUserId}
                  onChange={(event) => setFormData({ ...formData, supirUserId: event.target.value })}
                  placeholder="Supir"
                  className="ms-input"
                  required
                />
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(event) => setFormData({ ...formData, destination: event.target.value })}
                  placeholder="Tujuan pabrik"
                  className="ms-input"
                  required
                />
              </div>
              <textarea
                rows={4}
                value={formData.items}
                onChange={(event) => setFormData({ ...formData, items: event.target.value })}
                placeholder="Catatan panen dan berat, satu baris per muatan"
                className="ms-input"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full justify-center py-3"
              >
                {saving ? 'Menyimpan...' : 'Simpan Pengiriman'}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-panel bg-white p-5">
            <h2 className="section-title mb-4">Update Supir</h2>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
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
                <option value="TIBA">Tiba</option>
              </select>
              <button
                type="submit"
                className="btn-secondary w-full justify-center py-3"
              >
                Simpan Status
              </button>
            </form>
          </div>

          <div className="surface-panel bg-white p-5">
            <h2 className="section-title mb-4">Persetujuan Admin</h2>
            <form onSubmit={handleAdminSubmit} className="space-y-4">
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
                onChange={(event) => setAdminForm({ ...adminForm, status: event.target.value as ShipmentStatus })}
                className="ms-input"
              >
                <option value="ADMIN_APPROVED">Disetujui</option>
                <option value="PARTIALLY_REJECTED">Perlu Koreksi</option>
              </select>
              <button
                type="submit"
                className="btn-secondary w-full justify-center py-3"
              >
                Simpan Persetujuan
              </button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Memuat pengiriman...</div>
        ) : shipments.length === 0 ? (
          <div className="empty-state bg-white p-12 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Belum ada pengiriman</h3>
            <p className="text-slate-400">Buat pengiriman baru atau ubah filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleShipments.map((shipment) => (
              <div key={shipment.id} className="surface-panel bg-white p-5">
                <div className="flex justify-between gap-3 items-start mb-3">
                  <h3 className="text-lg font-semibold text-white">Pengiriman TBS</h3>
                  <span className="badge badge-blue">
                    {formatShipmentStatus(shipment.status)}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-slate-400">
                  <p><span className="font-medium text-slate-300">Tujuan:</span> {shipment.destination}</p>
                  <p><span className="font-medium text-slate-300">Mandor:</span> {shipment.mandorUserId ? 'Sudah diverifikasi' : '-'}</p>
                  <p><span className="font-medium text-slate-300">Supir:</span> {shipment.supirUserId ? 'Sudah ditugaskan' : '-'}</p>
                  <p><span className="font-medium text-slate-300">Total:</span> {shipment.totalKg ?? shipment.weight ?? 0} kg</p>
                  <p><span className="font-medium text-slate-300">Dibuat:</span> {formatDateTime(shipment.createdAt)}</p>
                  {shipment.items && shipment.items.length > 0 && (
                    <div>
                      <p className="font-medium text-slate-300">Muatan</p>
                      <ul className="mt-1 space-y-1">
                        {shipment.items.map((item) => (
                          <li key={`${item.harvestId}-${item.weightKg}`}>
                            {item.weightKg} kg
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {shipments.length > visibleShipments.length && (
              <div className="surface-panel p-5 text-sm text-slate-500">
                Menampilkan {visibleShipments.length} dari {shipments.length} pengiriman. Gunakan filter status untuk mempersempit daftar.
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
