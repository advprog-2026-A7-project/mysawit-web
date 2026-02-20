'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { shipmentService } from '@/services/shipment.service';
import { Shipment } from '@/types';

const toLocalDateTimeInput = (value: Date): string => {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
};

export default function ShipmentsPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    harvestId: '',
    destination: '',
    weight: '',
    status: 'PENDING',
    shipperName: '',
    vehicleNumber: '',
    shipmentDate: toLocalDateTimeInput(new Date()),
    deliveryDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    void loadShipments();
  }, [router]);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const data = await shipmentService.getAll();
      setShipments(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await shipmentService.create({
        harvestId: Number.parseInt(formData.harvestId, 10),
        destination: formData.destination,
        weight: Number.parseFloat(formData.weight),
        status: formData.status,
        shipperName: formData.shipperName || undefined,
        vehicleNumber: formData.vehicleNumber || undefined,
        shipmentDate: formData.shipmentDate || undefined,
        deliveryDate: formData.deliveryDate || undefined,
        notes: formData.notes || undefined,
      });

      setShowForm(false);
      setFormData({
        harvestId: '',
        destination: '',
        weight: '',
        status: 'PENDING',
        shipperName: '',
        vehicleNumber: '',
        shipmentDate: toLocalDateTimeInput(new Date()),
        deliveryDate: '',
        notes: '',
      });
      await loadShipments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this shipment record?')) return;

    try {
      await shipmentService.delete(id);
      await loadShipments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shipment');
    }
  };

  if (!authService.isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Shipment Module (Dummy)</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Shipment'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Shipment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harvest ID</label>
                  <input
                    type="number"
                    value={formData.harvestId}
                    onChange={(event) => setFormData({ ...formData, harvestId: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(event) => setFormData({ ...formData, destination: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(event) => setFormData({ ...formData, weight: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipper Name</label>
                  <input
                    type="text"
                    value={formData.shipperName}
                    onChange={(event) => setFormData({ ...formData, shipperName: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(event) => setFormData({ ...formData, vehicleNumber: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipment Date</label>
                  <input
                    type="datetime-local"
                    value={formData.shipmentDate}
                    onChange={(event) => setFormData({ ...formData, shipmentDate: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
                  <input
                    type="datetime-local"
                    value={formData.deliveryDate}
                    onChange={(event) => setFormData({ ...formData, deliveryDate: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Save Shipment
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading shipment records...</div>
        ) : shipments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">🚚</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Shipment Data</h3>
            <p className="text-gray-600">Create one from the form above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Shipment #{shipment.id}</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>
                    <span className="font-medium">Harvest:</span> #{shipment.harvestId}
                  </p>
                  <p>
                    <span className="font-medium">Destination:</span> {shipment.destination}
                  </p>
                  <p>
                    <span className="font-medium">Weight:</span> {shipment.weight} kg
                  </p>
                  <p>
                    <span className="font-medium">Status:</span> {shipment.status}
                  </p>
                  <p>
                    <span className="font-medium">Shipment Date:</span> {formatDateTime(shipment.shipmentDate)}
                  </p>
                  {shipment.notes && (
                    <p>
                      <span className="font-medium">Notes:</span> {shipment.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(shipment.id)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
