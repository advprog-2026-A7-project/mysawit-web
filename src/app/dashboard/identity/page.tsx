'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { AuthResponse } from '@/types';

const buildDummyIdentity = () => {
  const seed = Date.now();
  return {
    username: `dummy.user.${seed}`,
    email: `dummy.${seed}@mysawit.local`,
    password: 'dummy123',
  };
};

export default function IdentityPage() {
  const router = useRouter();
  const [serviceStatus, setServiceStatus] = useState<'UP' | 'DOWN'>('DOWN');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdUser, setCreatedUser] = useState<AuthResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string | null; username: string | null; role: string | null } | null>(null);
  const [formData, setFormData] = useState(buildDummyIdentity());

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    setCurrentUser(authService.getUserInfo());
    void loadHealth();
  }, [router]);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const health = await authService.checkHealth();
      setServiceStatus(health.status === 'UP' ? 'UP' : 'DOWN');
      setError('');
    } catch (err) {
      setServiceStatus('DOWN');
      setError(err instanceof Error ? err.message : 'Failed to contact identity service');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIdentity = () => {
    setFormData(buildDummyIdentity());
  };

  const handleCreateDummyUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const created = await identityService.createDummyUser(formData);
      setCreatedUser(created);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dummy user');
      setCreatedUser(null);
    } finally {
      setSaving(false);
    }
  };

  if (!authService.isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Identity Module (Dummy)</h1>
          </div>
          <button
            onClick={loadHealth}
            className="px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
          >
            Refresh Health
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-5">
            <p className="text-sm text-gray-600">Identity Service</p>
            <p className={`text-2xl font-bold ${serviceStatus === 'UP' ? 'text-green-700' : 'text-red-700'}`}>
              {loading ? 'CHECKING...' : serviceStatus}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <p className="text-sm text-gray-600">Current Session</p>
            <p className="text-lg font-semibold text-gray-800">
              {currentUser?.username || 'Unknown User'} ({currentUser?.role || 'UNKNOWN'})
            </p>
            <p className="text-sm text-gray-600">ID: {currentUser?.id || '-'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Create Dummy User (Persist to DB)</h2>
            <button
              onClick={handleGenerateIdentity}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Generate Random Identity
            </button>
          </div>

          <form onSubmit={handleCreateDummyUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={formData.username}
              onChange={(event) => setFormData({ ...formData, username: event.target.value })}
              placeholder="Username"
              className="px-4 py-2 border border-gray-300 rounded-lg"
              required
              minLength={3}
            />
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              placeholder="Email"
              className="px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
            <input
              type="text"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              placeholder="Password"
              className="px-4 py-2 border border-gray-300 rounded-lg"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={saving}
              className="md:col-span-3 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating User...' : 'Create Dummy User'}
            </button>
          </form>
        </div>

        {createdUser && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="text-green-800 font-semibold mb-2">Dummy user berhasil dibuat</h3>
            <p className="text-sm text-green-800">ID: {createdUser.id}</p>
            <p className="text-sm text-green-800">Username: {createdUser.username}</p>
            <p className="text-sm text-green-800">Email: {createdUser.email}</p>
            <p className="text-sm text-green-800">Role: {createdUser.role}</p>
          </div>
        )}
      </main>
    </div>
  );
}
