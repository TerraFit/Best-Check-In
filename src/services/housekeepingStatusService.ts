// src/services/housekeepingStatusService.ts
// Maps task lifecycle → room housekeeping_status / occupancy transitions

import type { HousekeepingStatus, OccupancyStatus } from '../types/room';
import type { HousekeepingTask, HousekeepingTaskStatus } from '../types/housekeeping';

export interface RoomStatusPatch {
  housekeeping_status?: HousekeepingStatus;
  occupancy_status?: OccupancyStatus;
}

/**
 * When a task moves to a new status, derive the room status patch.
 * Does not write to the database — callers apply the patch.
 */
export function roomPatchForTaskTransition(
  task: Pick<HousekeepingTask, 'task_type' | 'is_checkout' | 'status'>,
  nextStatus: HousekeepingTaskStatus,
  inspection?: 'approved' | 'rejected' | null
): RoomStatusPatch {
  if (nextStatus === 'pending') {
    if (task.is_checkout) {
      return {
        occupancy_status: 'departure_pending',
        housekeeping_status: 'dirty',
      };
    }
    return {
      housekeeping_status:
        task.task_type === 'full_service' ? 'full_service_required' : 'refresh_required',
    };
  }

  if (nextStatus === 'in_progress') {
    return { housekeeping_status: 'cleaning_in_progress' };
  }

  if (nextStatus === 'skipped') {
    // Skipping Refresh must not force dirty; leave room as clean if it was
    return { housekeeping_status: 'clean' };
  }

  if (nextStatus === 'cancelled') {
    return {};
  }

  if (nextStatus === 'completed') {
    if (inspection === 'rejected') {
      return { housekeeping_status: 'cleaning_in_progress' };
    }
    if (inspection === 'approved' || inspection === null || inspection === undefined) {
      // After complete → await inspection unless already approved
      if (inspection === 'approved') {
        const patch: RoomStatusPatch = { housekeeping_status: 'clean' };
        if (task.is_checkout) {
          patch.occupancy_status = 'vacant';
        }
        return patch;
      }
      return { housekeeping_status: 'awaiting_inspection' };
    }
  }

  return {};
}

/** Inspection decision after cleaning completed */
export function roomPatchForInspection(
  task: Pick<HousekeepingTask, 'is_checkout'>,
  decision: 'approved' | 'rejected'
): RoomStatusPatch {
  if (decision === 'rejected') {
    return { housekeeping_status: 'cleaning_in_progress' };
  }
  const patch: RoomStatusPatch = {
    housekeeping_status: 'clean',
  };
  if (task.is_checkout) {
    patch.occupancy_status = 'vacant';
  }
  return patch;
}

export function allowedTaskTransitions(
  current: HousekeepingTaskStatus
): HousekeepingTaskStatus[] {
  switch (current) {
    case 'pending':
      return ['in_progress', 'skipped', 'cancelled'];
    case 'in_progress':
      return ['completed', 'cancelled'];
    case 'completed':
      return []; // inspection is separate
    case 'skipped':
    case 'cancelled':
      return [];
    default:
      return [];
  }
}

export function canSkipTask(
  task: Pick<HousekeepingTask, 'task_type' | 'status'>,
  allowSkipRefresh: boolean
): boolean {
  return (
    allowSkipRefresh &&
    task.task_type === 'refresh' &&
    task.status === 'pending'
  );
}
