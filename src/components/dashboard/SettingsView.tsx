// src/components/dashboard/SettingsView.tsx

interface SettingsViewProps {
  business: {
    id?: string;
    trading_name?: string;
    registered_name?: string;
    slogan?: string;
    email?: string;
    secondary_email?: string;
    phone?: string;
    mobile_phone?: string;
    secondary_phone?: string;
    total_rooms?: number;
    avg_price?: number;
    logo_url?: string;
    directors?: any[];
  } | null;
  businessId: string;
  onEdit: () => void;
  onRequestChange: (field: string, currentValue: string, label: string) => void;
}

export function SettingsView({ business, businessId, onEdit, onRequestChange }: SettingsViewProps) {
  if (!business) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No business data available</p>
        <button onClick={onEdit} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          Add Business Information
        </button>
      </div>
    );
  }

  const renderField = (label: string, value: string | number | undefined, field: string, locked: boolean = true) => {
    const displayValue = value || 'Not set';
    const isLocked = locked && field !== 'email' && field !== 'phone' && field !== 'mobile_phone' && field !== 'secondary_email' && field !== 'secondary_phone';
    
    return (
      <div className="flex justify-between items-center py-2 border-b border-gray-100">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-900">{displayValue}</p>
        </div>
        {isLocked ? (
          <button
            onClick={() => onRequestChange(field, String(value || ''), label)}
            className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Request Change
          </button>
        ) : (
          <span className="text-xs text-green-500">Editable</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">Business Information</p>
          <div className="space-y-1 text-sm">
            {renderField('Business ID', businessId, 'id', false)}
            {renderField('Registered Name', business.registered_name, 'registered_name', true)}
            {renderField('Trading Name', business.trading_name, 'trading_name', true)}
            {renderField('Slogan', business.slogan, 'slogan', true)}
            {renderField('Email', business.email, 'email', false)}
            {renderField('Secondary Email', business.secondary_email, 'secondary_email', false)}
            {renderField('Phone', business.phone, 'phone', false)}
            {renderField('Mobile Phone', business.mobile_phone, 'mobile_phone', false)}
            {renderField('Secondary Phone', business.secondary_phone, 'secondary_phone', false)}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">Property Details</p>
          <div className="space-y-1 text-sm">
            {renderField('Total Rooms', business.total_rooms, 'total_rooms', true)}
            {renderField('Average Room Price', business.avg_price ? `R ${business.avg_price.toLocaleString()}` : 'Not set', 'avg_price', true)}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Directors / Owners</p>
            {business.directors && business.directors.length > 0 ? (
              <div className="space-y-2">
                {business.directors.map((director, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium text-gray-900">{director.name}</p>
                    <p className="text-xs text-gray-500">ID: {director.id_number || 'N/A'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No directors listed</p>
            )}
            <button
              onClick={() => onRequestChange('directors', JSON.stringify(business.directors || []), 'Directors')}
              className="mt-2 text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Request Change
            </button>
          </div>
        </div>
      </div>
      
      {business.logo_url && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Current Logo</p>
          <img src={business.logo_url} alt="Business Logo" className="h-20 w-auto border rounded-lg p-2 bg-white" />
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Edit Profile (Email, Phone)
        </button>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p>🔒 <strong>Locked fields</strong> require approval from Super Admin. Click "Request Change" to submit a request.</p>
      </div>
    </div>
  );
}
