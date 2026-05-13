'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authService } from '@/services/auth.service';

type RegistrableRole = 'BURUH' | 'MANDOR' | 'SUPIR';

export default function RegisterPage() {
  const router = useRouter();
  const [isGoogleMode, setIsGoogleMode] = useState(false);

  // Shared fields
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<RegistrableRole | ''>('');
  const [certificationNumber, setCertificationNumber] = useState('');

  // Standard mode fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isGoogleFormValid =
    username.trim().length >= 3 &&
    role !== '' &&
    (role !== 'MANDOR' || certificationNumber.trim().length > 0);

  const handleStandardSubmit = async (e: FormEvent) => {
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

    if (!role) {
      setError('Please select a role');
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        username,
        email,
        password,
        role: role as RegistrableRole,
        ...(role === 'MANDOR' ? { certificationNumber } : {}),
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
        role: role as RegistrableRole,
        ...(role === 'MANDOR' ? { certificationNumber } : {}),
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setRole('');
    setCertificationNumber('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">Create Account</h1>
          <p className="text-gray-600 mt-2">Register for MySawit</p>
        </div>

        {/* Mode Toggle */}
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
            Register with Email
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
            Register with Google
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!isGoogleMode ? (
          /* ===== Standard Email Registration ===== */
          <form onSubmit={handleStandardSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Choose a username"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as RegistrableRole | '');
                  if (e.target.value !== 'MANDOR') setCertificationNumber('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                required
              >
                <option value="">Select a role</option>
                <option value="BURUH">Buruh (Worker)</option>
                <option value="MANDOR">Mandor (Supervisor)</option>
                <option value="SUPIR">Supir (Driver)</option>
              </select>
            </div>

            {role === 'MANDOR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certification Number</label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => setCertificationNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter certification number"
                  required
                  maxLength={50}
                />
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
          /* ===== Google Registration Mode ===== */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Choose a username"
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as RegistrableRole | '');
                  if (e.target.value !== 'MANDOR') setCertificationNumber('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                <option value="">Select a role</option>
                <option value="BURUH">Buruh (Worker)</option>
                <option value="MANDOR">Mandor (Supervisor)</option>
                <option value="SUPIR">Supir (Driver)</option>
              </select>
            </div>

            {role === 'MANDOR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certification Number</label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => setCertificationNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter certification number"
                  maxLength={50}
                />
              </div>
            )}

            <div className="pt-2">
              {isGoogleFormValid ? (
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-up failed')}
                    text="signup_with"
                    shape="rectangular"
                    width="100%"
                  />
                </div>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-full px-4 py-3 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#9CA3AF" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#9CA3AF" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#9CA3AF" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#9CA3AF" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign up with Google
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Please fill in username and role above to enable Google Sign-Up
                  </p>
                </div>
              )}
            </div>
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
