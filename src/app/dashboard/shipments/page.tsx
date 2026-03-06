'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { shipmentService } from '@/services/shipment.service';
import { authService } from '@/services/auth.service';
import { Shipment } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ShipmentsPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    harvestId: '',
    destination: '',
    weight: '',
    status: 'PENDING',
    shipperName: '',
    vehicleNumber: '',
    shipmentDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadShipments();
  }, [router]);

  const loadShipments = async (status?: string) => {
    try {
      setLoading(true);
      const data = status
        ? await shipmentService.getByStatus(status)
        : await shipmentService.getAll();
      setShipments(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    loadShipments(status || undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await shipmentService.create({
        harvestId: parseInt(formData.harvestId),
        destination: formData.destination,
        weight: parseFloat(formData.weight),
        status: formData.status,
        shipperName: formData.shipperName || undefined,
        vehicleNumber: formData.vehicleNumber || undefined,
        shipmentDate: formData.shipmentDate || undefined,
        notes: formData.notes || undefined,
      });
      setShowForm(false);
      setFormData({ harvestId: '', destination: '', weight: '', status: 'PENDING', shipperName: '', vehicleNumber: '', shipmentDate: '', notes: '' });
      loadShipments(filterStatus || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this shipment?')) return;
    try {
      await shipmentService.delete(id);
      loadShipments(filterStatus || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shipment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Shipments Management</h1>
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

        {/* Filter bar */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['', 'PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-green-500'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Shipment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harvest ID</label>
                  <input
                    type="number"
                    value={formData.harvestId}
                    onChange={(e) => setFormData({ ...formData, harvestId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipper Name (optional)</label>
                  <input
                    type="text"
                    value={formData.shipperName}
                    onChange={(e) => setFormData({ ...formData, shipperName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number (optional)</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipment Date (optional)</label>
                  <input
                    type="date"
                    value={formData.shipmentDate}
                    onChange={(e) => setFormData({ ...formData, shipmentDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Create Shipment
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading shipments...</div>
        ) : shipments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">🚚</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Shipments Found</h3>
            <p className="text-gray-600">Click &quot;Add Shipment&quot; to create a new one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-green-800">Shipment #{shipment.id}</h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[shipment.status] || 'bg-gray-100 text-gray-800'}`}>
                    {shipment.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><span className="font-medium">🌾 Harvest ID:</span> {shipment.harvestId}</p>
                  <p><span className="font-medium">📍 Destination:</span> {shipment.destination}</p>
                  <p><span className="font-medium">⚖️ Weight:</span> {shipment.weight} kg</p>
                  {shipment.shipperName && (
                    <p><span className="font-medium">👤 Shipper:</span> {shipment.shipperName}</p>
                  )}
                  {shipment.vehicleNumber && (
                    <p><span className="font-medium">🚛 Vehicle:</span> {shipment.vehicleNumber}</p>
                  )}
                  {shipment.shipmentDate && (
                    <p><span className="font-medium">📅 Shipped:</span> {new Date(shipment.shipmentDate).toLocaleDateString()}</p>
                  )}
                  {shipment.deliveryDate && (
                    <p><span className="font-medium">✅ Delivered:</span> {new Date(shipment.deliveryDate).toLocaleDateString()}</p>
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
