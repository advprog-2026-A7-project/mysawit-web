'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { AuthResponse, User, UserRole } from '@/types';

const roles: UserRole[] = ['BURUH', 'MANDOR', 'SUPIR', 'ADMIN'];

const buildIdentity = () => {
  const seed = Date.now();
  return {
    username: `user.${seed}`,
    email: `user.${seed}@mysawit.local`,
    password: 'dummy123',
    role: 'BURUH' as UserRole,
    certificationNumber: '',
    mandorId: '',
    kebunId: '',
  };
};

const formatDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
};

export default function IdentityPage() {
  const router = useRouter();
  const [serviceStatus, setServiceStatus] = useState<'UP' | 'DOWN'>('DOWN');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdUser, setCreatedUser] = useState<AuthResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string | null; username: string | null; role: string | null } | null>(null);
  const [formData, setFormData] = useState(buildIdentity());
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    role: '',
  });
  const [assignment, setAssignment] = useState({
    buruhId: '',
    mandorId: '',
  });

  const userSummary = useMemo(() => {
    const summary = new Map<string, number>();

    for (const user of users) {
      summary.set(user.role, (summary.get(user.role) ?? 0) + 1);
    }

    return roles.map((role) => ({
      role,
      count: summary.get(role) ?? 0,
    }));
  }, [users]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    setCurrentUser(authService.getUserInfo());
    void loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [health, userData] = await Promise.all([
        authService.checkHealth(),
        identityService.listUsers(),
      ]);
      setServiceStatus(health.status === 'UP' ? 'UP' : 'DOWN');
      setUsers(userData);
      setError('');
    } catch (err) {
      setServiceStatus('DOWN');
      setError(err instanceof Error ? err.message : 'Failed to contact identity service');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      const userData = await identityService.listUsers({
        name: filters.name || undefined,
        email: filters.email || undefined,
        role: filters.role as UserRole | '',
      });
      setUsers(userData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to filter users');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIdentity = () => {
    setFormData(buildIdentity());
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const created = await identityService.createDummyUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        certificationNumber: formData.certificationNumber || undefined,
        mandorId: formData.mandorId || undefined,
        kebunId: formData.kebunId || undefined,
      });
      setCreatedUser(created);
      setError('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      setCreatedUser(null);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMandor = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await identityService.assignMandor(assignment.buruhId, {
        mandorId: assignment.mandorId,
      });
      setAssignment({ buruhId: '', mandorId: '' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign mandor');
    }
  };

  const handleUnassignMandor = async (buruhId: string) => {
    try {
      await identityService.unassignMandor(buruhId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign mandor');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;

    try {
      await identityService.deleteUser(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
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
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Identity Management</h1>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-5">
            <p className="text-sm text-gray-600">Identity Service</p>
            <p className={`text-2xl font-bold ${serviceStatus === 'UP' ? 'text-green-700' : 'text-red-700'}`}>
              {loading ? 'CHECKING...' : serviceStatus}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <p className="text-sm text-gray-600">Current Session</p>
            <p className="text-lg font-semibold text-gray-800">
              {currentUser?.username || 'Unknown'} ({currentUser?.role || 'UNKNOWN'})
            </p>
            <p className="text-sm text-gray-600">ID: {currentUser?.id || '-'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <p className="text-sm text-gray-600">Managed Users</p>
            <p className="text-2xl font-bold text-green-800">{users.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {userSummary.map((item) => (
            <div key={item.role} className="bg-white rounded-lg shadow-md p-4">
              <p className="text-sm text-gray-600">{item.role}</p>
              <p className="text-2xl font-bold text-green-800">{item.count}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Create User</h2>
            <button
              onClick={handleGenerateIdentity}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Generate Identity
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <select
                value={formData.role}
                onChange={(event) => setFormData({ ...formData, role: event.target.value as UserRole })}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={formData.certificationNumber}
                onChange={(event) => setFormData({ ...formData, certificationNumber: event.target.value })}
                placeholder="Certification Number"
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={formData.mandorId}
                onChange={(event) => setFormData({ ...formData, mandorId: event.target.value })}
                placeholder="Mandor ID"
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={formData.kebunId}
                onChange={(event) => setFormData({ ...formData, kebunId: event.target.value })}
                placeholder="Kebun ID"
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating User...' : 'Create User'}
            </button>
          </form>
        </div>

        {createdUser && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="text-green-800 font-semibold mb-2">User created</h3>
            <p className="text-sm text-green-800">ID: {createdUser.id}</p>
            <p className="text-sm text-green-800">Username: {createdUser.username}</p>
            <p className="text-sm text-green-800">Role: {createdUser.role}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">User Directory</h2>
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              value={filters.name}
              onChange={(event) => setFilters({ ...filters, name: event.target.value })}
              placeholder="Name"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="email"
              value={filters.email}
              onChange={(event) => setFilters({ ...filters, email: event.target.value })}
              placeholder="Email"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={filters.role}
              onChange={(event) => setFilters({ ...filters, role: event.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Filter
            </button>
          </form>

          <form onSubmit={handleAssignMandor} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <input
              type="text"
              value={assignment.buruhId}
              onChange={(event) => setAssignment({ ...assignment, buruhId: event.target.value })}
              placeholder="Buruh ID"
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
            <button
              type="submit"
              className="px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-semibold"
            >
              Assign Mandor
            </button>
          </form>

          {loading ? (
            <p className="text-center py-8 text-gray-600">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-gray-600">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Mandor</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{user.name || user.username}</p>
                        <p className="text-gray-600">{user.email}</p>
                        <p className="text-gray-500">ID: {user.id}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{user.role}</td>
                      <td className="px-4 py-3 text-gray-700">{user.mandorId || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {user.role === 'BURUH' && user.mandorId && (
                            <button
                              type="button"
                              onClick={() => handleUnassignMandor(user.id)}
                              className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                              Unassign
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
