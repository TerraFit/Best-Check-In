// src/components/dashboard/SettingsView.tsx

interface SettingsViewProps {
  business: {
    trading_name?: string
    slogan?: string
    email?: string
    phone?: string
    total_rooms?: number
    avg_price?: number
    logo_url?: string
  } | null
  businessId: string
  onEdit: () => void
}

export function SettingsView({ business, businessId, onEdit }: SettingsViewProps) {
  if (!business) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Business Information</p>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Business ID:</span> {businessId}</div>
            <div><span className="text-gray-500">Trading Name:</span> {business.trading_name}</div>
            {business.slogan && <div><span className="text-gray-500">Slogan:</span> <span className="italic">{business.slogan}</span></div>}
            <div><span className="text-gray-500">Email:</span> {business.email}</div>
            <div><span className="text-gray-500">Phone:</span> {business.phone}</div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Property Details</p>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Total Rooms:</span> {business.total_rooms || 'Not set'}</div>
            <div><span className="text-gray-500">Average Room Price:</span> {business.avg_price ? `R ${business.avg_price.toLocaleString()}` : 'Not set'}</div>
          </div>
        </div>
      </div>
      
      {business.logo_url && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Current Logo</p>
          <img src={business.logo_url} alt="Business Logo" className="h-20 w-auto border rounded-lg p-2 bg-white" />
        </div>
      )}
      
      <button
        onClick={onEdit}
        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
      >
        Edit Profile
      </button>
    </div>
  )
}
