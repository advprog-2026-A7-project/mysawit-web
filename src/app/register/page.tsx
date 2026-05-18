'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { UserRole } from '@/types';

const roles: UserRole[] = ['BURUH', 'MANDOR', 'SUPIR', 'ADMIN'];
const roleLabels: Record<UserRole, string> = {
  BURUH: 'Pekerja Panen',
  MANDOR: 'Mandor',
  SUPIR: 'Supir',
  ADMIN: 'Admin',
};
const fieldClassName = 'ms-input';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('BURUH');
  const [certificationNumber, setCertificationNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Konfirmasi password belum sama');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        username,
        email,
        password,
        role,
        certificationNumber: certificationNumber || undefined,
        mandorId: undefined,
        kebunId: undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="w-full max-w-lg">
        <div className="auth-panel w-full p-6 md:p-8">
          <div className="mb-6 text-center">
            <Link href="/" className="page-eyebrow inline-flex hover:text-green-300">
              MySawit
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-white">Daftar Akun</h1>
            <p className="text-slate-400 mt-2">Buat akses untuk operasional kebun</p>
          </div>

          {error && (
            <div className="alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-sm">Nama Pengguna</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClassName}
                placeholder="contoh: budi.mandor"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="label-sm">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClassName}
                placeholder="nama@email.com"
                required
              />
            </div>

            <div>
              <label className="label-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClassName}
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="label-sm">Konfirmasi Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldClassName}
                placeholder="Ulangi password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="label-sm">Daftar Sebagai</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className={fieldClassName}
              >
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
            </div>

            {(role === 'MANDOR' || role === 'SUPIR') && (
              <div>
                <label className="label-sm">Nomor Sertifikasi</label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => setCertificationNumber(e.target.value)}
                  className={fieldClassName}
                  placeholder="Opsional"
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'Membuat akun...' : 'Daftar'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-green-300 hover:text-green-200 font-semibold">
              Masuk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
