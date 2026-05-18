'use client';

import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { AuthResponse, User, UserRole } from '@/types';
import {
  BadgeCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UserMinus,
  UserPlus,
  Users,
  Wheat,
} from 'lucide-react';

const roles: UserRole[] = ['BURUH', 'MANDOR', 'SUPIR', 'ADMIN'];

const POSITION_BADGE: Record<string, string> = {
  ADMIN: 'badge-purple', MANDOR: 'badge-blue', BURUH: 'badge-green', SUPIR: 'badge-orange',
};

const POSITION_ICON = {
  ADMIN: ShieldCheck,
  MANDOR: BadgeCheck,
  BURUH: Wheat,
  SUPIR: Truck,
} as const;

const POSITION_LABEL: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANDOR: 'Mandor',
  BURUH: 'Pekerja Panen',
  SUPIR: 'Supir',
};

const positionLabel = (role: string) => POSITION_LABEL[role as UserRole] || role;

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
  const [tab, setTab] = useState<'users' | 'create' | 'assign'>('users');

  const userSummary = useMemo(() => roles.map(role => ({ role, label: POSITION_LABEL[role], count: users.filter(u => u.role === role).length })), [users]);
  const visibleUsers = useMemo(() => users.slice(0, 50), [users]);
  const mandorOptions = useMemo(() => users.filter(user => user.role === 'MANDOR'), [users]);
  const buruhOptions = useMemo(() => users.filter(user => user.role === 'BURUH'), [users]);
  const userNameById = useMemo(() => users.reduce<Record<string, string>>((acc, user) => {
    acc[String(user.id)] = user.name || user.username || user.email || 'Anggota';
    return acc;
  }, {}), [users]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await identityService.listUsers();
      setUsers(userData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat tim operasional');
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
      setSuccess(`Anggota ${created.username} berhasil dibuat!`);
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
      setSuccess('Anggota berhasil dihapus');
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
    <div className="page-shell animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div>
          <p className="page-eyebrow">Tim Operasional</p>
          <h1 className="page-heading">Manajemen Tim</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola akun pekerja, mandor, supir, dan penugasan lapangan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="btn-ghost">
            <RefreshCw size={15} aria-hidden="true" />
            Perbarui
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="alert-error"><span>{error}</span><button onClick={() => setError('')} className="ml-auto text-slate-400 hover:text-white">✕</button></div>}
      {success && <div className="alert-success"><CheckCircle2 size={16} aria-hidden="true" /><span>{success}</span><button onClick={() => setSuccess('')} className="ml-auto text-slate-400 hover:text-white">✕</button></div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger-children">
        {[
          { label: 'Total Anggota', value: users.length, Icon: Users, cls: 'badge-gray' },
          ...userSummary.map(s => ({ label: s.label, value: s.count, Icon: POSITION_ICON[s.role], cls: POSITION_BADGE[s.role] })),
        ].map(card => (
          <div key={card.label} className="metric-card animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <card.Icon size={17} aria-hidden="true" className="text-slate-300" />
              <span className={`badge ${card.cls} text-[10px]`}>{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar w-fit">
        {(['users', 'create', 'assign'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`tab-button ${tab === t ? 'active' : ''}`}>
            {t === 'users' ? 'Daftar Tim' : t === 'create' ? '+ Tambah Anggota' : 'Penugasan Mandor'}
          </button>
        ))}
      </div>

      {/* Tab: team directory */}
      {tab === 'users' && (
        <div className="glass-card surface-panel overflow-hidden">
          {/* Filter bar */}
          <div className="p-4 border-b border-white/[0.06]">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
              <input type="text" value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} placeholder="Cari nama..." className="ms-input flex-1 min-w-[160px]" />
              <input type="email" value={filters.email} onChange={e => setFilters({ ...filters, email: e.target.value })} placeholder="Cari email..." className="ms-input flex-1 min-w-[160px]" />
              <select value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })} className="ms-input w-auto">
                <option value="">Semua posisi</option>
                {roles.map(r => <option key={r} value={r}>{POSITION_LABEL[r]}</option>)}
              </select>
              <button type="submit" className="btn-primary"><Search size={15} aria-hidden="true" />Filter</button>
              <button type="button" onClick={() => { setFilters({ name: '', email: '', role: '' }); void loadData(); }} className="btn-ghost"><RefreshCw size={15} aria-hidden="true" />Reset</button>
            </form>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
              Memuat data tim...
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <Users size={34} aria-hidden="true" className="mx-auto mb-3 text-slate-500" />
              <p className="font-medium">Tidak ada anggota ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>Anggota</th>
                    <th>Posisi</th>
                    <th>Mandor</th>
                    <th>Bergabung</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-sm font-bold text-slate-300 shrink-0 border border-white/[0.08]">
                            {(user.name || user.username)?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">{user.name || user.username}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${POSITION_BADGE[user.role] || 'badge-gray'}`}>{positionLabel(user.role)}</span></td>
                      <td><span className="text-xs text-slate-500">{user.mandorId ? userNameById[String(user.mandorId)] || 'Sudah ditugaskan' : '-'}</span></td>
                      <td><span className="text-xs">{formatDate(user.createdAt)}</span></td>
                      <td>
                        <div className="flex justify-end gap-2">
                          {user.role === 'BURUH' && user.mandorId && (
                            <button onClick={() => handleUnassign(user.id)} className="btn-ghost text-xs px-2 py-1"><UserMinus size={13} aria-hidden="true" />Copot</button>
                          )}
                          {currentUser?.id !== user.id && (
                            <button onClick={() => handleDeleteUser(user.id, user.name || user.username)} className="btn-danger text-xs px-2 py-1"><Trash2 size={13} aria-hidden="true" />Hapus</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length > visibleUsers.length && (
                <div className="p-4 text-sm text-slate-500 border-t border-white/[0.06]">
                  Menampilkan {visibleUsers.length} dari {users.length} anggota. Gunakan filter untuk mempersempit daftar.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Create member */}
      {tab === 'create' && (
        <div className="glass-card surface-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Tambah Anggota Baru</h2>
            <button onClick={() => setFormData(buildIdentity())} className="btn-ghost text-xs">
              <RefreshCw size={14} aria-hidden="true" />
              Isi Otomatis
            </button>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Posisi</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="ms-input">
                  {roles.map(r => <option key={r} value={r}>{POSITION_LABEL[r]}</option>)}
                </select>
              </div>
              {formData.role === 'MANDOR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">No. Sertifikasi Mandor</label>
                  <input type="text" value={formData.certificationNumber} onChange={e => setFormData({ ...formData, certificationNumber: e.target.value })} className="ms-input" placeholder="Opsional" />
                </div>
              )}
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
              {saving ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Membuat...</span> : <><UserPlus size={16} aria-hidden="true" />Tambah Anggota</>}
            </button>
          </form>
          {createdUser && (
            <div className="mt-4 alert-success">
              <div>
                <p className="font-semibold">Anggota berhasil dibuat.</p>
                <p className="text-xs mt-1 opacity-80">Akun {createdUser.username} siap digunakan untuk masuk ke MySawit.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Assign mandor */}
      {tab === 'assign' && (
        <div className="glass-card surface-panel p-6 max-w-lg">
          <h2 className="section-title mb-5">Tugaskan Pekerja ke Mandor</h2>
          <form onSubmit={handleAssignMandor} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Pekerja</label>
              <select value={assignment.buruhId} onChange={e => setAssignment({ ...assignment, buruhId: e.target.value })} className="ms-input" required>
                <option value="">Pilih pekerja</option>
                {buruhOptions.map(user => (
                  <option key={user.id} value={String(user.id)}>{user.name || user.username} - {user.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Mandor</label>
              <select value={assignment.mandorId} onChange={e => setAssignment({ ...assignment, mandorId: e.target.value })} className="ms-input" required>
                <option value="">Pilih mandor</option>
                {mandorOptions.map(user => (
                  <option key={user.id} value={String(user.id)}>{user.name || user.username} - {user.email}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3"><BadgeCheck size={16} aria-hidden="true" />Simpan Penugasan</button>
          </form>
        </div>
      )}
    </div>
  );
}
