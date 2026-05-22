'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { UserDetailResponse } from '@/types';

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  MANDOR: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  BURUH: 'bg-green-500/10 text-green-400 border-green-500/20',
  SUPIR: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="border-b border-white/[0.06] py-3 last:border-0">
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-200 break-words">{value || '-'}</dd>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError('');
        setUser(await adminService.getUserById(userId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user detail');
      } finally {
        setLoading(false);
      }
    };

    void loadUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-5xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">Loading user detail...</div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in max-w-5xl mx-auto space-y-6">
      <header className="page-heading">
        <div>
          <Link href="/admin/users" className="page-eyebrow inline-flex hover:text-green-300">
            Pengguna
          </Link>
          <h1 className="text-2xl font-bold text-white mt-1">
            {user?.name || user?.username || 'User Detail'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{user?.email || userId}</p>
        </div>
        <Link href="/admin/users" className="btn-secondary">
          Back to Users
        </Link>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {!error && user && (
        <>
          <section className="surface-panel p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-green-900/40 border border-green-500/20 flex items-center justify-center text-xl font-bold text-green-300">
                  {(user.name || user.username || user.email || '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{user.name || user.username}</h2>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
              </div>
              <span className={`self-start md:self-center text-xs font-bold px-3 py-1 rounded-full border ${roleBadgeClass[user.role] || 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                {user.role}
              </span>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="surface-panel p-6">
              <h2 className="section-title mb-3">Informasi Akun</h2>
              <dl>
                <DetailRow label="User ID" value={user.id} />
                <DetailRow label="Username" value={user.username} />
                <DetailRow label="Nama" value={user.name} />
                <DetailRow label="Email" value={user.email} />
                <DetailRow label="Dibuat" value={formatDate(user.createdAt)} />
              </dl>
            </section>

            <section className="surface-panel p-6">
              <h2 className="section-title mb-3">Akses dan Assignment</h2>
              <dl>
                <DetailRow label="Metode Login" value={[
                  user.hasPassword ? 'Password' : '',
                  user.googleLinked ? 'Google' : '',
                ].filter(Boolean).join(', ') || 'Belum ada'} />
                <DetailRow label="Google Linked" value={user.googleLinked ? 'Ya' : 'Tidak'} />
                <DetailRow label="Mandor ID" value={user.mandorId} />
                <DetailRow label="Kebun ID" value={user.kebunId} />
                <DetailRow label="Nomor Sertifikasi" value={user.certificationNumber} />
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
