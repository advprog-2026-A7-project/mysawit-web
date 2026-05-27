'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authService } from '@/services/auth.service';
import { getPostAuthRedirectPath } from '@/lib/role-redirect';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedirect = (role: string) => {
    router.push(getPostAuthRedirectPath(role));
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      handleRedirect(response.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Login Google gagal: credential tidak diterima');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authService.googleLogin({ idToken: credentialResponse.credential });
      handleRedirect(response.role);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login Google gagal';
      if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('conflict')) {
        setError('Email ini sudah terdaftar dengan password. Masuk memakai email dan password, lalu hubungkan akun Google dari pengaturan.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Login Google gagal');
  };

  return (
    <div className="auth-shell">
      <section className="w-full max-w-md">
        <div className="auth-panel w-full p-8">
          <div className="mb-8 text-center">
            <Link href="/" className="page-eyebrow inline-flex hover:text-green-300">
              MySawit
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-white">Masuk</h1>
            <p className="text-slate-400 mt-2">Lanjutkan pekerjaan operasional kebun</p>
          </div>

          {error && (
            <div className="alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label-sm">
                Email
              </label>
              <input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ms-input"
                placeholder="nama@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label-sm">
                Kata Sandi
              </label>
              <input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ms-input"
                placeholder="Kata sandi"
                required
              />
            </div>

            <button type="submit" disabled={loading} data-testid="login-submit-button" className="btn-primary w-full justify-center py-3">
              {loading ? 'Masuk...' : 'Masuk'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#121418] px-2 text-slate-500">Atau masuk dengan</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
              />
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Belum punya akun?{' '}
            <Link href="/register" className="text-green-300 hover:text-green-200 font-semibold">
              Daftar
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
