'use client';

import Link from 'next/link';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

function DashboardHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div>
          <Link href="/dashboard" className="text-2xl font-bold text-green-800 hover:text-green-900">
            MySawit Dashboard
          </Link>
          <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings"
            className="px-4 py-2 text-gray-600 hover:text-green-700 transition-colors"
          >
            Settings
          </Link>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        {children}
      </div>
    </AuthProvider>
  );
}
