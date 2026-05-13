'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { harvestService } from '@/services/harvest.service';
import { Harvest, HarvestStatus } from '@/types';

const statusOptions: HarvestStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
};

const parsePhotos = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

interface HarvestFilters {
  harvesterName: string;
  startDate: string;
  endDate: string;
}

const emptyFilters: HarvestFilters = {
  harvesterName: '',
  startDate: '',
  endDate: '',
};

const ITEMS_PER_PAGE = 10;

export default function HarvestsPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<HarvestFilters>(emptyFilters);
  const [formData, setFormData] = useState({
    plantationId: '',
    weight: '',
    news: '',
    photos: '',
  });
  const [statusForm, setStatusForm] = useState({
    id: '',
    status: 'APPROVED' as HarvestStatus,
    rejectionReason: '',
  });

  const totalPages = Math.max(1, Math.ceil(harvests.length / ITEMS_PER_PAGE));
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentHarvests = harvests.slice(indexOfFirstItem, indexOfLastItem);

  const totals = useMemo(() => {
    const totalWeight = harvests.reduce((sum, harvest) => sum + harvest.weight, 0);
    const pending = harvests.filter((harvest) => harvest.status === 'PENDING').length;
    const approved = harvests.filter((harvest) => harvest.status === 'APPROVED').length;
    const rejected = harvests.filter((harvest) => harvest.status === 'REJECTED').length;

    return {
      totalWeight,
      pending,
      approved,
      rejected,
    };
  }, [harvests]);

  const loadHarvests = useCallback(async (nextFilters: HarvestFilters = emptyFilters) => {
    try {
      setLoading(true);
      const data = await harvestService.getAll({
        harvesterName: nextFilters.harvesterName || undefined,
        startDate: nextFilters.startDate || undefined,
        endDate: nextFilters.endDate || undefined,
      });
      setHarvests(data);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch harvests');
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

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    try {
      setSaving(true);
      await harvestService.create({
        plantationId: formData.plantationId,
        weight: Number.parseFloat(formData.weight),
        news: formData.news,
        photos: parsePhotos(formData.photos),
      });
      setShowForm(false);
      setFormData({
        plantationId: '',
        weight: '',
        news: '',
        photos: '',
      });
      await loadHarvests(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create harvest');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSubmit = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    try {
      await harvestService.updateStatus({
        id: statusForm.id,
        status: statusForm.status,
        rejectionReason:
          statusForm.status === 'REJECTED' ? statusForm.rejectionReason || undefined : undefined,
      });
      setStatusForm({
        id: '',
        status: 'APPROVED',
        rejectionReason: '',
      });
      await loadHarvests(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update harvest status');
    }
  };

  return (
    <>
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Harvest Management</h1>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Log Harvest'}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Logs</p>
            <p className="text-2xl font-bold text-green-800">{harvests.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Weight</p>
            <p className="text-2xl font-bold text-green-800">{totals.totalWeight.toLocaleString('id-ID')} kg</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-800">{totals.approved}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Pending / Rejected</p>
            <p className="text-2xl font-bold text-green-800">{totals.pending} / {totals.rejected}</p>
          </div>
        </div>

        <form onSubmit={handleFilter} className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Harvest Logs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={filters.harvesterName}
              onChange={(event) => setFilters({ ...filters, harvesterName: event.target.value })}
              placeholder="Harvester name"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Apply Filter
            </button>
          </div>
        </form>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Log Harvest</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.plantationId}
                  onChange={(event) => setFormData({ ...formData, plantationId: event.target.value })}
                  placeholder="Plantation UUID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(event) => setFormData({ ...formData, weight: event.target.value })}
                  placeholder="Weight kg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <textarea
                rows={3}
                value={formData.news}
                onChange={(event) => setFormData({ ...formData, news: event.target.value })}
                placeholder="Harvest news"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <textarea
                rows={3}
                value={formData.photos}
                onChange={(event) => setFormData({ ...formData, photos: event.target.value })}
                placeholder="Photo URLs, one per line"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving Harvest...' : 'Save Harvest'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Update Harvest Status</h2>
          <form onSubmit={handleStatusSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={statusForm.id}
              onChange={(event) => setStatusForm({ ...statusForm, id: event.target.value })}
              placeholder="Harvest log UUID"
              className="px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
            <select
              value={statusForm.status}
              onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value as HarvestStatus })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={statusForm.rejectionReason}
              onChange={(event) => setStatusForm({ ...statusForm, rejectionReason: event.target.value })}
              placeholder="Rejection reason"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-semibold"
            >
              Update Status
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading harvest records...</div>
        ) : harvests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Harvest Data</h3>
            <p className="text-gray-600">Create a log or adjust the filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentHarvests.map((harvest) => (
                <div key={harvest.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between gap-3 items-start mb-3">
                    <h3 className="text-lg font-semibold text-green-800">Harvest #{String(harvest.id).slice(0, 8)}</h3>
                    <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold">
                      {harvest.status || 'PENDING'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium">Plantation:</span> {harvest.plantationId}</p>
                    <p><span className="font-medium">Harvester:</span> {harvest.harvesterName || harvest.harvesterId || '-'}</p>
                    <p><span className="font-medium">Foreman:</span> {harvest.foremanId || '-'}</p>
                    <p><span className="font-medium">Weight:</span> {harvest.weight} kg</p>
                    <p><span className="font-medium">Date:</span> {formatDateTime(harvest.harvestDate)}</p>
                    {harvest.news && <p><span className="font-medium">News:</span> {harvest.news}</p>}
                    {harvest.rejectionReason && (
                      <p><span className="font-medium">Rejection:</span> {harvest.rejectionReason}</p>
                    )}
                    {harvest.photos && harvest.photos.length > 0 && (
                      <p><span className="font-medium">Photos:</span> {harvest.photos.length} attached</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {harvests.length > ITEMS_PER_PAGE && (
              <div className="mt-10 flex flex-col items-center">
                <span className="text-sm text-gray-700 mb-4">
                  Showing <span className="font-semibold text-green-700">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-green-700">{Math.min(indexOfLastItem, harvests.length)}</span> of <span className="font-semibold">{harvests.length}</span> entries
                </span>
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      type="button"
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
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
    </>
  );
}
