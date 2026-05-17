'use client';

import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { AuthResponse, User, UserRole } from '@/types';

const roles: UserRole[] = ['BURUH', 'MANDOR', 'SUPIR', 'ADMIN'];

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'badge-purple', MANDOR: 'badge-blue', BURUH: 'badge-green', SUPIR: 'badge-orange',
};

const buildIdentity = () => {
  const seed = Date.now();
  return { username: `user.${seed}`, email: `user.${seed}@mysawit.local`, password: 'dummy123', role: 'BURUH' as UserRole, certificationNumber: '', mandorId: '', kebunId: '' };
};

const formatDate = (v?: string) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function IdentityPage() {
  const [serviceStatus, setServiceStatus] = useState<'UP' | 'DOWN' | 'CHECKING'>('CHECKING');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdUser, setCreatedUser] = useState<AuthResponse | null>(null);
  const [currentUser] = useState(authService.getUserInfo());
  const [formData, setFormData] = useState(buildIdentity());
  const [filters, setFilters] = useState({ name: '', email: '', role: '' });
  const [assignment, setAssignment] = useState({ buruhId: '', mandorId: '' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tab, setTab] = useState<'users' | 'create' | 'assign'>('users');

  const userSummary = useMemo(() => roles.map(role => ({ role, count: users.filter(u => u.role === role).length })), [users]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [health, userData] = await Promise.all([authService.checkHealth(), identityService.listUsers()]);
      setServiceStatus(health.status === 'UP' ? 'UP' : 'DOWN');
      setUsers(userData);
      setError('');
    } catch (err) {
      setServiceStatus('DOWN');
      setError(err instanceof Error ? err.message : 'Gagal menghubungi Identity Service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const userData = await identityService.listUsers({ name: filters.name || undefined, email: filters.email || undefined, role: filters.role as UserRole | '' });
      setUsers(userData);
    } catch (err) { setError(err instanceof Error ? err.message : 'Filter gagal'); }
    finally { setLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const created = await identityService.createDummyUser({ username: formData.username, email: formData.email, password: formData.password, role: formData.role, certificationNumber: formData.certificationNumber || undefined, mandorId: formData.mandorId || undefined, kebunId: formData.kebunId || undefined });
      setCreatedUser(created);
      setSuccess(`User ${created.username} berhasil dibuat!`);
      setError('');
      setFormData(buildIdentity());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat user');
      setCreatedUser(null);
    } finally { setSaving(false); }
  };

  const handleAssignMandor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await identityService.assignMandor(assignment.buruhId, { mandorId: assignment.mandorId });
      setSuccess('Mandor berhasil ditugaskan!');
      setAssignment({ buruhId: '', mandorId: '' });
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal assign mandor'); }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Hapus user ${name}?`)) return;
    try {
      await identityService.deleteUser(id);
      setSuccess('User berhasil dihapus');
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal hapus user'); }
  };

  const handleUnassign = async (id: string) => {
    try {
      await identityService.unassignMandor(id);
      setSuccess('Mandor berhasil dicopot');
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal unassign'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-start justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">👤 Identity Management</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola pengguna, autentikasi, dan penugasan mandor</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${serviceStatus === 'UP' ? 'badge-green' : serviceStatus === 'CHECKING' ? 'badge-gray' : 'badge-red'}`}>
            {serviceStatus === 'CHECKING' ? 'Checking...' : serviceStatus}
          </span>
          <button onClick={loadData} className="btn-ghost">↻ Refresh</button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="alert-error"><span>⚠️</span><span>{error}</span><button onClick={() => setError('')} className="ml-auto text-slate-400 hover:text-white">✕</button></div>}
      {success && <div className="alert-success"><span>✅</span><span>{success}</span><button onClick={() => setSuccess('')} className="ml-auto text-slate-400 hover:text-white">✕</button></div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger-children">
        {[
          { label: 'Total Users', value: users.length, icon: '👥', cls: 'badge-gray' },
          ...userSummary.map(s => ({ label: s.role, value: s.count, icon: s.role === 'ADMIN' ? '🛡' : s.role === 'MANDOR' ? '👷' : s.role === 'BURUH' ? '🌾' : '🚚', cls: ROLE_BADGE[s.role] })),
        ].map(card => (
          <div key={card.label} className="stat-card animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <span className={`badge ${card.cls} text-[10px]`}>{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-surface)] p-1 rounded-xl w-fit border border-white/[0.06]">
        {(['users', 'create', 'assign'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-green-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            {t === 'users' ? 'User Directory' : t === 'create' ? '+ Buat User' : 'Assign Mandor'}
          </button>
        ))}
      </div>

      {/* Tab: User Directory */}
      {tab === 'users' && (
        <div className="glass-card overflow-hidden">
          {/* Filter bar */}
          <div className="p-4 border-b border-white/[0.06]">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
              <input type="text" value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} placeholder="Cari nama..." className="ms-input flex-1 min-w-[160px]" />
              <input type="email" value={filters.email} onChange={e => setFilters({ ...filters, email: e.target.value })} placeholder="Cari email..." className="ms-input flex-1 min-w-[160px]" />
              <select value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })} className="ms-input w-auto">
                <option value="">Semua Role</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button type="submit" className="btn-primary">Filter</button>
              <button type="button" onClick={() => { setFilters({ name: '', email: '', role: '' }); void loadData(); }} className="btn-ghost">Reset</button>
            </form>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
              Memuat data pengguna...
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="text-4xl mb-3">👤</div>
              <p className="font-medium">Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Role</th>
                    <th>Mandor ID</th>
                    <th>Bergabung</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-sm font-bold text-slate-300 shrink-0 border border-white/[0.08]">
                            {(user.name || user.username)?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">{user.name || user.username}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                            <p className="text-[10px] text-slate-600 font-mono">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${ROLE_BADGE[user.role] || 'badge-gray'}`}>{user.role}</span></td>
                      <td><span className="font-mono text-xs text-slate-500">{user.mandorId || '-'}</span></td>
                      <td><span className="text-xs">{formatDate(user.createdAt)}</span></td>
                      <td>
                        <div className="flex justify-end gap-2">
                          {user.role === 'BURUH' && user.mandorId && (
                            <button onClick={() => handleUnassign(user.id)} className="btn-ghost text-xs px-2 py-1">Unassign</button>
                          )}
                          {currentUser?.id !== user.id && (
                            <button onClick={() => handleDeleteUser(user.id, user.name || user.username)} className="btn-danger text-xs px-2 py-1">Hapus</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Create User */}
      {tab === 'create' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Buat User Baru</h2>
            <button onClick={() => setFormData(buildIdentity())} className="btn-ghost text-xs">↻ Generate Identity</button>
          </div>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Username</label>
                <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="ms-input" required minLength={3} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="ms-input" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
                <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="ms-input" required minLength={6} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="ms-input">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {formData.role === 'MANDOR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">No. Sertifikasi Mandor</label>
                  <input type="text" value={formData.certificationNumber} onChange={e => setFormData({ ...formData, certificationNumber: e.target.value })} className="ms-input" placeholder="Opsional untuk MANDOR" />
                </div>
              )}
              {formData.role === 'BURUH' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Mandor ID (UUID)</label>
                    <input type="text" value={formData.mandorId} onChange={e => setFormData({ ...formData, mandorId: e.target.value })} className="ms-input" placeholder="Opsional" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Kebun ID</label>
                    <input type="text" value={formData.kebunId} onChange={e => setFormData({ ...formData, kebunId: e.target.value })} className="ms-input" placeholder="Opsional" />
                  </div>
                </>
              )}
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
              {saving ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Membuat...</span> : 'Buat User'}
            </button>
          </form>
          {createdUser && (
            <div className="mt-4 alert-success">
              <div>
                <p className="font-semibold">User berhasil dibuat!</p>
                <p className="text-xs mt-1 opacity-80">ID: {createdUser.id} | Username: {createdUser.username} | Role: {createdUser.role}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Assign Mandor */}
      {tab === 'assign' && (
        <div className="glass-card p-6 max-w-lg">
          <h2 className="section-title mb-5">Assign Buruh ke Mandor</h2>
          <form onSubmit={handleAssignMandor} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Buruh ID (UUID)</label>
              <input type="text" value={assignment.buruhId} onChange={e => setAssignment({ ...assignment, buruhId: e.target.value })} className="ms-input" placeholder="UUID buruh" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Mandor ID (UUID)</label>
              <input type="text" value={assignment.mandorId} onChange={e => setAssignment({ ...assignment, mandorId: e.target.value })} className="ms-input" placeholder="UUID mandor" required />
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3">Assign Mandor</button>
          </form>
          <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-500">
            <p className="font-semibold text-slate-400 mb-1">ℹ️ Cara cepat:</p>
            <p>Salin UUID dari tabel User Directory, lalu paste di sini.</p>
          </div>
        </div>
      )}
    </div>
  );
}
