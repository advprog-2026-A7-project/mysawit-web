'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { plantationService } from '@/services/plantation.service';
import { authService } from '@/services/auth.service';
import { Coordinate, EntityId, Plantation, PlantationRequest } from '@/types';

const fmt = (v?: string) => { if (!v) return '-'; const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); };
const toDateLocal = (v?: string) => { if (!v) return ''; const d = new Date(v); if (isNaN(d.getTime())) return ''; return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

type CoordForm = { latitude: string; longitude: string };
const DEF_COORDS: CoordForm[] = [{ latitude: '-6.200', longitude: '106.816' }, { latitude: '-6.200', longitude: '106.826' }, { latitude: '-6.210', longitude: '106.826' }, { latitude: '-6.210', longitude: '106.816' }];

interface FormState { id: string; name: string; location: string; area: string; ownerId: string; description: string; plantDate: string; coordinates: CoordForm[]; }
const EMPTY: FormState = { id: '', name: '', location: '', area: '', ownerId: '', description: '', plantDate: '', coordinates: DEF_COORDS };

export default function PlantationsPage() {
  const [plantations, setPlantations] = useState<Plantation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'list'|'form'|'manage'>('list');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY, ownerId: authService.getUserInfo()?.id || '' });
  const [ownerFilter, setOwnerFilter] = useState('');
  const [assignment, setAssignment] = useState({ plantationId: '', mandorId: '' });
  const [transfer, setTransfer] = useState({ mandorId: '', fromPlantationId: '', toPlantationId: '' });

  const summary = useMemo(() => ({
    total: plantations.length,
    totalArea: plantations.reduce((s, p) => s + p.area, 0),
    withMandor: plantations.filter(p => p.mandorId).length,
  }), [plantations]);

  const load = useCallback(async (owner = '') => {
    try {
      setLoading(true);
      const data = owner ? await plantationService.getByOwner(owner) : await plantationService.getAll();
      setPlantations(data); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat plantasi'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
      setSuccess(editing ? 'Plantasi diperbarui!' : 'Plantasi berhasil dibuat!');
      resetForm(); await load(ownerFilter);
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal simpan plantasi'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: EntityId, name: string) => {
    if (!confirm(`Hapus kebun "${name}"?`)) return;
    try { await plantationService.delete(id); setSuccess('Plantasi dihapus'); await load(ownerFilter); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal hapus'); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await plantationService.assignMandor(assignment.plantationId, { mandorId: assignment.mandorId }); setSuccess('Mandor berhasil ditugaskan!'); setAssignment({ plantationId: '', mandorId: '' }); await load(ownerFilter); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal assign mandor'); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await plantationService.transferMandor({ mandorId: transfer.mandorId, fromPlantationId: transfer.fromPlantationId, toPlantationId: transfer.toPlantationId }); setSuccess('Mandor berhasil dipindahkan!'); setTransfer({ mandorId: '', fromPlantationId: '', toPlantationId: '' }); await load(ownerFilter); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal transfer mandor'); }
  };

  const updateCoord = (i: number, field: 'latitude' | 'longitude', val: string) =>
    setForm(f => ({ ...f, coordinates: f.coordinates.map((c, ci) => ci === i ? { ...c, [field]: val } : c) }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap gap-4 items-start justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-white">🌴 Plantation Management</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola kebun sawit, koordinat, dan penugasan mandor</p>
        </div>
        <button onClick={() => load()} className="btn-ghost">↻ Refresh</button>
      </div>

      {error && <div className="alert-error"><span>⚠️</span><span>{error}</span><button onClick={() => setError('')} className="ml-auto">✕</button></div>}
      {success && <div className="alert-success"><span>✅</span><span>{success}</span><button onClick={() => setSuccess('')} className="ml-auto">✕</button></div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 stagger-children">
        {[
          { label: 'Total Kebun', value: summary.total, icon: '🌴' },
          { label: 'Luas Total', value: `${summary.totalArea.toLocaleString('id-ID')} ha`, icon: '📐' },
          { label: 'Dengan Mandor', value: summary.withMandor, icon: '👷' },
        ].map(c => (
          <div key={c.label} className="stat-card animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2"><span>{c.icon}</span></div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-white/[0.06]">
          {(['list','form','manage'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); if (t !== 'form') { setEditing(false); setForm({ ...EMPTY, ownerId: authService.getUserInfo()?.id || '' }); } }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {t === 'list' ? '🌴 Daftar Kebun' : t === 'form' ? (editing ? '✏️ Edit' : '+ Tambah') : '⚙️ Kelola Mandor'}
            </button>
          ))}
        </div>
        {tab === 'list' && (
          <form onSubmit={e => { e.preventDefault(); void load(ownerFilter); }} className="flex gap-2">
            <input type="text" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} placeholder="Filter Owner ID..." className="ms-input w-48" />
            <button type="submit" className="btn-primary">Filter</button>
            <button type="button" onClick={() => { setOwnerFilter(''); void load(''); }} className="btn-ghost">Reset</button>
          </form>
        )}
      </div>

      {/* List Tab */}
      {tab === 'list' && (
        loading ? (
          <div className="glass-card p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
            Memuat data kebun...
          </div>
        ) : plantations.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-3">🌴</div>
            <p className="font-medium text-slate-400">Belum ada data kebun sawit</p>
            <button onClick={() => setTab('form')} className="btn-primary mt-4">+ Tambah Kebun Pertama</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
            {plantations.map(p => (
              <div key={p.id} className="glass-card p-5 hover:border-green-500/20 transition-all hover:-translate-y-0.5 animate-fade-in-up">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-white">{p.name}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{p.code || `ID ${p.id}`}</p>
                  </div>
                  <span className="badge badge-green">{p.area} ha</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                  <div className="flex gap-2"><span>📍</span><span>{p.location}</span></div>
                  <div className="flex gap-2"><span>👷</span><span>Mandor: <span className={p.mandorId ? 'text-green-400 font-mono' : 'text-slate-600'}>{p.mandorId ? p.mandorId.slice(0, 12) + '...' : 'Belum ditugaskan'}</span></span></div>
                  <div className="flex gap-2"><span>📅</span><span>{fmt(p.plantDate)}</span></div>
                  {p.coordinates && p.coordinates.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span>🗺️</span>
                      <span className="font-mono text-[10px] text-slate-600">{p.coordinates.map(c => `(${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)})`).join(' → ')}</span>
                    </div>
                  )}
                  {p.description && <div className="flex gap-2"><span>📝</span><span className="line-clamp-2">{p.description}</span></div>}
                </div>
                <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                  <button onClick={() => openEdit(p)} className="flex-1 btn-secondary text-xs py-1.5 justify-center">✏️ Edit</button>
                  <button onClick={() => handleDelete(p.id, p.name)} className="btn-danger text-xs px-3 py-1.5">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Form Tab */}
      {tab === 'form' && (
        <div className="glass-card p-6 max-w-2xl">
          <h2 className="section-title mb-5">{editing ? `Edit: ${form.name}` : 'Tambah Kebun Baru'}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nama Kebun</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="ms-input" placeholder="Kebun Blok A" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Lokasi</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="ms-input" placeholder="Kalimantan Selatan" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Luas (hektare)</label>
                <input type="number" step="0.01" min="0.01" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className="ms-input" placeholder="25.5" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Owner ID</label>
                <input type="text" value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })} className="ms-input font-mono" placeholder="UUID" disabled={editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Tanggal Tanam</label>
                <input type="datetime-local" value={form.plantDate} onChange={e => setForm({ ...form, plantDate: e.target.value })} className="ms-input" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Deskripsi</label>
              <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="ms-input resize-none" placeholder="Deskripsi kebun..." />
            </div>

            {/* Coordinates */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Koordinat 4 Sudut (Latitude, Longitude)</label>
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
                {saving ? 'Menyimpan...' : editing ? '💾 Update Kebun' : '🌴 Buat Kebun'}
              </button>
              <button type="button" onClick={resetForm} className="btn-ghost px-5">Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Mandor Tab */}
      {tab === 'manage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          <div className="glass-card p-5">
            <h3 className="font-bold text-white mb-1">👷 Assign Mandor ke Kebun</h3>
            <p className="text-xs text-slate-500 mb-4">Tugaskan seorang Mandor untuk mengawasi sebuah kebun sawit</p>
            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Plantation ID</label>
                <input type="number" value={assignment.plantationId} onChange={e => setAssignment({ ...assignment, plantationId: e.target.value })} className="ms-input" placeholder="ID kebun" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Mandor ID (UUID)</label>
                <input type="text" value={assignment.mandorId} onChange={e => setAssignment({ ...assignment, mandorId: e.target.value })} className="ms-input font-mono" placeholder="UUID mandor" required />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Assign Mandor</button>
            </form>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-bold text-white mb-1">🔄 Transfer Mandor</h3>
            <p className="text-xs text-slate-500 mb-4">Pindahkan Mandor dari satu kebun ke kebun lain</p>
            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Mandor ID (UUID)</label>
                <input type="text" value={transfer.mandorId} onChange={e => setTransfer({ ...transfer, mandorId: e.target.value })} className="ms-input font-mono" placeholder="UUID mandor" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Dari Kebun ID</label>
                <input type="number" value={transfer.fromPlantationId} onChange={e => setTransfer({ ...transfer, fromPlantationId: e.target.value })} className="ms-input" placeholder="ID kebun asal" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Ke Kebun ID</label>
                <input type="number" value={transfer.toPlantationId} onChange={e => setTransfer({ ...transfer, toPlantationId: e.target.value })} className="ms-input" placeholder="ID kebun tujuan" required />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Transfer Mandor</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
