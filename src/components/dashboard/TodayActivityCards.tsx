import { useTranslation } from '../../i18n';
import { getRoomDisplayName } from '../../services/roomDisplayService';

interface Guest {
  id: string
  guest_name: string
  guest_phone?: string
  guest_country?: string
  room_id?: string | null
  room_number?: number | string | null
  room_name?: string | null
  onClick?: () => void
  food_restrictions?: Record<string, unknown>
}

interface TodayActivityCardsProps {
  arrivals: Guest[]
  stayovers: Guest[]
  checkouts: Guest[]
}

/** Only show room when assigned; always use shared display helper. */
function formatGuestRoom(guest: Guest): string | null {
  if (guest.room_number === null || guest.room_number === undefined || guest.room_number === '') {
    return null;
  }
  const n =
    typeof guest.room_number === 'string'
      ? parseInt(guest.room_number, 10)
      : guest.room_number;
  if (Number.isNaN(n)) return null;
  return getRoomDisplayName({
    room_number: n,
    room_name: guest.room_name,
  });
}

export function TodayActivityCards({ arrivals, stayovers, checkouts }: TodayActivityCardsProps) {
  const { t } = useTranslation();

  const hasDietaryRestrictions = (guest: Guest): boolean => {
    const restrictions = guest.food_restrictions || {};
    return Object.entries(restrictions).some(([key, val]) => val === true && key !== 'other_text');
  };

  const renderGuestList = (guests: Guest[], title: string, bgColor: string, icon: JSX.Element) => (
    <div className={`bg-white rounded-lg shadow overflow-hidden border-l-4 ${bgColor}`}>
      <div className={`px-6 py-4 ${bgColor.replace('border-', 'bg-').replace('-500', '-50')}`}>
        <h3 className={`font-semibold ${bgColor.replace('border-', 'text-').replace('-500', '-800')} flex items-center gap-2`}>
          {icon}
          {title}
        </h3>
      </div>
      <div className="p-4">
        {guests.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            {title === 'Arrivals' && t('dashboard_no_arrivals')}
            {title === 'Stayovers' && t('dashboard_no_stayovers')}
            {title === 'Check-outs' && t('dashboard_no_checkouts')}
          </p>
        ) : (
          <div className="space-y-2">
            {guests.map(guest => {
              const roomLabel = formatGuestRoom(guest);
              return (
                <div 
                  key={guest.id} 
                  className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => guest.onClick?.()}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{guest.guest_name}</p>
                      {hasDietaryRestrictions(guest) && (
                        <span className="text-amber-500 text-sm flex-shrink-0" title="Has dietary restrictions">
                          ⚠️
                        </span>
                      )}
                    </div>
                    {guest.guest_country && (
                      <p className="text-xs text-gray-500 truncate">{guest.guest_country}</p>
                    )}
                    {roomLabel && (
                      <p className="text-xs text-gray-600 mt-0.5 truncate">
                        🏨 {roomLabel}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <p className="text-xs text-gray-500 hidden sm:block">{guest.guest_phone}</p>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {renderGuestList(
        arrivals, 
        'Arrivals', 
        'border-green-500',
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
      
      {renderGuestList(
        stayovers, 
        'Stayovers', 
        'border-blue-500',
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )}
      
      {renderGuestList(
        checkouts, 
        'Check-outs', 
        'border-orange-500',
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      )}
    </div>
  );
}
