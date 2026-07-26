// src/services/housekeepingService.ts
// ✅ Complete housekeeping scheduling engine

export type HousekeepingPolicy = 'standard' | 'daily_full_service' | 'eco' | 'custom';
export type TaskType = 'refresh' | 'full_service' | 'none';

export interface HousekeepingTaskResult {
  taskType: TaskType;
  stayNight: number;
  isCheckout: boolean;
  reason: string;
}

export interface HousekeepingSettings {
  policy: HousekeepingPolicy;
  customInterval: number;
}

export interface CalculateTaskParams {
  checkInDate: Date | string;
  checkOutDate: Date | string;
  targetDate: Date | string;
  policy: HousekeepingPolicy;
  customInterval?: number;
}

/**
 * Calculate the housekeeping task for a specific night of a stay
 * 
 * @param checkInDate - Guest check-in date
 * @param checkOutDate - Guest check-out date  
 * @param targetDate - The date to calculate the task for
 * @param policy - The property's housekeeping policy
 * @param customInterval - Custom interval for 'custom' policy (2-5)
 * @returns Object with taskType, stayNight, isCheckout, reason
 */
export function calculateHousekeepingTask({
  checkInDate,
  checkOutDate,
  targetDate,
  policy,
  customInterval = 3
}: CalculateTaskParams): HousekeepingTaskResult {
  // Parse dates
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const target = new Date(targetDate);

  // Normalize dates to start of day for accurate comparison
  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  // Check if target is before check-in or after check-out (excluding check-out day)
  if (target < checkIn) {
    return { taskType: 'none', stayNight: 0, isCheckout: false, reason: 'Before check-in' };
  }

  // Check if target is after check-out (including check-out day)
  if (target > checkOut) {
    return { taskType: 'none', stayNight: 0, isCheckout: false, reason: 'After check-out' };
  }

  // Calculate stay night number
  const diffTime = target.getTime() - checkIn.getTime();
  const stayNight = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const totalNights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Check if this is the check-out day
  const isCheckout = target.getTime() === checkOut.getTime();

  // For 1-night stays
  if (totalNights === 1) {
    if (isCheckout) {
      return {
        taskType: 'full_service',
        stayNight,
        isCheckout: true,
        reason: 'Check-out Full Service'
      };
    }
    return {
      taskType: 'none',
      stayNight,
      isCheckout: false,
      reason: '1-night stay, no stay-over service'
    };
  }

  // Last night before checkout - no stay-over service (checkout handled separately)
  const isLastStayNight = stayNight === totalNights;
  if (isLastStayNight) {
    return {
      taskType: 'none',
      stayNight,
      isCheckout: false,
      reason: 'Last stay night, no service (checkout will generate Full Service)'
    };
  }

  // Check if it's a checkout day
  if (isCheckout) {
    return {
      taskType: 'full_service',
      stayNight,
      isCheckout: true,
      reason: 'Check-out Full Service'
    };
  }

  // Calculate based on policy
  switch (policy) {
    case 'daily_full_service':
      return {
        taskType: 'full_service',
        stayNight,
        isCheckout: false,
        reason: 'Daily Full Service policy'
      };

    case 'eco':
    case 'standard':
      return calculateStandardEcoTask(stayNight, policy);

    case 'custom':
      return calculateCustomTask(stayNight, customInterval);

    default:
      return {
        taskType: 'none',
        stayNight,
        isCheckout: false,
        reason: 'Unknown policy'
      };
  }
}

/**
 * Calculate task for Standard or Eco policy
 */
function calculateStandardEcoTask(stayNight: number, policy: 'standard' | 'eco'): HousekeepingTaskResult {
  // Full Service every 3rd night
  if (stayNight % 3 === 0) {
    return {
      taskType: 'full_service',
      stayNight,
      isCheckout: false,
      reason: `Every 3rd night Full Service (Night ${stayNight})`
    };
  }

  // Refresh on other occupied nights
  return {
    taskType: 'refresh',
    stayNight,
    isCheckout: false,
    reason: `Refresh service (Night ${stayNight})`
  };
}

/**
 * Calculate task for Custom policy
 */
function calculateCustomTask(stayNight: number, interval: number): HousekeepingTaskResult {
  // Full Service on interval
  if (stayNight % interval === 0) {
    return {
      taskType: 'full_service',
      stayNight,
      isCheckout: false,
      reason: `Custom Full Service every ${interval} nights (Night ${stayNight})`
    };
  }

  // Refresh on other occupied nights
  return {
    taskType: 'refresh',
    stayNight,
    isCheckout: false,
    reason: `Refresh service (Night ${stayNight})`
  };
}

/**
 * Generate all housekeeping tasks for a stay
 */
export function generateTasksForStay(
  checkInDate: Date | string,
  checkOutDate: Date | string,
  policy: HousekeepingPolicy,
  customInterval: number = 3
): { date: Date; taskType: TaskType; stayNight: number; isCheckout: boolean }[] {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const tasks: { date: Date; taskType: TaskType; stayNight: number; isCheckout: boolean }[] = [];

  // Start from check-in date
  let current = new Date(checkIn);
  current.setHours(0, 0, 0, 0);

  // Generate tasks for each day from check-in to check-out
  while (current <= checkOut) {
    const result = calculateHousekeepingTask({
      checkInDate: checkIn,
      checkOutDate: checkOut,
      targetDate: current,
      policy,
      customInterval
    });

    if (result.taskType !== 'none') {
      tasks.push({
        date: new Date(current),
        taskType: result.taskType,
        stayNight: result.stayNight,
        isCheckout: result.isCheckout
      });
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return tasks;
}

/**
 * Get display text for task type
 */
export function getTaskDisplayText(taskType: TaskType): string {
  switch (taskType) {
    case 'refresh':
      return '✨ Refresh';
    case 'full_service':
      return '🧺 Full Service';
    default:
      return 'No Service';
  }
}

/**
 * Get icon for task type
 */
export function getTaskIcon(taskType: TaskType): string {
  switch (taskType) {
    case 'refresh':
      return '✨';
    case 'full_service':
      return '🧺';
    default:
      return '—';
  }
}

/**
 * Get color for task type
 */
export function getTaskColor(taskType: TaskType): string {
  switch (taskType) {
    case 'refresh':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'full_service':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-400 border-gray-200';
  }
}

/**
 * Get status display text
 */
export function getStatusDisplayText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return '✅ Completed';
    case 'skipped':
      return '⏭️ Skipped';
    case 'cancelled':
      return '❌ Cancelled';
    default:
      return status;
  }
}
