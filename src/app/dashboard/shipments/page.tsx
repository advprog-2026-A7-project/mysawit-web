'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { shipmentService } from '@/services/shipment.service';
import { Shipment, ShipmentStatus } from '@/types';

const shipmentStatuses: ShipmentStatus[] = [
  'MEMUAT',
  'MENGIRIM',
  'TIBA',
  'ADMIN_APPROVED',
  'PARTIALLY_REJECTED',
];

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
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
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
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
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
      setError(err instanceof Error ? err.message : 'Failed to update shipment status');
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
      setError(err instanceof Error ? err.message : 'Failed to submit admin approval');
    }
  };

  return (
    <>
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Shipment Management</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Create Shipment'}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Shipments</p>
            <p className="text-2xl font-bold text-green-800">{shipments.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Weight</p>
            <p className="text-2xl font-bold text-green-800">{totals.totalKg.toLocaleString('id-ID')} kg</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-800">{totals.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Arrived</p>
            <p className="text-2xl font-bold text-green-800">{totals.completed}</p>
          </div>
        </div>

        <form onSubmit={handleFilter} className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Shipments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Statuses</option>
              {shipmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('');
                void loadShipments('');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Shipment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.supirUserId}
                  onChange={(event) => setFormData({ ...formData, supirUserId: event.target.value })}
                  placeholder="Supir UUID"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(event) => setFormData({ ...formData, destination: event.target.value })}
                  placeholder="Destination"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <textarea
                rows={4}
                value={formData.items}
                onChange={(event) => setFormData({ ...formData, items: event.target.value })}
                placeholder="Harvest UUID, weight kg per line"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating Shipment...' : 'Save Shipment'}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Driver Status Update</h2>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <input
                type="text"
                value={statusForm.shipmentId}
                onChange={(event) => setStatusForm({ ...statusForm, shipmentId: event.target.value })}
                placeholder="Shipment UUID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <select
                value={statusForm.status}
                onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value as ShipmentStatus })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="MENGIRIM">MENGIRIM</option>
                <option value="TIBA">TIBA</option>
              </select>
              <button
                type="submit"
                className="w-full border border-green-600 text-green-700 py-2 rounded-lg hover:bg-green-50 transition-colors font-semibold"
              >
                Update Status
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Admin Approval</h2>
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <input
                type="text"
                value={adminForm.shipmentId}
                onChange={(event) => setAdminForm({ ...adminForm, shipmentId: event.target.value })}
                placeholder="Shipment UUID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <select
                value={adminForm.status}
                onChange={(event) => setAdminForm({ ...adminForm, status: event.target.value as ShipmentStatus })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="ADMIN_APPROVED">ADMIN_APPROVED</option>
                <option value="PARTIALLY_REJECTED">PARTIALLY_REJECTED</option>
              </select>
              <button
                type="submit"
                className="w-full border border-green-600 text-green-700 py-2 rounded-lg hover:bg-green-50 transition-colors font-semibold"
              >
                Submit Approval
              </button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading shipments...</div>
        ) : shipments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Shipment Data</h3>
            <p className="text-gray-600">Create a shipment or adjust the filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between gap-3 items-start mb-3">
                  <h3 className="text-lg font-semibold text-green-800">Shipment #{String(shipment.id).slice(0, 8)}</h3>
                  <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold">
                    {shipment.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Destination:</span> {shipment.destination}</p>
                  <p><span className="font-medium">Mandor:</span> {shipment.mandorUserId || '-'}</p>
                  <p><span className="font-medium">Supir:</span> {shipment.supirUserId || '-'}</p>
                  <p><span className="font-medium">Total:</span> {shipment.totalKg ?? shipment.weight ?? 0} kg</p>
                  <p><span className="font-medium">Created:</span> {formatDateTime(shipment.createdAt)}</p>
                  {shipment.items && shipment.items.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-700">Items</p>
                      <ul className="mt-1 space-y-1">
                        {shipment.items.map((item) => (
                          <li key={`${item.harvestId}-${item.weightKg}`}>
                            {item.harvestId}: {item.weightKg} kg
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
