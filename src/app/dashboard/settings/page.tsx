'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/contexts/auth-context';

export default function SettingsPage() {
  const { user } = useAuth();

  const [googleLinked, setGoogleLinked] = useState(user?.googleLinked ?? false);
  const [hasPassword, setHasPassword] = useState(user?.hasPassword ?? false);

  // Password form
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Google linking
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleSuccess, setGoogleSuccess] = useState('');

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await authService.setPassword(password);
      setHasPassword(true);
      setPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password set successfully.');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleGoogleLink = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setGoogleError('Failed to get Google credential');
      return;
    }

    setGoogleError('');
    setGoogleLoading(true);

    try {
      await authService.linkGoogle(credentialResponse.credential);
      setGoogleLinked(true);
      setGoogleSuccess('Google account linked successfully.');
      setTimeout(() => setGoogleSuccess(''), 3000);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Failed to link Google account');
    } finally {
      setGoogleLoading(false);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    BURUH: 'Buruh (Worker)',
    MANDOR: 'Mandor (Supervisor)',
    SUPIR: 'Supir (Driver)',
    ADMIN: 'Administrator',
  };

  return (
    <>
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-green-800">Account Settings</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Account Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-500">Username</span>
              <p className="text-gray-900">{user?.username}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Email</span>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Role</span>
              <p className="text-gray-900">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
          </div>
        </div>

        {/* Google Account Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Google Account</h2>

          {googleError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{googleError}</div>
          )}
          {googleSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">{googleSuccess}</div>
          )}

          {googleLinked ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Google account linked</p>
                <p className="text-xs text-gray-500">You can sign in with Google</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Link your Google account to enable Google Sign-In.
              </p>
              {googleLoading ? (
                <p className="text-sm text-gray-500">Linking...</p>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleLink}
                  onError={() => setGoogleError('Google authentication failed')}
                  text="continue_with"
                  shape="rectangular"
                />
              )}
            </div>
          )}
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Password</h2>

          {passwordError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{passwordError}</div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">{passwordSuccess}</div>
          )}

          {hasPassword ? (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Password is set</p>
                <p className="text-xs text-gray-500">You can sign in with email and password</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">
              Set a password to enable email/password sign-in.
            </p>
          )}

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {hasPassword ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter password"
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
                placeholder="Confirm password"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Saving...' : hasPassword ? 'Update Password' : 'Set Password'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
