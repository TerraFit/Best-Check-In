// src/components/dashboard/CheckinsTable.tsx

interface Booking {
  id?: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  guest_country?: string
  guest_province?: string
  guest_city?: string
  guest_id_number?: string
  check_in_date?: string
  nights?: number
  total_amount?: number
  booking_source?: string
  referral_source?: string
  status?: string
}

interface CheckinsTableProps {
  bookings: Booking[]
  loading: boolean
  getStatusBadge: (status: string | undefined) => string
}

export function CheckinsTable({ bookings, loading, getStatusBadge }: CheckinsTableProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading bookings...</p>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No check-ins match your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nights</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {bookings.map((booking, index) => (
            <tr key={booking.id || index} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {booking.guest_name || 'N/A'}
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                <div>{booking.guest_email || 'N/A'}</div>
                <div className="text-xs">{booking.guest_phone || 'N/A'}</div>
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                <div>{booking.guest_country || 'N/A'}</div>
                <div className="text-xs">{booking.guest_province || ''} {booking.guest_city || ''}</div>
              </td>
              <td className="px-4 py-4 text-sm font-mono text-gray-500">
                {booking.guest_id_number ? (
                  <span className="cursor-help">
                    {booking.guest_id_number.substring(0, 8)}...
                  </span>
                ) : 'N/A'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {booking.check_in_date || 'N/A'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                {booking.nights || 1}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                R {(booking.total_amount || 0).toLocaleString()}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {(booking.booking_source || booking.referral_source || 'N/A').replace(/\.$/, '').trim()}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(booking.status)}`}>
                  {booking.status || 'pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
