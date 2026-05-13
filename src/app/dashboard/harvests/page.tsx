'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    plantationId: '',
    harvestDate: '',
    weight: '',
    quality: 'STANDARD',
    harvesterId: '',
    notes: '',
  });

  const loadHarvests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Mengambil data asli dari service
      const data = await harvestService.getAll();
      setHarvests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch harvests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Proteksi Auth diaktifkan kembali
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadHarvests();
  }, [router, loadHarvests]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHarvests = harvests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(harvests.length / itemsPerPage);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    try {
      await harvestService.create({
        plantationId: parseInt(formData.plantationId) || 0,
        harvestDate: formData.harvestDate,
        weight: parseFloat(formData.weight) || 0,
        quality: formData.quality as "PREMIUM" | "STANDARD" | "LOW",
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
                onClick={() => {
                  setShowForm(!showForm);
                  setCurrentPage(1);
                }}
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
              <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-green-500">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Harvest</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plantation ID</label>
                      <input
                          type="number"
                          value={formData.plantationId}
                          onChange={(e) => setFormData({ ...formData, plantationId: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                          required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Harvest Date</label>
                      <input
                          type="date"
                          value={formData.harvestDate}
                          onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                          required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                      <select
                          value={formData.quality}
                          onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                      <input
                          type="text"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>
                  <button
                      type="submit"
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm"
                  >
                    Create Harvest
                  </button>
                </form>
              </div>
          )}

          {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-600">Loading harvests...</p>
              </div>
          ) : harvests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-5xl mb-4">🌾</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Harvests Yet</h3>
                <p className="text-gray-600">Click &quot;Add Harvest&quot; to record the first one</p>
              </div>
          ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentHarvests.map((harvest) => (
                      <div key={harvest.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-green-800">Harvest #{harvest.id}</h3>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${qualityColor(harvest.quality)}`}>
                      {harvest.quality}
                    </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p><span className="font-medium text-gray-800 text-xs uppercase tracking-wider">🌴 Plantation</span><br /> {harvest.plantationId}</p>
                          <p><span className="font-medium text-gray-800 text-xs uppercase tracking-wider">📅 Date</span><br /> {new Date(harvest.harvestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p><span className="font-medium text-gray-800 text-xs uppercase tracking-wider">⚖️ Weight</span><br /> {harvest.weight} kg</p>
                          {harvest.harvesterId && (
                              <p><span className="font-medium text-gray-800 text-xs uppercase tracking-wider">👤 Harvester</span><br /> ID: {harvest.harvesterId}</p>
                          )}
                          {harvest.notes && (
                              <p><span className="font-medium text-gray-800 text-xs uppercase tracking-wider">📝 Notes</span><br /> {harvest.notes}</p>
                          )}
                        </div>
                        <button
                            onClick={() => handleDelete(harvest.id)}
                            className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                          Delete Record
                        </button>
                      </div>
                  ))}
                </div>

                {harvests.length > itemsPerPage && (
                    <div className="mt-10 flex flex-col items-center">
                <span className="text-sm text-gray-700 mb-4">
                  Showing <span className="font-semibold text-green-700">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-green-700">{Math.min(indexOfLastItem, harvests.length)}</span> of <span className="font-semibold">{harvests.length}</span> entries
                </span>
                      <div className="inline-flex rounded-md shadow-sm">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>

                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`px-4 py-2 text-sm font-medium border-t border-b border-gray-300 ${
                                    currentPage === i + 1
                                        ? 'bg-green-600 text-white border-green-600 z-10'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              {i + 1}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
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