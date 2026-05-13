'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { plantationService } from '@/services/plantation.service';
import { useAuth } from '@/contexts/auth-context';
import { Coordinate, EntityId, Plantation, PlantationRequest } from '@/types';

interface CoordinateForm {
  latitude: string;
  longitude: string;
}

interface PlantationFormState {
  id: string;
  name: string;
  location: string;
  area: string;
  ownerId: string;
  description: string;
  plantDate: string;
  coordinates: CoordinateForm[];
}

const defaultCoordinates: CoordinateForm[] = [
  { latitude: '0', longitude: '0' },
  { latitude: '0', longitude: '1' },
  { latitude: '1', longitude: '1' },
  { latitude: '1', longitude: '0' },
];

const emptyForm: PlantationFormState = {
  id: '',
  name: '',
  location: '',
  area: '',
  ownerId: '',
  description: '',
  plantDate: '',
  coordinates: defaultCoordinates,
};

const formatDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
};

const toDateTimeInput = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toCoordinateForm = (coordinates?: Coordinate[]): CoordinateForm[] => {
  if (!coordinates || coordinates.length !== 4) return defaultCoordinates;

  return coordinates.map((coordinate) => ({
    latitude: String(coordinate.latitude),
    longitude: String(coordinate.longitude),
  }));
};

const parseCoordinates = (coordinates: CoordinateForm[]): Coordinate[] =>
  coordinates.map((coordinate) => ({
    latitude: Number.parseFloat(coordinate.latitude),
    longitude: Number.parseFloat(coordinate.longitude),
  }));

const buildPlantationRequest = (formData: PlantationFormState): PlantationRequest => ({
  name: formData.name,
  location: formData.location,
  area: Number.parseFloat(formData.area),
  ownerId: formData.ownerId || undefined,
  description: formData.description || undefined,
  plantDate: formData.plantDate || undefined,
  coordinates: parseCoordinates(formData.coordinates),
});

const isValidCoordinateSet = (coordinates: Coordinate[]): boolean =>
  coordinates.length === 4 &&
  coordinates.every((coordinate) =>
    Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude)
  );

export default function PlantationsPage() {
  const { user } = useAuth();
  const [plantations, setPlantations] = useState<Plantation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [formData, setFormData] = useState<PlantationFormState>(emptyForm);
  const [assignment, setAssignment] = useState({
    plantationId: '',
    mandorId: '',
  });
  const [transfer, setTransfer] = useState({
    mandorId: '',
    fromPlantationId: '',
    toPlantationId: '',
  });

  const summary = useMemo(() => {
    const totalArea = plantations.reduce((sum, plantation) => sum + plantation.area, 0);
    const assignedMandor = plantations.filter((plantation) => plantation.mandorId).length;

    return {
      totalArea,
      assignedMandor,
    };
  }, [plantations]);

  const loadPlantations = useCallback(async (ownerId = '') => {
    try {
      setLoading(true);
      const data = ownerId
        ? await plantationService.getByOwner(ownerId)
        : await plantationService.getAll();
      setPlantations(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plantations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlantations();
  }, [loadPlantations]);

  const resetForm = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setFormData({
      ...emptyForm,
      ownerId: user?.id || '',
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const openEditForm = (plantation: Plantation) => {
    setFormData({
      id: String(plantation.id),
      name: plantation.name,
      location: plantation.location,
      area: String(plantation.area),
      ownerId: plantation.ownerId ? String(plantation.ownerId) : '',
      description: plantation.description || '',
      plantDate: toDateTimeInput(plantation.plantDate),
      coordinates: toCoordinateForm(plantation.coordinates),
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const updateCoordinate = (index: number, field: keyof CoordinateForm, value: string) => {
    setFormData((current) => ({
      ...current,
      coordinates: current.coordinates.map((coordinate, coordinateIndex) =>
        coordinateIndex === index ? { ...coordinate, [field]: value } : coordinate
      ),
    }));
  };

  const handleFilterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadPlantations(ownerFilter);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const request = buildPlantationRequest(formData);

    if (!isValidCoordinateSet(request.coordinates)) {
      setError('Exactly 4 valid coordinates are required');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await plantationService.update(formData.id, request);
      } else {
        await plantationService.create(request);
      }
      resetForm();
      await loadPlantations(ownerFilter);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? 'Failed to update plantation'
            : 'Failed to create plantation'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: EntityId) => {
    if (!confirm('Are you sure you want to delete this plantation?')) return;

    try {
      await plantationService.delete(id);
      await loadPlantations(ownerFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plantation');
    }
  };

  const handleAssignMandor = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await plantationService.assignMandor(assignment.plantationId, {
        mandorId: assignment.mandorId,
      });
      setAssignment({ plantationId: '', mandorId: '' });
      await loadPlantations(ownerFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign mandor');
    }
  };

  const handleTransferMandor = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await plantationService.transferMandor({
        mandorId: transfer.mandorId,
        fromPlantationId: transfer.fromPlantationId,
        toPlantationId: transfer.toPlantationId,
      });
      setTransfer({ mandorId: '', fromPlantationId: '', toPlantationId: '' });
      await loadPlantations(ownerFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer mandor');
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
            <h1 className="text-2xl font-bold text-green-800">Plantations Management</h1>
          </div>
          <button
            onClick={showForm ? resetForm : openCreateForm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Plantation'}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Plantations</p>
            <p className="text-2xl font-bold text-green-800">{plantations.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Area</p>
            <p className="text-2xl font-bold text-green-800">
              {summary.totalArea.toLocaleString('id-ID')} ha
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Assigned Mandor</p>
            <p className="text-2xl font-bold text-green-800">{summary.assignedMandor}</p>
          </div>
        </div>

        <form onSubmit={handleFilterSubmit} className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Plantations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              placeholder="Owner ID"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setOwnerFilter('');
                void loadPlantations('');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {isEditing ? 'Update Plantation' : 'Add New Plantation'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="plantation-name">
                    Plantation Name
                  </label>
                  <input
                    id="plantation-name"
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="plantation-location">
                    Location
                  </label>
                  <input
                    id="plantation-location"
                    type="text"
                    value={formData.location}
                    onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="plantation-area">
                    Area (hectares)
                  </label>
                  <input
                    id="plantation-area"
                    type="number"
                    step="0.01"
                    value={formData.area}
                    onChange={(event) => setFormData({ ...formData, area: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="plantation-owner">
                    Owner ID
                  </label>
                  <input
                    id="plantation-owner"
                    type="text"
                    value={formData.ownerId}
                    onChange={(event) => setFormData({ ...formData, ownerId: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="plantation-date">
                    Plant Date
                  </label>
                  <input
                    id="plantation-date"
                    type="datetime-local"
                    value={formData.plantDate}
                    onChange={(event) => setFormData({ ...formData, plantDate: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="plantation-description">
                  Description
                </label>
                <textarea
                  id="plantation-description"
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Square Coordinates</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {formData.coordinates.map((coordinate, index) => (
                    <div key={index} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Point {index + 1}</p>
                      <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`latitude-${index}`}>
                        Latitude {index + 1}
                      </label>
                      <input
                        id={`latitude-${index}`}
                        type="number"
                        step="0.000001"
                        value={coordinate.latitude}
                        onChange={(event) => updateCoordinate(index, 'latitude', event.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                        required
                      />
                      <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`longitude-${index}`}>
                        Longitude {index + 1}
                      </label>
                      <input
                        id={`longitude-${index}`}
                        type="number"
                        step="0.000001"
                        value={coordinate.longitude}
                        onChange={(event) => updateCoordinate(index, 'longitude', event.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving Plantation...' : isEditing ? 'Update Plantation' : 'Create Plantation'}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleAssignMandor} className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Assign Mandor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                value={assignment.plantationId}
                onChange={(event) => setAssignment({ ...assignment, plantationId: event.target.value })}
                placeholder="Plantation ID"
                className="px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="text"
                value={assignment.mandorId}
                onChange={(event) => setAssignment({ ...assignment, mandorId: event.target.value })}
                placeholder="Mandor ID"
                className="px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full border border-green-600 text-green-700 py-2 rounded-lg hover:bg-green-50 transition-colors font-semibold"
            >
              Assign Mandor
            </button>
          </form>

          <form onSubmit={handleTransferMandor} className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Transfer Mandor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={transfer.mandorId}
                onChange={(event) => setTransfer({ ...transfer, mandorId: event.target.value })}
                placeholder="Mandor ID"
                className="px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="number"
                value={transfer.fromPlantationId}
                onChange={(event) => setTransfer({ ...transfer, fromPlantationId: event.target.value })}
                placeholder="From Plantation ID"
                className="px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="number"
                value={transfer.toPlantationId}
                onChange={(event) => setTransfer({ ...transfer, toPlantationId: event.target.value })}
                placeholder="To Plantation ID"
                className="px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full border border-green-600 text-green-700 py-2 rounded-lg hover:bg-green-50 transition-colors font-semibold"
            >
              Transfer Mandor
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading plantations...</div>
          </div>
        ) : plantations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Plantations Yet</h3>
            <p className="text-gray-600">Click &quot;Add Plantation&quot; to create your first one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plantations.map((plantation) => (
              <div key={plantation.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between gap-3 items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">{plantation.name}</h3>
                    <p className="text-sm text-gray-500">{plantation.code || `ID ${plantation.id}`}</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold">
                    {plantation.area} ha
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><span className="font-medium">Location:</span> {plantation.location}</p>
                  <p><span className="font-medium">Owner:</span> {plantation.ownerId || '-'}</p>
                  <p><span className="font-medium">Mandor:</span> {plantation.mandorId || '-'}</p>
                  <p><span className="font-medium">Plant Date:</span> {formatDate(plantation.plantDate)}</p>
                  {plantation.description && (
                    <p><span className="font-medium">Description:</span> {plantation.description}</p>
                  )}
                  {plantation.coordinates && plantation.coordinates.length > 0 && (
                    <p>
                      <span className="font-medium">Coordinates:</span>{' '}
                      {plantation.coordinates
                        .map((coordinate) => `${coordinate.latitude}, ${coordinate.longitude}`)
                        .join(' | ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(plantation)}
                    className="flex-1 px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(plantation.id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
