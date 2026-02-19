'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { plantationService } from '@/services/plantation.service';
import { authService } from '@/services/auth.service';
import { Plantation } from '@/types';

export default function PlantationsPage() {
  const router = useRouter();
  const [plantations, setPlantations] = useState<Plantation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    area: '',
    description: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadPlantations();
  }, [router]);

  const loadPlantations = async () => {
    try {
      setLoading(true);
      const data = await plantationService.getAll();
      setPlantations(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plantations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userInfo = authService.getUserInfo();
      await plantationService.create({
        name: formData.name,
        location: formData.location,
        area: parseFloat(formData.area),
        description: formData.description,
        ownerId: userInfo?.id ? parseInt(userInfo.id) : undefined,
      });
      setShowForm(false);
      setFormData({ name: '', location: '', area: '', description: '' });
      loadPlantations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plantation');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this plantation?')) return;
    
    try {
      await plantationService.delete(id);
      loadPlantations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plantation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Plantations Management</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Plantation'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Plantation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plantation Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area (hectares)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Create Plantation
              </button>
            </form>
          </div>
        )}

        {/* Plantations List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading plantations...</div>
          </div>
        ) : plantations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">🌴</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Plantations Yet</h3>
            <p className="text-gray-600">Click "Add Plantation" to create your first one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plantations.map((plantation) => (
              <div key={plantation.id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">{plantation.name}</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><span className="font-medium">📍 Location:</span> {plantation.location}</p>
                  <p><span className="font-medium">📏 Area:</span> {plantation.area} hectares</p>
                  {plantation.description && (
                    <p><span className="font-medium">📝 Description:</span> {plantation.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(plantation.id)}
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
