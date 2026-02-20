'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { harvestService } from '@/services/harvest.service';
import { Harvest } from '@/types';

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

export default function HarvestsPage() {
  const router = useRouter();
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    plantationId: '',
    harvestDate: toLocalDateTimeInput(new Date()),
    weight: '',
    quality: 'STANDARD',
    notes: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    void loadHarvests();
  }, [router]);

  const loadHarvests = async () => {
    try {
      setLoading(true);
      const data = await harvestService.getAll();
      setHarvests(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load harvests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const userInfo = authService.getUserInfo();
      const parsedHarvesterId = userInfo?.id ? Number.parseInt(userInfo.id, 10) : undefined;

      await harvestService.create({
        plantationId: Number.parseInt(formData.plantationId, 10),
        harvestDate: formData.harvestDate,
        weight: Number.parseFloat(formData.weight),
        quality: formData.quality,
        harvesterId: Number.isNaN(parsedHarvesterId ?? NaN) ? undefined : parsedHarvesterId,
        notes: formData.notes || undefined,
      });

      setShowForm(false);
      setFormData({
        plantationId: '',
        harvestDate: toLocalDateTimeInput(new Date()),
        weight: '',
        quality: 'STANDARD',
        notes: '',
      });
      await loadHarvests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create harvest');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this harvest record?')) return;

    try {
      await harvestService.delete(id);
      await loadHarvests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete harvest');
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
            <h1 className="text-2xl font-bold text-green-800">Harvest Module (Dummy)</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Harvest'}
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Harvest</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plantation ID</label>
                  <input
                    type="number"
                    value={formData.plantationId}
                    onChange={(event) => setFormData({ ...formData, plantationId: event.target.value })}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harvest Date</label>
                  <input
                    type="datetime-local"
                    value={formData.harvestDate}
                    onChange={(event) => setFormData({ ...formData, harvestDate: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                  <select
                    value={formData.quality}
                    onChange={(event) => setFormData({ ...formData, quality: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="LOW">LOW</option>
                  </select>
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
                Save Harvest
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading harvest records...</div>
        ) : harvests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">🌾</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Harvest Data</h3>
            <p className="text-gray-600">Create one from the form above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {harvests.map((harvest) => (
              <div key={harvest.id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Harvest #{harvest.id}</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>
                    <span className="font-medium">Plantation:</span> #{harvest.plantationId}
                  </p>
                  <p>
                    <span className="font-medium">Weight:</span> {harvest.weight} kg
                  </p>
                  <p>
                    <span className="font-medium">Quality:</span> {harvest.quality}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span> {formatDateTime(harvest.harvestDate)}
                  </p>
                  {harvest.notes && (
                    <p>
                      <span className="font-medium">Notes:</span> {harvest.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(harvest.id)}
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
