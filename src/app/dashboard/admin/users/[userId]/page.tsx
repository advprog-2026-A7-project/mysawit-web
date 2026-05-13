'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminService } from '@/services/admin.service';
import { useAuth } from '@/contexts/auth-context';
import { UserDetailResponse } from '@/types';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  MANDOR: 'bg-blue-100 text-blue-800',
  BURUH: 'bg-green-100 text-green-800',
  SUPIR: 'bg-yellow-100 text-yellow-800',
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mandor assignment
  const [mandors, setMandors] = useState<UserDetailResponse[]>([]);
  const [selectedMandorId, setSelectedMandorId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getUserById(userId);
      setUser(data);

      if (data.role === 'BURUH') {
        const mandorList = await adminService.getUsers({ role: 'MANDOR' });
        setMandors(mandorList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleAssignMandor = async () => {
    if (!selectedMandorId) return;
    setAssigning(true);
    setError('');

    try {
      await adminService.assignMandor(userId, selectedMandorId);
      setSuccess('Mandor assigned successfully.');
      setSelectedMandorId('');
      setTimeout(() => setSuccess(''), 3000);
      loadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign mandor');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignMandor = async () => {
    if (!confirm('Are you sure you want to unassign this Buruh from their Mandor?')) return;
    setAssigning(true);
    setError('');

    try {
      await adminService.unassignMandor(userId);
      setSuccess('Mandor unassigned successfully.');
      setTimeout(() => setSuccess(''), 3000);
      loadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign mandor');
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) return;

    try {
      await adminService.deleteUser(userId);
      router.push('/dashboard/admin/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-600">Loading user details...</div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">User Not Found</h2>
        <Link href="/dashboard/admin/users" className="text-green-600 hover:text-green-700">
          Back to Users
        </Link>
      </div>
    );
  }

  const mandorName = user.mandorId
    ? mandors.find((m) => m.id === user.mandorId)?.name || user.mandorId
    : null;

  return (
    <>
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard/admin/users" className="text-green-600 hover:text-green-700 text-sm">
            ← Back to Users
          </Link>
          <h1 className="text-2xl font-bold text-green-800">User Detail</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">{success}</div>
        )}

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name || user.username}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}`}>
              {user.role}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-500">Username</span>
              <p className="text-gray-900">{user.username}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Email</span>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Created At</span>
              <p className="text-gray-900">{new Date(user.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Authentication</span>
              <div className="flex gap-2 mt-1">
                {user.hasPassword && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Password</span>
                )}
                {user.googleLinked && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Google</span>
                )}
              </div>
            </div>
            {user.certificationNumber && (
              <div>
                <span className="font-medium text-gray-500">Certification Number</span>
                <p className="text-gray-900">{user.certificationNumber}</p>
              </div>
            )}
            {user.kebunId && (
              <div>
                <span className="font-medium text-gray-500">Kebun ID</span>
                <p className="text-gray-900">{user.kebunId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mandor Assignment Section (BURUH only) */}
        {user.role === 'BURUH' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Mandor Assignment</h3>

            {user.mandorId ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Currently assigned to: <span className="font-medium text-gray-900">{mandorName}</span>
                </p>
                <button
                  onClick={handleUnassignMandor}
                  disabled={assigning}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:bg-gray-400"
                >
                  {assigning ? 'Processing...' : 'Unassign Mandor'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">This Buruh is not assigned to any Mandor.</p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Select Mandor</label>
                    <select
                      value={selectedMandorId}
                      onChange={(e) => setSelectedMandorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                    >
                      <option value="">Choose a Mandor...</option>
                      {mandors.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.username} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAssignMandor}
                    disabled={!selectedMandorId || assigning}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Section */}
        {user.id !== currentUser?.id && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-red-100">
            <h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-600 mb-4">
              Deleting this user is permanent and cannot be undone.
            </p>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Delete User
            </button>
          </div>
        )}
      </main>
    </>
  );
}
