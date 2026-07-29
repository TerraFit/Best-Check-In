// src/pages/tabs/RoomsTab.tsx
// Dashboard tab entry for Room Operations — navigates to dedicated Room Settings

import { useNavigate } from 'react-router-dom';

interface RoomsTabProps {
  businessId: string;
}

export function RoomsTab({ businessId }: RoomsTabProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center max-w-xl mx-auto">
      <div className="text-4xl mb-4">🛏️</div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Room Operations</h2>
      <p className="text-sm text-gray-500 mb-6">
        Manage your property&apos;s rooms, names, types, and inventory. Room allocation for guests is
        available from each guest&apos;s details panel.
      </p>
      <button
        type="button"
        onClick={() => navigate('/business/rooms')}
        className="px-5 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
      >
        Open Room Settings
      </button>
      {!businessId && (
        <p className="mt-4 text-xs text-red-500">Business ID not available.</p>
      )}
    </div>
  );
}

export default RoomsTab;
