import type { HousekeepingServiceSession } from '../types/housekeepingServicePerformance';
import { clearEmployeeAuth, getAuthToken } from '../utils/auth';

export async function cancelHousekeepingService(payload: { businessId: string; sessionId: string; reason: string }): Promise<{ session: HousekeepingServiceSession; taskStatus: 'pending'; cancellationReason: string }> {
  const token = getAuthToken();
  const response = await fetch('/.netlify/functions/cancel-housekeeping-service', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403 && data.code === 'EMPLOYEE_DISABLED') {
      clearEmployeeAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== '/employee/login') window.location.assign('/employee/login');
    }
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}
