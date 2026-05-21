'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authService } from '@/services/auth.service';
import type { UserRole } from '@/types';

type RegistrableRole = Exclude<UserRole, 'ADMIN'>;

const roles: RegistrableRole[] = ['BURUH', 'MANDOR', 'SUPIR'];
const roleLabels: Record<RegistrableRole, string> = {
  BURUH: 'Pekerja Panen',
  MANDOR: 'Mandor',
  SUPIR: 'Supir',
};
const fieldClassName = 'ms-input';

export default function RegisterPage() {
  const router = useRouter();
  const [isGoogleMode, setIsGoogleMode] = useState(false);

  const [username, setUsername] = useState('');
  const [role, setRole] = useState<RegistrableRole>('BURUH');
  const [certificationNumber, setCertificationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isGoogleFormValid =
    username.trim().length >= 3 &&
    (role !== 'MANDOR' || certificationNumber.trim().length > 0);

  const resetForm = () => {
    setUsername('');
    setRole('BURUH');
    setCertificationNumber('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const setRegistrationMode = (nextIsGoogleMode: boolean) => {
    resetForm();
    setIsGoogleMode(nextIsGoogleMode);
  };

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (role === 'MANDOR' && certificationNumber.trim().length === 0) {
      setError('Nomor sertifikasi wajib diisi untuk Mandor');
      return;
    }

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
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        certificationNumber: certificationNumber.trim() || undefined,
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

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-up failed: no credential received');
      return;
    }

    if (!isGoogleFormValid) {
      setError(role === 'MANDOR'
        ? 'Isi username dan nomor sertifikasi Mandor terlebih dahulu'
        : 'Username minimal 3 karakter');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authService.googleLogin({
        idToken: credentialResponse.credential,
        username: username.trim(),
        role,
        ...(role === 'MANDOR' ? { certificationNumber: certificationNumber.trim() } : {}),
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google registration failed');
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

          <div className="mb-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-label="Sign up with Email"
              onClick={() => setRegistrationMode(false)}
              className={`tab-button justify-center ${!isGoogleMode ? 'active' : ''}`}
            >
              Email
            </button>
            <button
              type="button"
              aria-label="Sign up with Google"
              onClick={() => setRegistrationMode(true)}
              className={`tab-button justify-center ${isGoogleMode ? 'active' : ''}`}
            >
              Google
            </button>
          </div>

          {!isGoogleMode ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <AccountFields
                username={username}
                role={role}
                certificationNumber={certificationNumber}
                onUsernameChange={setUsername}
                onRoleChange={setRole}
                onCertificationNumberChange={setCertificationNumber}
              />

              <div>
                <label className="label-sm">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClassName}
                  placeholder="Enter your email, contoh: nama@email.com"
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

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? 'Membuat akun...' : 'Daftar'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <AccountFields
                username={username}
                role={role}
                certificationNumber={certificationNumber}
                onUsernameChange={setUsername}
                onRoleChange={setRole}
                onCertificationNumberChange={setCertificationNumber}
              />

              <div className="flex justify-center">
                {loading ? (
                  <div className="text-sm text-slate-400">Creating account...</div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google authentication failed')}
                  />
                )}
              </div>
            </div>
          )}

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

interface AccountFieldsProps {
  username: string;
  role: RegistrableRole;
  certificationNumber: string;
  onUsernameChange: (value: string) => void;
  onRoleChange: (value: RegistrableRole) => void;
  onCertificationNumberChange: (value: string) => void;
}

function AccountFields({
  username,
  role,
  certificationNumber,
  onUsernameChange,
  onRoleChange,
  onCertificationNumberChange,
}: AccountFieldsProps) {
  return (
    <>
      <div>
        <label className="label-sm">Nama Pengguna</label>
        <input
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className={fieldClassName}
          placeholder="Choose a username, contoh: budi.mandor"
          required
          minLength={3}
        />
      </div>

      <div>
        <label className="label-sm">Daftar Sebagai</label>
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value as RegistrableRole)}
          className={fieldClassName}
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {roleLabels[item]}
            </option>
          ))}
        </select>
      </div>

      {role === 'MANDOR' && (
        <div>
          <label className="label-sm">Nomor Sertifikasi</label>
          <input
            type="text"
            value={certificationNumber}
            onChange={(e) => onCertificationNumberChange(e.target.value)}
            className={fieldClassName}
            placeholder="Enter certification number, contoh: CERT-001"
            required
          />
        </div>
      )}
    </>
  );
}
