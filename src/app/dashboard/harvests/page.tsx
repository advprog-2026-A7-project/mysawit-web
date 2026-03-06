'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { harvestService } from '@/services/harvest.service';
import { authService } from '@/services/auth.service';
import { Harvest } from '@/types';

export default function HarvestsPage() {
  const router = useRouter();
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    plantationId: '',
    harvestDate: '',
    weight: '',
    quality: 'STANDARD',
    harvesterId: '',
    notes: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadHarvests();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await harvestService.create({
        plantationId: parseInt(formData.plantationId),
        harvestDate: formData.harvestDate,
        weight: parseFloat(formData.weight),
        quality: formData.quality,
        harvesterId: formData.harvesterId ? parseInt(formData.harvesterId) : undefined,
        notes: formData.notes || undefined,
      });
      setShowForm(false);
      setFormData({ plantationId: '', harvestDate: '', weight: '', quality: 'STANDARD', harvesterId: '', notes: '' });
      loadHarvests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create harvest');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this harvest?')) return;
    try {
      await harvestService.delete(id);
      loadHarvests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete harvest');
    }
  };

  const qualityColor = (quality: string) => {
    if (quality === 'PREMIUM') return 'bg-green-100 text-green-800';
    if (quality === 'STANDARD') return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Harvests Management</h1>
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Harvest</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plantation ID</label>
                  <input
                    type="number"
                    value={formData.plantationId}
                    onChange={(e) => setFormData({ ...formData, plantationId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harvest Date</label>
                  <input
                    type="date"
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                  <select
                    value={formData.quality}
                    onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harvester ID (optional)</label>
                  <input
                    type="number"
                    value={formData.harvesterId}
                    onChange={(e) => setFormData({ ...formData, harvesterId: e.target.value })}
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
                Create Harvest
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading harvests...</div>
        ) : harvests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">🌾</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Harvests Yet</h3>
            <p className="text-gray-600">Click &quot;Add Harvest&quot; to record the first one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {harvests.map((harvest) => (
              <div key={harvest.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-green-800">Harvest #{harvest.id}</h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${qualityColor(harvest.quality)}`}>
                    {harvest.quality}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><span className="font-medium">🌴 Plantation ID:</span> {harvest.plantationId}</p>
                  <p><span className="font-medium">📅 Date:</span> {new Date(harvest.harvestDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">⚖️ Weight:</span> {harvest.weight} kg</p>
                  {harvest.harvesterId && (
                    <p><span className="font-medium">👤 Harvester ID:</span> {harvest.harvesterId}</p>
                  )}
                  {harvest.notes && (
                    <p><span className="font-medium">📝 Notes:</span> {harvest.notes}</p>
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
