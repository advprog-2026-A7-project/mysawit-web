'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authService } from '@/services/auth.service';
import { UserRole } from '@/types';

const roles: UserRole[] = ['BURUH', 'MANDOR', 'SUPIR', 'ADMIN'];
const fieldClassName =
  'w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent';

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
  const [role, setRole] = useState<UserRole>('BURUH');
  const [certificationNumber, setCertificationNumber] = useState('');
  const [mandorId, setMandorId] = useState('');
  const [kebunId, setKebunId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={fieldClassName}
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mandor ID
                </label>
                <input
                  type="text"
                  value={mandorId}
                  onChange={(e) => setMandorId(e.target.value)}
                  className={fieldClassName}
                  placeholder="Optional mandor ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kebun ID
                </label>
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
