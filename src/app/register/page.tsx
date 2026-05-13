'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authService } from '@/services/auth.service';

type RegistrableRole = 'BURUH' | 'MANDOR' | 'SUPIR';

const roles: RegistrableRole[] = ['BURUH', 'MANDOR', 'SUPIR'];
const fieldClassName =
  'w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent';

export default function RegisterPage() {
  const router = useRouter();
  const [isGoogleMode, setIsGoogleMode] = useState(false);

  // Shared fields
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<RegistrableRole>('BURUH');
  const [certificationNumber, setCertificationNumber] = useState('');
  const [mandorId, setMandorId] = useState('');
  const [kebunId, setKebunId] = useState('');

  // Email-mode-only fields
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
    setMandorId('');
    setKebunId('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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
        mandorId: mandorId || undefined,
        kebunId: kebunId || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-up failed: no credential received');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authService.googleLogin({
        idToken: credentialResponse.credential,
        username,
        role,
        ...(role === 'MANDOR' ? { certificationNumber } : {}),
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">Create Account</h1>
          <p className="text-gray-600 mt-2">Register for MySawit</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setIsGoogleMode(false); resetForm(); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isGoogleMode
                ? 'bg-white text-green-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign up with Email
          </button>
          <button
            type="button"
            onClick={() => { setIsGoogleMode(true); resetForm(); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isGoogleMode
                ? 'bg-white text-green-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign up with Google
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!isGoogleMode ? (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClassName}
                placeholder="Choose a username"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClassName}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClassName}
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldClassName}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RegistrableRole)}
                className={fieldClassName}
              >
                {roles.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {(role === 'MANDOR' || role === 'SUPIR') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certification Number
                </label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => setCertificationNumber(e.target.value)}
                  className={fieldClassName}
                  placeholder="Enter certification number"
                />
              </div>
            )}

            {role === 'BURUH' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mandor ID</label>
                  <input
                    type="text"
                    value={mandorId}
                    onChange={(e) => setMandorId(e.target.value)}
                    className={fieldClassName}
                    placeholder="Optional mandor ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kebun ID</label>
                  <input
                    type="text"
                    value={kebunId}
                    onChange={(e) => setKebunId(e.target.value)}
                    className={fieldClassName}
                    placeholder="Optional kebun ID"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClassName}
                placeholder="Choose a username"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RegistrableRole)}
                className={fieldClassName}
              >
                {roles.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {role === 'MANDOR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certification Number
                </label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => setCertificationNumber(e.target.value)}
                  className={fieldClassName}
                  placeholder="Enter certification number"
                  required
                />
              </div>
            )}

            <p className="text-sm text-gray-600">
              Fill in your details above, then continue with Google to finish creating your account.
            </p>

            {loading ? (
              <p className="text-sm text-gray-500 text-center">Creating account...</p>
            ) : (
              <div className={isGoogleFormValid ? '' : 'opacity-50 pointer-events-none'}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google authentication failed')}
                  text="signup_with"
                  shape="rectangular"
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
