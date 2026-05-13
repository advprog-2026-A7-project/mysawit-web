'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export default function DashboardPage() {
  const { isAdmin } = useAuth();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Plantations Module */}
        <Link
          href="/dashboard/plantations"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-5xl mb-4">🌴</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Plantations</h2>
          <p className="text-gray-600 text-sm">
            Manage palm oil plantations, track areas, and monitor ownership
          </p>
        </Link>

        {/* Harvest Module */}
        <Link
          href="/dashboard/harvests"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-5xl mb-4">🌾</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Harvests</h2>
          <p className="text-gray-600 text-sm">
            Track harvest records, quality, and production metrics
          </p>
        </Link>

        {/* Shipment Module */}
        <Link
          href="/dashboard/shipments"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-5xl mb-4">🚚</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Shipments</h2>
          <p className="text-gray-600 text-sm">
            Monitor shipment status, tracking, and delivery schedules
          </p>
        </Link>

        {/* Payroll Module */}
        <Link
          href="/dashboard/payroll"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-5xl mb-4">💰</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Payroll</h2>
          <p className="text-gray-600 text-sm">
            Manage employee payroll, salaries, and payment records
          </p>
        </Link>

        {/* Admin: User Management (ADMIN only) */}
        {isAdmin && (
          <Link
            href="/dashboard/admin/users"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-green-200"
          >
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">User Management</h2>
            <p className="text-gray-600 text-sm">
              Manage users, assign roles, and handle Mandor assignments
            </p>
          </Link>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">●</div>
            <div className="text-sm text-gray-600">Identity Service</div>
            <div className="text-xs text-green-600">Online</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">●</div>
            <div className="text-sm text-gray-600">Plantation Service</div>
            <div className="text-xs text-green-600">Online</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">●</div>
            <div className="text-sm text-gray-600">Harvest Service</div>
            <div className="text-xs text-green-600">Online</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">●</div>
            <div className="text-sm text-gray-600">Shipment Service</div>
            <div className="text-xs text-green-600">Online</div>
          </div>
        </div>
      </div>
    </main>
  );
}
