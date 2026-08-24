// src/types/permissions.ts
// Role = authority level. Department = organisational unit. Permissions = capabilities.

/** Atomic capabilities. Roles enable sets of these. */
export type Permission =
  | 'canViewDashboard' | 'canViewGuestDetails' | 'canViewGuestLimited' | 'canManageBookings' | 'canCheckGuestsIn'
  | 'canAllocateRooms' | 'canViewRooms' | 'canViewHousekeeping' | 'canStartHousekeepingTask' | 'canCompleteHousekeepingTask'
  | 'canApproveInspection' | 'canGenerateHousekeepingSchedule' | 'canAssignHousekeepingTasks' | 'canViewHousekeepingReports'
  | 'canViewLaundry' | 'canManageLaundry' | 'canReceiveLinen' | 'canIssueLinen' | 'canViewLaundryReports'
  | 'canViewMaintenance' | 'canCreateMaintenanceJob' | 'canCompleteMaintenanceJob' | 'canTakeRoomOffline' | 'canReturnRoomToService'
  | 'canViewLostFound' | 'canCreateLostFound' | 'canEditLostFound' | 'canDisposeLostFound' | 'canViewLostFoundReports'
  | 'canViewOperationalReports' | 'canViewFinancialReports' | 'canViewMarketingReports' | 'canViewGuestReports' | 'canViewAuditReports'
  | 'canExportReports' | 'canManageMarketing' | 'canManageStaff' | 'canManageSettings' | 'canViewAuditLog' | 'canApproveRoomChanges'
  | 'canAccessStaffPortal' | 'canManageHousekeeping' | 'canManageLostFound' | 'canViewReports' | 'canInspectRooms' | 'canManageMaintenance';

export type StaffRole =
  | 'super_admin' | 'business_owner' | 'Employee (Legacy)' | 'Team Leader' | 'Supervisor' | 'Foreman' | 'Manager' | 'Director'
  | 'EmployeeOverview' | 'general_manager' | 'supervisor' | 'team_leader' | 'front_desk' | 'housekeeper' | 'laundry_attendant'
  | 'maintenance' | 'administration' | 'marketing' | 'finance' | 'night_auditor' | 'security' | 'custom';

export type StaffDepartment =
  | 'front_office' | 'housekeeping' | 'laundry' | 'maintenance' | 'administration' | 'marketing' | 'finance' | 'security'
  | 'grounds_gardens' | 'activities' | 'custom' | 'management' | 'food_beverage';

export const ALL_PERMISSIONS: Permission[] = [
  'canViewDashboard','canViewGuestDetails','canViewGuestLimited','canManageBookings','canCheckGuestsIn','canAllocateRooms','canViewRooms',
  'canViewHousekeeping','canStartHousekeepingTask','canCompleteHousekeepingTask','canApproveInspection','canGenerateHousekeepingSchedule',
  'canAssignHousekeepingTasks','canViewHousekeepingReports','canViewLaundry','canManageLaundry','canReceiveLinen','canIssueLinen',
  'canViewLaundryReports','canViewMaintenance','canCreateMaintenanceJob','canCompleteMaintenanceJob','canTakeRoomOffline','canReturnRoomToService',
  'canViewLostFound','canCreateLostFound','canEditLostFound','canDisposeLostFound','canViewLostFoundReports','canViewOperationalReports',
  'canViewFinancialReports','canViewMarketingReports','canViewGuestReports','canViewAuditReports','canExportReports','canManageMarketing',
  'canManageStaff','canManageSettings','canViewAuditLog','canApproveRoomChanges','canAccessStaffPortal','canManageHousekeeping',
  'canManageLostFound','canViewReports','canInspectRooms','canManageMaintenance',
];

export const PERMISSION_LABELS: Record<Permission, string> = Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, p]));
export const ROLE_LABELS: Record<string, string> = {
  super_admin:'Super Admin', business_owner:'Business Owner', 'Employee (Legacy)':'Employee (Legacy)', 'Team Leader':'Team Leader', Supervisor:'Supervisor',
  Foreman:'Foreman', Manager:'Manager', Director:'Director', EmployeeOverview:'Employee (Legacy)', general_manager:'Manager', supervisor:'Supervisor',
  team_leader:'Team Leader', front_desk:'Employee (Legacy)', housekeeper:'Employee (Legacy)', laundry_attendant:'Employee (Legacy)', maintenance:'Employee (Legacy)',
  administration:'Employee (Legacy)', marketing:'Employee (Legacy)', finance:'Employee (Legacy)', night_auditor:'Employee (Legacy)', security:'Employee (Legacy)', custom:'Employee (Legacy)',
};

export const DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  front_office:'Front Office', housekeeping:'Housekeeping', laundry:'Laundry', maintenance:'Maintenance', administration:'Administration',
  marketing:'Marketing', finance:'Finance', security:'Security', grounds_gardens:'Grounds & Gardens', activities:'Activities', custom:'Custom',
  management:'Management', food_beverage:'Food & Beverage',
};

export const ASSIGNABLE_ROLES: StaffRole[] = ['Employee (Legacy)','Team Leader','Supervisor','Foreman','Manager','Director'];
export const ASSIGNABLE_DEPARTMENTS: StaffDepartment[] = ['front_office','housekeeping','laundry','maintenance','administration','marketing','finance','security','grounds_gardens','activities','food_beverage','custom'];

function set(...perms: Permission[]): Set<Permission> { return new Set(perms); }
const EMPLOYEE_BASE = set('canViewDashboard','canViewGuestDetails','canManageBookings','canViewHousekeeping','canStartHousekeepingTask','canCompleteHousekeepingTask','canViewLostFound','canCreateLostFound','canViewGuestLimited');
const TEAM_LEAD = set(...EMPLOYEE_BASE,'canApproveInspection','canAssignHousekeepingTasks','canGenerateHousekeepingSchedule','canViewHousekeepingReports','canEditLostFound','canViewRooms','canCheckGuestsIn');
const SUPERVISOR_PERMS = set(...TEAM_LEAD,'canAllocateRooms','canViewOperationalReports','canViewGuestReports','canAccessStaffPortal','canDisposeLostFound','canViewLostFoundReports');
const FOREMAN_PERMS = set(...TEAM_LEAD,'canViewMaintenance','canCreateMaintenanceJob','canCompleteMaintenanceJob','canTakeRoomOffline','canReturnRoomToService','canApproveRoomChanges');
const MANAGER_PERMS = new Set(ALL_PERMISSIONS);
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Set<Permission>> = {
  super_admin:new Set(ALL_PERMISSIONS), business_owner:new Set(ALL_PERMISSIONS), 'Employee (Legacy)':EMPLOYEE_BASE, 'Team Leader':TEAM_LEAD, Supervisor:SUPERVISOR_PERMS,
  Foreman:FOREMAN_PERMS, Manager:MANAGER_PERMS, Director:new Set(ALL_PERMISSIONS), EmployeeOverview:EMPLOYEE_BASE, general_manager:MANAGER_PERMS,
  supervisor:SUPERVISOR_PERMS, team_leader:TEAM_LEAD, front_desk:EMPLOYEE_BASE, housekeeper:EMPLOYEE_BASE, laundry_attendant:EMPLOYEE_BASE,
  maintenance:FOREMAN_PERMS, administration:MANAGER_PERMS, marketing:EMPLOYEE_BASE, finance:EMPLOYEE_BASE, night_auditor:EMPLOYEE_BASE, security:EMPLOYEE_BASE, custom:EMPLOYEE_BASE,
};
export function expandLegacyPermissions(perms: Set<Permission>): Set<Permission> {
  const out = new Set(perms);
  if (out.has('canManageHousekeeping')) { out.add('canViewHousekeeping'); out.add('canStartHousekeepingTask'); out.add('canCompleteHousekeepingTask'); out.add('canApproveInspection'); out.add('canGenerateHousekeepingSchedule'); out.add('canAssignHousekeepingTasks'); }
  if (out.has('canInspectRooms')) { out.add('canApproveInspection'); out.add('canViewHousekeeping'); }
  if (out.has('canManageLostFound')) { out.add('canViewLostFound'); out.add('canCreateLostFound'); out.add('canEditLostFound'); out.add('canDisposeLostFound'); }
  if (out.has('canViewReports')) { out.add('canViewOperationalReports'); out.add('canViewGuestReports'); }
  if (out.has('canManageMaintenance')) { out.add('canViewMaintenance'); out.add('canCreateMaintenanceJob'); out.add('canCompleteMaintenanceJob'); out.add('canTakeRoomOffline'); out.add('canReturnRoomToService'); }
  return out;
}
export const TAB_REQUIRED_PERMISSION: Record<string, Permission | Permission[]> = {
  overview:'canViewDashboard', checkins:'canManageBookings', reports:['canViewOperationalReports','canViewReports','canViewGuestReports'], rooms:['canViewRooms','canAllocateRooms'],
  housekeeping:'canViewHousekeeping', staff:'canAccessStaffPortal', settings:'canManageSettings', todays_tasks:'canViewHousekeeping', my_rooms:'canViewHousekeeping',
  lost_found:'canViewLostFound', laundry_queue:'canViewLaundry', linen_inventory:'canViewLaundry', arrivals:'canManageBookings', departures:'canManageBookings', guests:'canViewGuestDetails',
  employees:'canManageStaff', profile:'canViewDashboard', maintenance:'canViewMaintenance',
};
export interface EmployeeMenuItem { id:string; label:string; icon:string; required:Permission|Permission[]; }
export const EMPLOYEE_MENU_ITEMS: EmployeeMenuItem[] = [
  {id:'overview',label:'Overview',icon:'📋',required:'canViewDashboard'}, {id:'todays_tasks',label:"Today's Tasks",icon:'🧹',required:'canViewHousekeeping'},
  {id:'my_rooms',label:'My Rooms',icon:'🛏️',required:'canViewHousekeeping'}, {id:'lost_found',label:'Lost & Found',icon:'🔎',required:'canViewLostFound'},
  {id:'laundry_queue',label:'Laundry',icon:'🧺',required:'canViewLaundry'}, {id:'linen_inventory',label:'Linen',icon:'🧻',required:'canViewLaundry'},
  {id:'maintenance',label:'Maintenance',icon:'🔧',required:'canViewMaintenance'}, {id:'rooms',label:'Rooms',icon:'🚪',required:['canViewRooms','canAllocateRooms']},
  {id:'reports',label:'Reports',icon:'📊',required:['canViewOperationalReports','canViewReports','canViewGuestReports']}, {id:'employees',label:'Employees',icon:'👥',required:'canManageStaff'},
  {id:'profile',label:'Profile',icon:'👤',required:'canViewDashboard'},
];

export function getEmployeeMenu(principal: { permissions?: Permission[]; role?: string }): EmployeeMenuItem[] {
  const perms = new Set(principal.permissions || []);
  const rolePerms = ROLE_DEFAULT_PERMISSIONS[principal.role || 'EmployeeOverview'] || EMPLOYEE_BASE;
  const effective = expandLegacyPermissions(new Set([...rolePerms, ...perms]));
  return EMPLOYEE_MENU_ITEMS.filter((item) => Array.isArray(item.required) ? item.required.some((p) => effective.has(p)) : effective.has(item.required));
}
