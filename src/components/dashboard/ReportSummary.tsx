// src/components/dashboard/ReportSummary.tsx

interface Booking {
  total_amount?: number
  nights?: number
}

interface ReportSummaryProps {
  bookings: Booking[]
  onExport: () => void
}

export function ReportSummary({ bookings, onExport }: ReportSummaryProps) {
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const averageStay = bookings.length > 0 
    ? (bookings.reduce((sum, b) => sum + (b.nights || 1), 0) / bookings.length).toFixed(1)
    : '0'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">R {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Average Stay</p>
          <p className="text-2xl font-bold text-gray-900">{averageStay} nights</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Export Data</p>
          <button
            onClick={onExport}
            className="mt-2 px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
