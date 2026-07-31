// src/types/permissions.ts
// Role-Based Access Control — capability flags (not hard-coded UI checks)

/** Atomic capabilities. Roles enable sets of these. */
export type Permission =
  | 'canViewDashboard'
  | 'canManageBookings'
  | 'canCheckGuestsIn'
  | 'canAllocateRooms'
  | 'canViewHousekeeping'
  | 'canManageHousekeeping'
  | 'canInspectRooms'
  | 'canAssignHousekeepingTasks'
  | 'canManageLaundry'
  | 'canManageMaintenance'
  | 'canViewReports'
  | 'canExportReports'
  | 'canManageMarketing'
  | 'canManageStaff'
  | 'canManageSettings'
  | 'canViewAuditLog'
  | 'canApproveRoomChanges'
  | 'canManageLostFound'
  | 'canViewGuestDetails'
  | 'canViewGuestLimited' // room number only
  | 'canAccessStaffPortal';

export type StaffRole =
  | 'super_admin'
  | 'business_owner'
  | 'general_manager'
  | 'front_desk'
  | 'team_leader'
  | 'housekeeper'
  | 'laundry_attendant'
  | 'maintenance'
  | 'administration'
  | 'marketing'
  | 'finance'
  | 'custom'
  // Legacy employee role (pre-RBAC)
  | 'EmployeeOverview';

export const ALL_PERMISSIONS: Permission[] = [
  'canViewDashboard',
  'canManageBookings',
  'canCheckGuestsIn',
  'canAllocateRooms',
  'canViewHousekeeping',
  'canManageHousekeeping',
  'canInspectRooms',
  'canAssignHousekeepingTasks',
  'canManageLaundry',
  'canManageMaintenance',
  'canViewReports',
  'canExportReports',
  'canManageMarketing',
  'canManageStaff',
  'canManageSettings',
  'canViewAuditLog',
  'canApproveRoomChanges',
  'canManageLostFound',
  'canViewGuestDetails',
  'canViewGuestLimited',
  'canAccessStaffPortal',
];

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  business_owner: 'Business Owner',
  general_manager: 'General Manager',
  front_desk: 'Front Desk',
  team_leader: 'Team Leader',
  housekeeper: 'Housekeeper',
  laundry_attendant: 'Laundry Attendant',
  maintenance: 'Maintenance',
  administration: 'Administration',
  marketing: 'Marketing',
  finance: 'Finance',
  custom: 'Custom Role',
  EmployeeOverview: 'Employee (Legacy)',
};

/** Roles a business owner can assign to staff */
export const ASSIGNABLE_ROLES: StaffRole[] = [
  'general_manager',
  'front_desk',
  'team_leader',
  'housekeeper',
  'laundry_attendant',
  'maintenance',
  'administration',
  'marketing',
  'finance',
  'custom',
];

function set(...perms: Permission[]): Set<Permission> {
  return new Set(perms);
}

/** Default permission sets per role */
export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, Set<Permission>> = {
  super_admin: new Set(ALL_PERMISSIONS),
  business_owner: new Set(ALL_PERMISSIONS),
  general_manager: new Set(
    ALL_PERMISSIONS.filter((p) => p !== 'canManageMarketing' || true)
  ),
  front_desk: set(
    'canViewDashboard',
    'canManageBookings',
    'canCheckGuestsIn',
    'canAllocateRooms',
    'canViewGuestDetails',
    'canViewHousekeeping' // ready / not ready status only
  ),
  team_leader: set(
    'canViewDashboard',
    'canViewHousekeeping',
    'canManageHousekeeping',
    'canInspectRooms',
    'canAssignHousekeepingTasks',
    'canManageLostFound',
    'canViewGuestLimited'
  ),
  housekeeper: set(
    'canViewDashboard',
    'canViewHousekeeping',
    'canManageLostFound',
    'canViewGuestLimited'
  ),
  laundry_attendant: set(
    'canViewDashboard',
    'canManageLaundry',
    'canViewHousekeeping',
    'canViewGuestLimited'
  ),
  maintenance: set(
    'canViewDashboard',
    'canManageMaintenance',
    'canApproveRoomChanges'
  ),
  administration: set(
    'canViewDashboard',
    'canViewReports',
    'canExportReports',
    'canViewAuditLog',
    'canManageSettings',
    'canManageStaff',
    'canAccessStaffPortal',
    'canViewGuestDetails'
  ),
  marketing: set('canViewDashboard', 'canManageMarketing'),
  finance: set('canViewDashboard', 'canViewReports', 'canExportReports'),
  custom: set('canViewDashboard'),
  // Legacy: guest overview / dietaries only
  EmployeeOverview: set(
    'canViewDashboard',
    'canViewGuestDetails',
    'canManageBookings'
  ),
};

/** Dashboard tab visibility mapping */
export const TAB_REQUIRED_PERMISSION: Record<string, Permission | Permission[]> = {
  overview: 'canViewDashboard',
  checkins: 'canManageBookings',
  reports: 'canViewReports',
  rooms: 'canAllocateRooms',
  housekeeping: 'canViewHousekeeping',
  staff: 'canAccessStaffPortal',
  settings: 'canManageSettings',
};
