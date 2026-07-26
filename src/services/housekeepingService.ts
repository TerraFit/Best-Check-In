// src/services/housekeepingService.ts
// ✅ COMPLETE: Fully customizable housekeeping scheduling engine

export type HousekeepingPolicy = 'standard' | 'daily_full_service' | 'eco' | 'custom';
export type TaskType = 'refresh' | 'full_service' | 'none';

export interface HousekeepingTaskResult {
  taskType: TaskType;
  stayNight: number;
  isCheckout: boolean;
  reason: string;
}

export interface HousekeepingConfig {
  fullServiceFrequency: number;
  firstFullServiceDay: number;
  minNightsBeforeFullService: number;
  refreshOnLastNight: boolean;
  checkinDayService: 'none' | 'refresh' | 'full_service';
  policy: HousekeepingPolicy;
  customInterval: number;
}

export const DEFAULT_HOUSEKEEPING_CONFIG: HousekeepingConfig = {
  fullServiceFrequency: 3,
  firstFullServiceDay: 3,
  minNightsBeforeFullService: 3,
  refreshOnLastNight: true,
  checkinDayService: 'none',
  policy: 'standard',
  customInterval: 3
};

export function calculateFullServiceNights(
  totalNights: number,
  config: HousekeepingConfig
): number[] {
  if (totalNights < config.minNightsBeforeFullService) {
    return [];
  }

  const fullServiceNights: number[] = [];
  const { fullServiceFrequency, firstFullServiceDay } = config;

  if (firstFullServiceDay <= totalNights) {
    fullServiceNights.push(firstFullServiceDay);
  }

  let nextServiceNight = firstFullServiceDay + fullServiceFrequency;
  while (nextServiceNight < totalNights) {
    fullServiceNights.push(nextServiceNight);
    nextServiceNight += fullServiceFrequency;
  }

  return fullServiceNights;
}

export function getTotalNights(checkIn: Date, checkOut: Date): number {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getStayNight(checkIn: Date, target: Date): number {
  const diff = target.getTime() - checkIn.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function calculateHousekeepingTask(
  checkInDate: Date,
  checkOutDate: Date,
  targetDate: Date,
  config: HousekeepingConfig = DEFAULT_HOUSEKEEPING_CONFIG
): HousekeepingTaskResult {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const target = new Date(targetDate);

  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  if (target < checkIn) {
    return { taskType: 'none', stayNight: 0, isCheckout: false, reason: 'Before check-in' };
  }

  if (target > checkOut) {
    return { taskType: 'none', stayNight: 0, isCheckout: false, reason: 'After check-out' };
  }

  const totalNights = getTotalNights(checkIn, checkOut);
  const stayNight = getStayNight(checkIn, target);
  const isCheckin = target.getTime() === checkIn.getTime();
  const isCheckout = target.getTime() === checkOut.getTime();

  if (isCheckin) {
    if (config.checkinDayService === 'full_service') {
      return {
        taskType: 'full_service',
        stayNight,
        isCheckout: false,
        reason: 'Check-in Full Service (custom setting)'
      };
    }
    if (config.checkinDayService === 'refresh') {
      return {
        taskType: 'refresh',
        stayNight,
        isCheckout: false,
        reason: 'Check-in Refresh (custom setting)'
      };
    }
    return {
      taskType: 'none',
      stayNight,
      isCheckout: false,
      reason: 'Check-in day, no service'
    };
  }

  if (isCheckout) {
    return {
      taskType: 'full_service',
      stayNight,
      isCheckout: true,
      reason: 'Check-out Full Service'
    };
  }

  const isLastNight = stayNight === totalNights;
  if (isLastNight) {
    if (config.refreshOnLastNight) {
      return {
        taskType: 'refresh',
        stayNight,
        isCheckout: false,
        reason: 'Last night, Refresh service'
      };
    } else {
      return {
        taskType: 'none',
        stayNight,
        isCheckout: false,
        reason: 'Last night, no service (custom setting)'
      };
    }
  }

  if (config.policy === 'daily_full_service') {
    return {
      taskType: 'full_service',
      stayNight,
      isCheckout: false,
      reason: 'Daily Full Service policy'
    };
  }

  if (config.policy === 'eco') {
    if (stayNight % config.customInterval === 0) {
      return {
        taskType: 'full_service',
        stayNight,
        isCheckout: false,
        reason: `Eco Full Service every ${config.customInterval} nights`
      };
    }
    return {
      taskType: 'refresh',
      stayNight,
      isCheckout: false,
      reason: 'Eco Refresh service'
    };
  }

  if (config.policy === 'custom') {
    if (stayNight % config.customInterval === 0) {
      return {
        taskType: 'full_service',
        stayNight,
        isCheckout: false,
        reason: `Custom Full Service every ${config.customInterval} nights`
      };
    }
    return {
      taskType: 'refresh',
      stayNight,
      isCheckout: false,
      reason: 'Custom Refresh service'
    };
  }

  const fullServiceNights = calculateFullServiceNights(totalNights, config);

  if (fullServiceNights.includes(stayNight)) {
    return {
      taskType: 'full_service',
      stayNight,
      isCheckout: false,
      reason: `Full Service (Night ${stayNight})`
    };
  }

  return {
    taskType: 'refresh',
    stayNight,
    isCheckout: false,
    reason: `Refresh service (Night ${stayNight})`
  };
}

export function generateTasksForStay(
  checkInDate: Date | string,
  checkOutDate: Date | string,
  config: HousekeepingConfig = DEFAULT_HOUSEKEEPING_CONFIG
): { date: Date; taskType: TaskType; stayNight: number; isCheckout: boolean }[] {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const tasks: { date: Date; taskType: TaskType; stayNight: number; isCheckout: boolean }[] = [];

  let current = new Date(checkIn);
  current.setHours(0, 0, 0, 0);

  while (current <= checkOut) {
    const result = calculateHousekeepingTask(checkIn, checkOut, current, config);

    if (result.taskType !== 'none') {
      tasks.push({
        date: new Date(current),
        taskType: result.taskType,
        stayNight: result.stayNight,
        isCheckout: result.isCheckout
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return tasks;
}

export function getTaskDisplayInfo(taskType: TaskType, isCheckout: boolean = false) {
  if (isCheckout) {
    return {
      icon: '🧺',
      label: 'Full Service (Checkout)',
      color: 'bg-red-100 text-red-700 border-red-200',
      description: 'Complete room service - strip all linen, clean thoroughly',
      estimatedMinutes: 60
    };
  }

  switch (taskType) {
    case 'refresh':
      return {
        icon: '✨',
        label: 'Refresh',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        description: 'Make bed, tighten sheets, replenish amenities, light clean',
        estimatedMinutes: 30
      };
    case 'full_service':
      return {
        icon: '🧺',
        label: 'Full Service',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        description: 'Strip and replace all linen, thoroughly clean room',
        estimatedMinutes: 60
      };
    default:
      return {
        icon: '—',
        label: 'No Service',
        color: 'bg-gray-100 text-gray-400 border-gray-200',
        description: 'No service required',
        estimatedMinutes: 0
      };
  }
}

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

export function getTaskTypeFromString(type: string): TaskType {
  if (type === 'refresh' || type === 'full_service') {
    return type as TaskType;
  }
  return 'none';
}

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

export function getTaskEstimatedMinutes(taskType: TaskType, isCheckout: boolean = false): number {
  if (isCheckout) return 60;
  
  switch (taskType) {
    case 'refresh':
      return 30;
    case 'full_service':
      return 60;
    default:
      return 0;
  }
}
