import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="text-center space-y-8 px-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-green-800">MySawit</h1>
          <p className="text-2xl text-green-600">Palm Oil Management System</p>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-600 max-w-md mx-auto">
            Comprehensive platform for managing palm oil plantations, harvest tracking, 
            shipment monitoring, and payroll management.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link 
            href="/login"
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Login
          </Link>
          <Link 
            href="/register"
            className="px-8 py-3 bg-white text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 transition-colors font-semibold"
          >
            Register
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8">
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🌴</div>
            <div className="font-semibold text-green-800">Plantations</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🌾</div>
            <div className="font-semibold text-green-800">Harvest</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🚚</div>
            <div className="font-semibold text-green-800">Shipment</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">💰</div>
            <div className="font-semibold text-green-800">Payroll</div>
          </div>
        </div>
      </div>
    </div>
  );
}
