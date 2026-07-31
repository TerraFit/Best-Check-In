// src/types/permissions.ts
// Role-Based Access Control — atomic capabilities only (never hard-code in UI)

/** Atomic capabilities. Roles enable sets of these. */
export type Permission =
  // Dashboard / general
  | 'canViewDashboard'
  | 'canViewGuestDetails'
  | 'canViewGuestLimited'
  // Bookings / front desk
  | 'canManageBookings'
  | 'canCheckGuestsIn'
  | 'canAllocateRooms'
  | 'canViewRooms'
  // Housekeeping (split)
  | 'canViewHousekeeping'
  | 'canStartHousekeepingTask'
  | 'canCompleteHousekeepingTask'
  | 'canApproveInspection'
  | 'canGenerateHousekeepingSchedule'
  | 'canAssignHousekeepingTasks'
  | 'canViewHousekeepingReports'
  // Laundry (future-ready)
  | 'canViewLaundry'
  | 'canManageLaundry'
  | 'canReceiveLinen'
  | 'canIssueLinen'
  | 'canViewLaundryReports'
  // Maintenance (future-ready)
  | 'canViewMaintenance'
  | 'canCreateMaintenanceJob'
  | 'canCompleteMaintenanceJob'
  | 'canTakeRoomOffline'
  | 'canReturnRoomToService'
  // Lost & Found (split)
  | 'canViewLostFound'
  | 'canCreateLostFound'
  | 'canEditLostFound'
  | 'canDisposeLostFound'
  | 'canViewLostFoundReports'
  // Reporting (split)
  | 'canViewOperationalReports'
  | 'canViewFinancialReports'
  | 'canViewMarketingReports'
  | 'canViewGuestReports'
  | 'canViewAuditReports'
  | 'canExportReports'
  // Admin
  | 'canManageMarketing'
  | 'canManageStaff'
  | 'canManageSettings'
  | 'canViewAuditLog'
  | 'canApproveRoomChanges'
  | 'canAccessStaffPortal'
  // Legacy aliases (resolved to new flags)
  | 'canManageHousekeeping'
  | 'canManageLostFound'
  | 'canViewReports'
  | 'canInspectRooms'
  | 'canManageMaintenance';

export type StaffRole =
  | 'super_admin'
  | 'business_owner'
  | 'general_manager'
  | 'supervisor'
  | 'team_leader'
  | 'front_desk'
  | 'housekeeper'
  | 'laundry_attendant'
  | 'maintenance'
  | 'administration'
  | 'marketing'
  | 'finance'
  | 'night_auditor'
  | 'security'
  | 'custom'
  | 'EmployeeOverview';

export type StaffDepartment =
  | 'front_office'
  | 'housekeeping'
  | 'laundry'
  | 'maintenance'
  | 'administration'
  | 'marketing'
  | 'finance'
  | 'management'
  | 'food_beverage'
  | 'security'
  | 'custom';

export const ALL_PERMISSIONS: Permission[] = [
  'canViewDashboard',
  'canViewGuestDetails',
  'canViewGuestLimited',
  'canManageBookings',
  'canCheckGuestsIn',
  'canAllocateRooms',
  'canViewRooms',
  'canViewHousekeeping',
  'canStartHousekeepingTask',
  'canCompleteHousekeepingTask',
  'canApproveInspection',
  'canGenerateHousekeepingSchedule',
  'canAssignHousekeepingTasks',
  'canViewHousekeepingReports',
  'canViewLaundry',
  'canManageLaundry',
  'canReceiveLinen',
  'canIssueLinen',
  'canViewLaundryReports',
  'canViewMaintenance',
  'canCreateMaintenanceJob',
  'canCompleteMaintenanceJob',
  'canTakeRoomOffline',
  'canReturnRoomToService',
  'canViewLostFound',
  'canCreateLostFound',
  'canEditLostFound',
  'canDisposeLostFound',
  'canViewLostFoundReports',
  'canViewOperationalReports',
  'canViewFinancialReports',
  'canViewMarketingReports',
  'canViewGuestReports',
  'canViewAuditReports',
  'canExportReports',
  'canManageMarketing',
  'canManageStaff',
  'canManageSettings',
  'canViewAuditLog',
  'canApproveRoomChanges',
  'canAccessStaffPortal',
];

/** Human labels for permission editor */
export const PERMISSION_LABELS: Record<Permission, string> = {
  canViewDashboard: 'View Dashboard',
  canViewGuestDetails: 'View Guest Details',
  canViewGuestLimited: 'View Guest (Limited)',
  canManageBookings: 'Manage Bookings',
  canCheckGuestsIn: 'Check Guests In',
  canAllocateRooms: 'Allocate Rooms',
  canViewRooms: 'View Rooms',
  canViewHousekeeping: 'View Housekeeping',
  canStartHousekeepingTask: 'Start Housekeeping Task',
  canCompleteHousekeepingTask: 'Complete Housekeeping Task',
  canApproveInspection: 'Approve Inspection',
  canGenerateHousekeepingSchedule: 'Generate Schedule',
  canAssignHousekeepingTasks: 'Assign Housekeeping Tasks',
  canViewHousekeepingReports: 'Housekeeping Reports',
  canViewLaundry: 'View Laundry',
  canManageLaundry: 'Manage Laundry',
  canReceiveLinen: 'Receive Linen',
  canIssueLinen: 'Issue Linen',
  canViewLaundryReports: 'Laundry Reports',
  canViewMaintenance: 'View Maintenance',
  canCreateMaintenanceJob: 'Create Maintenance Job',
  canCompleteMaintenanceJob: 'Complete Maintenance Job',
  canTakeRoomOffline: 'Take Room Offline',
  canReturnRoomToService: 'Return Room To Service',
  canViewLostFound: 'View Lost & Found',
  canCreateLostFound: 'Create Lost & Found',
  canEditLostFound: 'Edit Lost & Found',
  canDisposeLostFound: 'Dispose Lost & Found',
  canViewLostFoundReports: 'Lost & Found Reports',
  canViewOperationalReports: 'Operational Reports',
  canViewFinancialReports: 'Financial Reports',
  canViewMarketingReports: 'Marketing Reports',
  canViewGuestReports: 'Guest Reports',
  canViewAuditReports: 'Audit Reports',
  canExportReports: 'Export Reports',
  canManageMarketing: 'Manage Marketing',
  canManageStaff: 'Manage Staff',
  canManageSettings: 'Business Settings',
  canViewAuditLog: 'View Audit Log',
  canApproveRoomChanges: 'Approve Room Changes',
  canAccessStaffPortal: 'Access Staff Portal',
  canManageHousekeeping: 'Manage Housekeeping (legacy)',
  canManageLostFound: 'Manage Lost & Found (legacy)',
  canViewReports: 'View Reports (legacy)',
  canInspectRooms: 'Inspect Rooms (legacy)',
  canManageMaintenance: 'Manage Maintenance (legacy)',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  business_owner: 'Business Owner',
  general_manager: 'General Manager',
  supervisor: 'Supervisor',
  team_leader: 'Team Leader',
  front_desk: 'Front Desk',
  housekeeper: 'Housekeeper',
  laundry_attendant: 'Laundry Attendant',
  maintenance: 'Maintenance',
  administration: 'Administration',
  marketing: 'Marketing',
  finance: 'Finance',
  night_auditor: 'Night Auditor',
  security: 'Security',
  custom: 'Custom Role',
  EmployeeOverview: 'Employee (Legacy)',
};

export const DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  front_office: 'Front Office',
  housekeeping: 'Housekeeping',
  laundry: 'Laundry',
  maintenance: 'Maintenance',
  administration: 'Administration',
  marketing: 'Marketing',
  finance: 'Finance',
  management: 'Management',
  food_beverage: 'Food & Beverage',
  security: 'Security',
  custom: 'Custom',
};

export const ASSIGNABLE_ROLES: StaffRole[] = [
  'general_manager',
  'supervisor',
  'team_leader',
  'front_desk',
  'housekeeper',
  'laundry_attendant',
  'maintenance',
  'administration',
  'marketing',
  'finance',
  'night_auditor',
  'security',
  'custom',
];

export const ASSIGNABLE_DEPARTMENTS: StaffDepartment[] = [
  'front_office',
  'housekeeping',
  'laundry',
  'maintenance',
  'administration',
  'marketing',
  'finance',
  'management',
  'food_beverage',
  'security',
  'custom',
];

function set(...perms: Permission[]): Set<Permission> {
  return new Set(perms);
}

const HK_WORKER = set(
  'canViewDashboard',
  'canViewHousekeeping',
  'canStartHousekeepingTask',
  'canCompleteHousekeepingTask',
  'canViewLostFound',
  'canCreateLostFound',
  'canViewGuestLimited'
);

const HK_LEAD = set(
  ...HK_WORKER,
  'canApproveInspection',
  'canAssignHousekeepingTasks',
  'canGenerateHousekeepingSchedule',
  'canViewHousekeepingReports',
  'canEditLostFound',
  'canViewRooms'
);

/** Default permission sets per role */
export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, Set<Permission>> = {
  super_admin: new Set(ALL_PERMISSIONS),
  business_owner: new Set(ALL_PERMISSIONS),
  general_manager: new Set(ALL_PERMISSIONS),
  supervisor: set(
    ...HK_LEAD,
    'canViewRooms',
    'canAllocateRooms',
    'canViewGuestDetails',
    'canManageBookings',
    'canViewOperationalReports',
    'canViewGuestReports',
    'canAccessStaffPortal',
    'canDisposeLostFound',
    'canViewLostFoundReports'
  ),
  team_leader: HK_LEAD,
  front_desk: set(
    'canViewDashboard',
    'canManageBookings',
    'canCheckGuestsIn',
    'canAllocateRooms',
    'canViewRooms',
    'canViewGuestDetails',
    'canViewHousekeeping',
    'canViewLostFound',
    'canCreateLostFound'
  ),
  housekeeper: HK_WORKER,
  laundry_attendant: set(
    'canViewDashboard',
    'canViewLaundry',
    'canManageLaundry',
    'canReceiveLinen',
    'canIssueLinen',
    'canViewHousekeeping',
    'canViewLostFound',
    'canViewGuestLimited'
  ),
  maintenance: set(
    'canViewDashboard',
    'canViewMaintenance',
    'canCreateMaintenanceJob',
    'canCompleteMaintenanceJob',
    'canTakeRoomOffline',
    'canReturnRoomToService',
    'canViewRooms',
    'canApproveRoomChanges'
  ),
  administration: set(
    'canViewDashboard',
    'canViewOperationalReports',
    'canViewGuestReports',
    'canViewAuditReports',
    'canExportReports',
    'canViewAuditLog',
    'canManageSettings',
    'canManageStaff',
    'canAccessStaffPortal',
    'canViewGuestDetails',
    'canViewRooms'
  ),
  marketing: set(
    'canViewDashboard',
    'canManageMarketing',
    'canViewMarketingReports',
    'canViewGuestReports'
  ),
  finance: set(
    'canViewDashboard',
    'canViewFinancialReports',
    'canExportReports',
    'canViewOperationalReports'
  ),
  night_auditor: set(
    'canViewDashboard',
    'canManageBookings',
    'canCheckGuestsIn',
    'canViewRooms',
    'canViewGuestDetails',
    'canViewHousekeeping',
    'canViewOperationalReports',
    'canViewAuditLog'
  ),
  security: set(
    'canViewDashboard',
    'canViewRooms',
    'canViewGuestLimited',
    'canViewLostFound'
  ),
  custom: set('canViewDashboard'),
  EmployeeOverview: set(
    'canViewDashboard',
    'canViewGuestDetails',
    'canManageBookings'
  ),
};

/** Expand legacy permission aliases to modern flags */
export function expandLegacyPermissions(perms: Set<Permission>): Set<Permission> {
  const out = new Set(perms);
  if (out.has('canManageHousekeeping')) {
    out.add('canViewHousekeeping');
    out.add('canStartHousekeepingTask');
    out.add('canCompleteHousekeepingTask');
    out.add('canApproveInspection');
    out.add('canGenerateHousekeepingSchedule');
    out.add('canAssignHousekeepingTasks');
  }
  if (out.has('canInspectRooms')) {
    out.add('canApproveInspection');
    out.add('canViewHousekeeping');
  }
  if (out.has('canManageLostFound')) {
    out.add('canViewLostFound');
    out.add('canCreateLostFound');
    out.add('canEditLostFound');
    out.add('canDisposeLostFound');
  }
  if (out.has('canViewReports')) {
    out.add('canViewOperationalReports');
    out.add('canViewGuestReports');
  }
  if (out.has('canManageMaintenance')) {
    out.add('canViewMaintenance');
    out.add('canCreateMaintenanceJob');
    out.add('canCompleteMaintenanceJob');
    out.add('canTakeRoomOffline');
    out.add('canReturnRoomToService');
  }
  return out;
}

/** Dashboard / employee nav tab → required permission(s) */
export const TAB_REQUIRED_PERMISSION: Record<string, Permission | Permission[]> = {
  overview: 'canViewDashboard',
  checkins: 'canManageBookings',
  reports: ['canViewOperationalReports', 'canViewReports', 'canViewGuestReports'],
  rooms: ['canViewRooms', 'canAllocateRooms'],
  housekeeping: 'canViewHousekeeping',
  staff: 'canAccessStaffPortal',
  settings: 'canManageSettings',
  // Employee portal menu ids
  todays_tasks: 'canViewHousekeeping',
  my_rooms: 'canViewHousekeeping',
  lost_found: 'canViewLostFound',
  laundry_queue: 'canViewLaundry',
  linen_inventory: 'canViewLaundry',
  arrivals: 'canManageBookings',
  departures: 'canManageBookings',
  guests: 'canViewGuestDetails',
  employees: 'canManageStaff',
  profile: 'canViewDashboard',
  maintenance: 'canViewMaintenance',
};

/** Employee portal menu items driven purely by permissions */
export interface EmployeeMenuItem {
  id: string;
  label: string;
  icon: string;
  required: Permission | Permission[];
}

export const EMPLOYEE_MENU_ITEMS: EmployeeMenuItem[] = [
  { id: 'overview', label: 'Overview', icon: '📋', required: 'canViewDashboard' },
  { id: 'arrivals', label: "Today's Arrivals", icon: '🛬', required: 'canManageBookings' },
  { id: 'departures', label: "Today's Departures", icon: '🛫', required: 'canManageBookings' },
  { id: 'checkins', label: 'Check-ins', icon: '✅', required: 'canCheckGuestsIn' },
  { id: 'todays_tasks', label: "Today's Tasks", icon: '🧹', required: 'canViewHousekeeping' },
  { id: 'my_rooms', label: 'My Rooms', icon: '🏨', required: 'canViewHousekeeping' },
  { id: 'rooms', label: 'Rooms', icon: '🚪', required: ['canViewRooms', 'canAllocateRooms'] },
  { id: 'guests', label: 'Guests', icon: '👤', required: 'canViewGuestDetails' },
  { id: 'laundry_queue', label: 'Laundry Queue', icon: '🧺', required: 'canViewLaundry' },
  { id: 'linen_inventory', label: 'Linen Inventory', icon: '🧵', required: 'canViewLaundry' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧', required: 'canViewMaintenance' },
  { id: 'lost_found', label: 'Lost & Found', icon: '🔎', required: 'canViewLostFound' },
  { id: 'reports', label: 'Reports', icon: '📊', required: ['canViewOperationalReports', 'canViewReports'] },
  { id: 'employees', label: 'Employees', icon: '👥', required: 'canManageStaff' },
  { id: 'profile', label: 'Profile', icon: '⚙️', required: 'canViewDashboard' },
];
