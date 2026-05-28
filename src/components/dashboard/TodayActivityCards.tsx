// src/components/dashboard/TodayActivityCards.tsx

interface Guest {
  id: string
  guest_name: string
  guest_phone?: string
}

interface TodayActivityCardsProps {
  arrivals: Guest[]
  stayovers: Guest[]
  checkouts: Guest[]
}

export function TodayActivityCards({ arrivals, stayovers, checkouts }: TodayActivityCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Arrivals Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-green-500">
        <div className="px-6 py-4 bg-green-50">
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Today's Arrivals
          </h3>
        </div>
        <div className="p-4">
          {arrivals.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No arrivals today</p>
          ) : (
            <div className="space-y-2">
              {arrivals.map(guest => (
                <div key={guest.id} className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{guest.guest_name}</p>
                    <p className="text-xs text-gray-500">{guest.guest_phone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stayovers Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-blue-500">
        <div className="px-6 py-4 bg-blue-50">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Current Stayovers
          </h3>
        </div>
        <div className="p-4">
          {stayovers.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No current stayovers</p>
          ) : (
            <div className="space-y-2">
              {stayovers.map(guest => (
                <div key={guest.id} className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{guest.guest_name}</p>
                    <p className="text-xs text-gray-500">{guest.guest_phone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkouts Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-orange-500">
        <div className="px-6 py-4 bg-orange-50">
          <h3 className="font-semibold text-orange-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Today's Check-outs
          </h3>
        </div>
        <div className="p-4">
          {checkouts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No check-outs today</p>
          ) : (
            <div className="space-y-2">
              {checkouts.map(guest => (
                <div key={guest.id} className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{guest.guest_name}</p>
                    <p className="text-xs text-gray-500">{guest.guest_phone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
