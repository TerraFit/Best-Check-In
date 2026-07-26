// src/components/dashboard/TodayActivityCards.tsx
// ✅ COMPLETE: With housekeeping task icons on guest cards

import { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { getTaskDisplayInfo } from '../../services/housekeepingService';

interface Guest {
  id: string;
  guest_name: string;
  guest_phone?: string;
  onClick?: () => void;
  food_restrictions?: {
    vegetarian: boolean;
    vegan: boolean;
    halal: boolean;
    kosher: boolean;
    gluten_free: boolean;
    dairy_free: boolean;
    lactose_intolerant: boolean;
    nut_allergy: boolean;
    shellfish_allergy: boolean;
    egg_allergy: boolean;
    soy_allergy: boolean;
    pork_free: boolean;
    diabetic: boolean;
    no_seafood: boolean;
    carnivore?: boolean;
    other: boolean;
    other_text?: string;
  };
  room_number?: string;
  check_in_date?: string;
  check_out_date?: string;
  isCheckoutToday?: boolean;
  housekeeping_task?: {
    task_type: 'refresh' | 'full_service' | null;
    status: string;
  };
}

interface TodayActivityCardsProps {
  arrivals: Guest[];
  stayovers: Guest[];
  checkouts: Guest[];
  businessId?: string;
}

// Helper to check if a guest has dietary restrictions
const hasDietaryRestrictions = (guest: Guest): boolean => {
  const restrictions = guest.food_restrictions || {};
  return Object.entries(restrictions).some(([key, val]) => val === true && key !== 'other_text');
};

// Helper to get task icon display
const getTaskIconDisplay = (guest: Guest, isCheckout: boolean = false) => {
  // Checkout guests always show 🧺
  if (isCheckout) {
    return {
      icon: '🧺',
      label: 'Full Service (Checkout)',
      color: 'bg-red-100 text-red-700 border-red-200',
      description: 'Complete room service - strip all linen, clean thoroughly'
    };
  }

  const task = guest.housekeeping_task;
  if (!task || !task.task_type) return null;

  const info = getTaskDisplayInfo(task.task_type);
  return info;
};

export function TodayActivityCards({ arrivals, stayovers, checkouts, businessId }: TodayActivityCardsProps) {
  const { t } = useTranslation();
  const [taskMap, setTaskMap] = useState<Record<string, { task_type: string; status: string }>>({});
  const [loading, setLoading] = useState(false);

  // Fetch housekeeping tasks for today's guests
  useEffect(() => {
    const fetchTasks = async () => {
      if (!businessId) return;

      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(
          `/.netlify/functions/get-housekeeping-tasks?businessId=${businessId}&scheduledDate=${today}`
        );

        if (response.ok) {
          const data = await response.json();
          const tasks = data.data || [];

          // Create a map of booking_id → task
          const map: Record<string, { task_type: string; status: string }> = {};
          tasks.forEach((task: any) => {
            if (task.booking_id && task.task_type) {
              map[task.booking_id] = {
                task_type: task.task_type,
                status: task.status
              };
            }
          });
          setTaskMap(map);
        }
      } catch (error) {
        console.error('Error fetching housekeeping tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [businessId]);

  // Get task for a guest
  const getGuestTask = (guest: Guest) => {
    const task = taskMap[guest.id];
    if (!task) return null;

    return {
      task_type: task.task_type as 'refresh' | 'full_service',
      status: task.status
    };
  };

  const renderGuestList = (guests: Guest[], title: string, bgColor: string, icon: JSX.Element, isCheckoutList: boolean = false) => {
    // Enrich guests with housekeeping tasks
    const enrichedGuests = guests.map(guest => ({
      ...guest,
      housekeeping_task: getGuestTask(guest),
      isCheckoutToday: isCheckoutList
    }));

    return (
      <div className={`bg-white rounded-lg shadow overflow-hidden border-l-4 ${bgColor}`}>
        <div className={`px-6 py-4 ${bgColor.replace('border-', 'bg-').replace('-500', '-50')}`}>
          <h3 className={`font-semibold ${bgColor.replace('border-', 'text-').replace('-500', '-800')} flex items-center gap-2`}>
            {icon}
            {title}
            <span className="ml-auto text-xs font-normal text-stone-500">
              {guests.length} guest{guests.length !== 1 ? 's' : ''}
            </span>
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
              {enrichedGuests.map(guest => {
                const taskDisplay = getTaskIconDisplay(guest, isCheckoutList);
                const hasDietary = hasDietaryRestrictions(guest);

                return (
                  <div
                    key={guest.id}
                    className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => guest.onClick?.()}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {guest.guest_name}
                      </p>

                      {/* Housekeeping Task Icon */}
                      {taskDisplay && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${taskDisplay.color} border`}
                          title={`${taskDisplay.label}: ${taskDisplay.description}`}
                        >
                          {taskDisplay.icon} {taskDisplay.label}
                        </span>
                      )}

                      {/* Dietary Warning Icon */}
                      {hasDietary && (
                        <span className="text-amber-500 text-sm" title="Has dietary restrictions">
                          ⚠️
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {guest.room_number && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          #{guest.room_number}
                        </span>
                      )}
                      {guest.guest_phone && (
                        <p className="text-xs text-gray-500 hidden sm:block">{guest.guest_phone}</p>
                      )}
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
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {renderGuestList(
        arrivals,
        'Arrivals',
        'border-green-500',
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>,
        false
      )}

      {renderGuestList(
        stayovers,
        'Stayovers',
        'border-blue-500',
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
        </svg>,
        false
      )}

      {renderGuestList(
        checkouts,
        'Check-outs',
        'border-orange-500',
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>,
        true  // ✅ Checkout list always shows 🧺
      )}
    </div>
  );
}

export default TodayActivityCards;
