'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { plantationService } from '@/services/plantation.service';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { Coordinate, EntityId, Plantation, PlantationRequest, User } from '@/types';
import {
  BadgeCheck,
  CalendarDays,
  Eye,
  Map,
  MapPinned,
  Pencil,
  RefreshCw,
  Repeat,
  Ruler,
  Save,
  Search,
  Trash2,
  Truck,
  UserMinus,
  UserPlus,
  Wheat,
  X,
} from 'lucide-react';

const fmt = (v?: string) => { if (!v) return '-'; const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); };
const toDateLocal = (v?: string) => { if (!v) return ''; const d = new Date(v); if (isNaN(d.getTime())) return ''; return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

type CoordForm = { latitude: string; longitude: string };
const DEF_COORDS: CoordForm[] = [
  { latitude: '-6.200', longitude: '106.816' }, { latitude: '-6.200', longitude: '106.826' },
  { latitude: '-6.210', longitude: '106.826' }, { latitude: '-6.210', longitude: '106.816' },
];

interface FormState { id: string; name: string; location: string; area: string; ownerId: string; description: string; plantDate: string; coordinates: CoordForm[]; }
const EMPTY: FormState = { id: '', name: '', location: '', area: '', ownerId: '', description: '', plantDate: '', coordinates: DEF_COORDS };

export default function PlantationsPage() {
  const [plantations, setPlantations] = useState<Plantation[]>([]);
  const [mandors, setMandors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'list' | 'form' | 'mandor' | 'supir'>('list');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY, ownerId: authService.getUserInfo()?.id || '' });
  const [ownerFilter, setOwnerFilter] = useState('');
  const [assignment, setAssignment] = useState({ plantationId: '', mandorId: '' });
  const [transfer, setTransfer] = useState({ mandorId: '', fromPlantationId: '', toPlantationId: '' });

  // Supir management state
  const [supirForm, setSupirForm] = useState({ plantationId: '', supirId: '' });
  const [unassignSupirForm, setUnassignSupirForm] = useState({ plantationId: '', supirId: '' });
  const [supirList, setSupirList] = useState<string[]>([]);
  const [viewSupirPlantationId, setViewSupirPlantationId] = useState('');
  const [allSupirs, setAllSupirs] = useState<User[]>([]);
  const [allMandors, setAllMandors] = useState<User[]>([]);

  const summary = useMemo(() => ({
    total: plantations.length,
    totalArea: plantations.reduce((s, p) => s + p.area, 0),
    withMandor: plantations.filter(p => p.mandorId).length,
    withSupir: plantations.filter(p => p.supirIds && p.supirIds.length > 0).length,
  }), [plantations]);
  const filteredPlantations = useMemo(() => {
    const term = ownerFilter.trim().toLowerCase();
    if (!term) return plantations;
    return plantations.filter((plantation) => [
      plantation.name,
      plantation.location,
      plantation.code,
      plantation.description,
    ].some(value => String(value || '').toLowerCase().includes(term)));
  }, [ownerFilter, plantations]);
  const visiblePlantations = useMemo(() => filteredPlantations.slice(0, 24), [filteredPlantations]);
  const userNameById = useMemo(() => [...allMandors, ...allSupirs].reduce<Record<string, string>>((acc, user) => {
    acc[String(user.id)] = user.name || user.username || user.email || 'Anggota';
    return acc;
  }, {}), [allMandors, allSupirs]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await plantationService.getAll();
      setPlantations(data); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat plantasi'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (tab === 'mandor' || tab === 'supir') {
      identityService.listUsers().then((users: User[]) => {
        setAllSupirs(users.filter((u: User) => u.role === 'SUPIR'));
        setAllMandors(users.filter((u: User) => u.role === 'MANDOR'));
      }).catch(() => {});
    }
  }, [tab]);

  const resetForm = () => { setForm({ ...EMPTY, ownerId: authService.getUserInfo()?.id || '' }); setEditing(false); setTab('list'); };

  const openEdit = (p: Plantation) => {
    setForm({ id: String(p.id), name: p.name, location: p.location, area: String(p.area), ownerId: p.ownerId ? String(p.ownerId) : '', description: p.description || '', plantDate: toDateLocal(p.plantDate), coordinates: p.coordinates?.length === 4 ? p.coordinates.map(c => ({ latitude: String(c.latitude), longitude: String(c.longitude) })) : DEF_COORDS });
    setEditing(true); setTab('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coords: Coordinate[] = form.coordinates.map(c => ({ latitude: parseFloat(c.latitude), longitude: parseFloat(c.longitude) }));
    if (coords.some(c => !isFinite(c.latitude) || !isFinite(c.longitude))) { setError('Koordinat tidak valid'); return; }
    try {
      setSaving(true);
      const req: PlantationRequest = { name: form.name, location: form.location, area: parseFloat(form.area), ownerId: form.ownerId || undefined, description: form.description || undefined, plantDate: form.plantDate || undefined, coordinates: coords };
      if (editing) await plantationService.update(form.id, req); else await plantationService.create(req);
      setSuccess(editing ? 'Kebun diperbarui!' : 'Kebun berhasil dibuat!');
      resetForm(); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal simpan plantasi'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: EntityId, name: string) => {
    if (!confirm(`Hapus kebun "${name}"? Pastikan tidak ada mandor aktif.`)) return;
    try { await plantationService.delete(id); setSuccess('Kebun dihapus'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal hapus — pastikan tidak ada mandor'); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await plantationService.assignMandor(assignment.plantationId, { mandorId: assignment.mandorId }); setSuccess('Mandor berhasil ditugaskan!'); setAssignment({ plantationId: '', mandorId: '' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal assign mandor'); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await plantationService.transferMandor({ mandorId: transfer.mandorId, fromPlantationId: transfer.fromPlantationId, toPlantationId: transfer.toPlantationId }); setSuccess('Mandor berhasil dipindahkan!'); setTransfer({ mandorId: '', fromPlantationId: '', toPlantationId: '' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal transfer mandor'); }
  };

  const handleUnassignMandor = async (id: EntityId, name: string) => {
    if (!confirm(`Copot mandor dari kebun "${name}"? Segera tugaskan mandor ke kebun lain.`)) return;
    try { await plantationService.unassignMandor(id); setSuccess('Mandor dicopot'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal copot mandor'); }
  };

  const handleAssignSupir = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await plantationService.assignSupir(supirForm.plantationId, supirForm.supirId); setSuccess('Supir berhasil ditugaskan!'); setSupirForm({ plantationId: '', supirId: '' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal assign supir'); }
  };

  const handleUnassignSupir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Copot supir ini? Segera tugaskan ke kebun lain.`)) return;
    try { await plantationService.unassignSupir(unassignSupirForm.plantationId, unassignSupirForm.supirId); setSuccess('Supir dicopot!'); setUnassignSupirForm({ plantationId: '', supirId: '' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal copot supir'); }
  };

  const handleViewSupirs = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const list = await plantationService.getSupirs(viewSupirPlantationId); setSupirList(list); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal ambil daftar supir'); }
  };

  const updateCoord = (i: number, field: 'latitude' | 'longitude', val: string) =>
    setForm(f => ({ ...f, coordinates: f.coordinates.map((c, ci) => ci === i ? { ...c, [field]: val } : c) }));

  const TABS = [
    { id: 'list' as const, label: 'Daftar Kebun' },
    { id: 'form' as const, label: editing ? 'Edit Kebun' : '+ Tambah Kebun' },
    { id: 'mandor' as const, label: 'Penugasan Mandor' },
    { id: 'supir' as const, label: 'Penugasan Supir' },
  ];

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div>
          <p className="page-eyebrow">Kebun & Penugasan</p>
          <h1 className="page-heading">Manajemen Kebun</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola kebun sawit, mandor, dan penugasan supir truk</p>
        </div>
        <button onClick={() => load()} className="btn-ghost"><RefreshCw size={15} aria-hidden="true" />Refresh</button>
      </div>

      {error && <div className="alert-error"><span>{error}</span><button onClick={() => setError('')} className="ml-auto">✕</button></div>}
      {success && <div className="alert-success"><span>{success}</span><button onClick={() => setSuccess('')} className="ml-auto">✕</button></div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Kebun', value: summary.total, Icon: Map, color: 'text-green-300 bg-green-500/15' },
          { label: 'Luas Total', value: `${summary.totalArea.toLocaleString('id-ID')} ha`, Icon: Ruler, color: 'text-cyan-300 bg-cyan-500/15' },
          { label: 'Ada Mandor', value: summary.withMandor, Icon: BadgeCheck, color: 'text-blue-300 bg-blue-500/15' },
          { label: 'Ada Supir', value: summary.withSupir, Icon: Truck, color: 'text-orange-300 bg-orange-500/15' },
        ].map(c => (
          <div key={c.label} className="metric-card">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${c.color}`}>
              <c.Icon size={18} aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== 'form') { setEditing(false); setForm({ ...EMPTY, ownerId: authService.getUserInfo()?.id || '' }); } }}
            className={`tab-button ${tab === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {tab === 'list' && (
        <>
          <form onSubmit={e => { e.preventDefault(); }} className="surface-panel p-4 flex flex-wrap gap-2">
            <input type="text" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} placeholder="Cari nama atau lokasi kebun..." className="ms-input w-64" />
            <button type="submit" className="btn-primary"><Search size={15} aria-hidden="true" />Cari</button>
            <button type="button" onClick={() => setOwnerFilter('')} className="btn-ghost"><RefreshCw size={15} aria-hidden="true" />Reset</button>
          </form>
          {loading ? (
            <div className="surface-panel p-12 text-center text-slate-500">
              <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />Memuat...
            </div>
          ) : filteredPlantations.length === 0 ? (
            <div className="empty-state">
              <Wheat size={34} aria-hidden="true" className="mx-auto mb-3 text-slate-500" />
              <p className="font-medium text-slate-400">Belum ada kebun yang cocok</p>
              <button onClick={() => setTab('form')} className="btn-primary mt-4"><Map size={15} aria-hidden="true" />+ Tambah Kebun Pertama</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visiblePlantations.map(p => (
                <div key={p.id} className="glass-card surface-panel p-5 hover:border-green-500/20 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-white">{p.name}</p>
                      {p.code && <p className="text-xs text-slate-500 mt-0.5">Kode {p.code}</p>}
                    </div>
                    <span className="badge badge-green">{p.area} ha</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                    <div className="flex gap-2"><MapPinned size={13} aria-hidden="true" className="mt-0.5 shrink-0" /><span>{p.location}</span></div>
                    <div className="flex gap-2">
                      <BadgeCheck size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
                      <span>Mandor: <span className={p.mandorId ? 'text-green-400' : 'text-slate-600'}>{p.mandorId ? userNameById[String(p.mandorId)] || 'Sudah ditugaskan' : 'Belum'}</span></span>
                    </div>
                    <div className="flex gap-2">
                      <Truck size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
                      <span>Supir: <span className={p.supirIds && p.supirIds.length > 0 ? 'text-blue-400' : 'text-slate-600'}>{p.supirIds ? p.supirIds.length : 0} orang</span></span>
                    </div>
                    <div className="flex gap-2"><CalendarDays size={13} aria-hidden="true" className="mt-0.5 shrink-0" /><span>{fmt(p.plantDate)}</span></div>
                    {p.coordinates && p.coordinates.length > 0 && (
                      <div className="flex gap-2">
                        <Map size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
                        <span>{p.coordinates.length} titik koordinat tersimpan</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-white/[0.06] flex-wrap">
                    <button onClick={() => openEdit(p)} className="flex-1 btn-secondary text-xs py-1.5 justify-center"><Pencil size={13} aria-hidden="true" />Edit</button>
                    {p.mandorId && <button onClick={() => handleUnassignMandor(p.id, p.name)} className="btn-ghost text-xs px-3 py-1.5 text-yellow-400 border-yellow-500/20"><UserMinus size={13} aria-hidden="true" />Copot Mandor</button>}
                    <button onClick={() => handleDelete(p.id, p.name)} className="btn-danger text-xs px-3 py-1.5"><Trash2 size={13} aria-hidden="true" />Hapus</button>
                  </div>
                </div>
              ))}
              {filteredPlantations.length > visiblePlantations.length && (
                <div className="surface-panel p-5 text-sm text-slate-500">
                  Menampilkan {visiblePlantations.length} dari {filteredPlantations.length} kebun. Gunakan pencarian untuk mempersempit daftar.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Form Tab */}
      {tab === 'form' && (
        <div className="glass-card surface-panel p-6 max-w-2xl">
          <h2 className="section-title mb-5">{editing ? `Edit: ${form.name}` : 'Tambah Kebun Baru'}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label-sm">Nama Kebun</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="ms-input" placeholder="Kebun Blok A" required /></div>
              <div><label className="label-sm">Lokasi</label><input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="ms-input" placeholder="Kalimantan Selatan" required /></div>
              <div><label className="label-sm">Luas (hektare)</label><input type="number" step="0.01" min="0.01" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className="ms-input" placeholder="25.5" required /></div>
              <div><label className="label-sm">Tanggal Tanam</label><input type="datetime-local" value={form.plantDate} onChange={e => setForm({ ...form, plantDate: e.target.value })} className="ms-input" /></div>
            </div>
            <div><label className="label-sm">Deskripsi</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="ms-input resize-none" placeholder="Deskripsi kebun..." /></div>
            <div>
              <label className="label-sm mb-3 block">Koordinat 4 Sudut (Latitude, Longitude)</label>
              <div className="grid grid-cols-2 gap-3">
                {form.coordinates.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[10px] font-semibold text-slate-500 mb-2">Titik {i + 1}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="0.000001" value={c.latitude} onChange={e => updateCoord(i, 'latitude', e.target.value)} className="ms-input text-xs" placeholder="Lat" required />
                      <input type="number" step="0.000001" value={c.longitude} onChange={e => updateCoord(i, 'longitude', e.target.value)} className="ms-input text-xs" placeholder="Lon" required />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-3">
                {saving ? 'Menyimpan...' : editing ? <><Save size={16} aria-hidden="true" />Update Kebun</> : <><Map size={16} aria-hidden="true" />Buat Kebun</>}
              </button>
              <button type="button" onClick={resetForm} className="btn-ghost px-5"><X size={15} aria-hidden="true" />Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Mandor Management Tab */}
      {tab === 'mandor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          <div className="glass-card surface-panel p-5">
            <h3 className="font-bold text-white mb-1">Assign Mandor ke Kebun</h3>
            <p className="text-xs text-slate-500 mb-4">Tugaskan Mandor untuk mengawasi kebun sawit</p>
            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="label-sm">Kebun</label>
                <select value={assignment.plantationId} onChange={e => setAssignment({ ...assignment, plantationId: e.target.value })} className="ms-input" required>
                  <option value="">Pilih kebun</option>
                  {plantations.map(p => <option key={p.id} value={String(p.id)}>{p.name} - {p.location}</option>)}
                </select>
              </div>
              <div>
                <label className="label-sm">Mandor</label>
                <select value={assignment.mandorId} onChange={e => setAssignment({ ...assignment, mandorId: e.target.value })} className="ms-input" required>
                  <option value="">Pilih mandor</option>
                  {allMandors.map(user => <option key={user.id} value={String(user.id)}>{user.name || user.username} - {user.email}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center"><BadgeCheck size={16} aria-hidden="true" />Simpan Penugasan</button>
            </form>
          </div>
          <div className="glass-card surface-panel p-5">
            <h3 className="font-bold text-white mb-1">Transfer Mandor</h3>
            <p className="text-xs text-slate-500 mb-4">Pindahkan Mandor dari satu kebun ke kebun lain</p>
            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="label-sm">Mandor</label>
                <select value={transfer.mandorId} onChange={e => setTransfer({ ...transfer, mandorId: e.target.value })} className="ms-input" required>
                  <option value="">Pilih mandor</option>
                  {allMandors.map(user => <option key={user.id} value={String(user.id)}>{user.name || user.username} - {user.email}</option>)}
                </select>
              </div>
              <div>
                <label className="label-sm">Dari Kebun</label>
                <select value={transfer.fromPlantationId} onChange={e => setTransfer({ ...transfer, fromPlantationId: e.target.value })} className="ms-input" required>
                  <option value="">Pilih kebun asal</option>
                  {plantations.map(p => <option key={p.id} value={String(p.id)}>{p.name} - {p.location}</option>)}
                </select>
              </div>
              <div>
                <label className="label-sm">Ke Kebun</label>
                <select value={transfer.toPlantationId} onChange={e => setTransfer({ ...transfer, toPlantationId: e.target.value })} className="ms-input" required>
                  <option value="">Pilih kebun tujuan</option>
                  {plantations.map(p => <option key={p.id} value={String(p.id)}>{p.name} - {p.location}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center"><Repeat size={16} aria-hidden="true" />Pindahkan Mandor</button>
            </form>
          </div>
        </div>
      )}

      {/* Supir Management Tab */}
      {tab === 'supir' && (
        <div className="space-y-5 max-w-3xl">
          {/* Lihat supir di kebun */}
          <div className="glass-card surface-panel p-5">
            <h3 className="font-bold text-white mb-1">Lihat Supir di Kebun</h3>
            <form onSubmit={handleViewSupirs} className="flex gap-3 mb-4">
              <select value={viewSupirPlantationId} onChange={e => setViewSupirPlantationId(e.target.value)} className="ms-input flex-1" required>
                <option value="">Pilih kebun</option>
                {plantations.map(p => <option key={p.id} value={String(p.id)}>{p.name} - {p.location}</option>)}
              </select>
              <button type="submit" className="btn-primary"><Eye size={15} aria-hidden="true" />Lihat</button>
            </form>
            {supirList.length > 0 && (
              <div className="space-y-2">
                {supirList.map(id => (
                  <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-xs text-slate-300">{userNameById[String(id)] || 'Supir ditugaskan'}</span>
                    <button onClick={() => setUnassignSupirForm({ plantationId: viewSupirPlantationId, supirId: id })} className="text-xs text-red-400 hover:text-red-300">Copot</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Assign supir */}
            <div className="glass-card surface-panel p-5">
              <h3 className="font-bold text-white mb-1">Assign Supir ke Kebun</h3>
              <p className="text-xs text-slate-500 mb-4">Supir harus ditugaskan ke kebun sebelum bisa mengangkut panen</p>
              <form onSubmit={handleAssignSupir} className="space-y-3">
                <div>
                  <label className="label-sm">Kebun</label>
                  <select value={supirForm.plantationId} onChange={e => setSupirForm({ ...supirForm, plantationId: e.target.value })} className="ms-input" required>
                    <option value="">Pilih kebun</option>
                    {plantations.map(p => <option key={p.id} value={String(p.id)}>{p.name} - {p.location}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-sm">Supir</label>
                  <select value={supirForm.supirId} onChange={e => setSupirForm({ ...supirForm, supirId: e.target.value })} className="ms-input" required>
                    <option value="">Pilih supir</option>
                    {allSupirs.map(u => <option key={u.id} value={String(u.id)}>{u.name || u.username} - {u.email}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-primary w-full justify-center"><UserPlus size={16} aria-hidden="true" />Simpan Penugasan</button>
              </form>
            </div>

            {/* Unassign supir */}
            <div className="glass-card surface-panel p-5">
              <h3 className="font-bold text-white mb-1">Copot Supir dari Kebun</h3>
              <p className="text-xs text-slate-500 mb-4">Segera tugaskan supir ke kebun lain setelah dicopot</p>
              <form onSubmit={handleUnassignSupir} className="space-y-3">
                <div>
                  <label className="label-sm">Kebun</label>
                  <select value={unassignSupirForm.plantationId} onChange={e => setUnassignSupirForm({ ...unassignSupirForm, plantationId: e.target.value })} className="ms-input" required>
                    <option value="">Pilih kebun</option>
                    {plantations.map(p => <option key={p.id} value={String(p.id)}>{p.name} - {p.location}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-sm">Supir</label>
                  <select value={unassignSupirForm.supirId} onChange={e => setUnassignSupirForm({ ...unassignSupirForm, supirId: e.target.value })} className="ms-input" required>
                    <option value="">Pilih supir</option>
                    {allSupirs.map(u => <option key={u.id} value={String(u.id)}>{u.name || u.username} - {u.email}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-danger w-full justify-center"><UserMinus size={16} aria-hidden="true" />Copot Supir</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
