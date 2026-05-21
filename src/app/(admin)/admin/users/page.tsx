'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminService } from '@/services/admin.service';
import { useAuth } from '@/contexts/auth-context';
import { UserDetailResponse, UserRole } from '@/types';



export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search filters
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: { name?: string; email?: string; role?: UserRole } = {};
      if (nameFilter.trim()) params.name = nameFilter.trim();
      if (emailFilter.trim()) params.email = emailFilter.trim();
      if (roleFilter) params.role = roleFilter;

      const data = await adminService.getUsers(Object.keys(params).length > 0 ? params : undefined);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [nameFilter, emailFilter, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) return;

    try {
      setError('');
      await adminService.deleteUser(userId);
      setSuccess(`User "${username}" deleted successfully.`);
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  return (
    <div className="page-shell animate-fade-in max-w-7xl mx-auto space-y-6">

      {error && (
        <div className="alert-error mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{success}</div>
      )}

      {/* Search/Filter Bar */}
      <div className="surface-panel p-5 bg-white/[0.02]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label-sm">Name</label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Search by name..."
              className="ms-input"
            />
          </div>
          <div>
            <label className="label-sm">Email</label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="Search by email..."
              className="ms-input"
            />
          </div>
          <div>
            <label className="label-sm">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
              className="ms-input"
            >
              <option value="">All Roles</option>
              <option value="BURUH">Buruh</option>
              <option value="MANDOR">Mandor</option>
              <option value="SUPIR">Supir</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setNameFilter(''); setEmailFilter(''); setRoleFilter(''); }}
              className="btn-secondary w-full justify-center py-2.5"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="surface-panel p-12 text-center border border-white/[0.05]">
          <div className="text-5xl mb-4 opacity-50">👥</div>
          <h3 className="text-xl font-bold text-white mb-2">No Users Found</h3>
          <p className="text-slate-400">Try adjusting your search filters</p>
        </div>
      ) : (
        <div className="surface-panel overflow-hidden border border-white/[0.05]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-white/[0.05]">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">User</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Role</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Auth</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Created</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{u.name || u.username}</div>
                      <div className="text-slate-400 mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        u.role === 'MANDOR' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        u.role === 'BURUH' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {u.hasPassword && (
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 font-medium">Password</span>
                        )}
                        {u.googleLinked && (
                          <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-800/50 font-medium">Google</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                        >
                          View
                        </Link>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(u.id, u.username)}
                            className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
