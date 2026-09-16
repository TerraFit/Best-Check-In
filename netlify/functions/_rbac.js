// netlify/functions/_rbac.js
// Authorization policy/role matrix. Authentication and tenant identity are
// delegated to the canonical server-side auth foundation in _auth.cjs.
import auth from './_auth.cjs';

const { authenticateRequest } = auth;

export const ALL = [
  'canViewDashboard','canViewGuestDetails','canViewGuestLimited','canManageBookings','canCheckGuestsIn','canAllocateRooms','canViewRooms','canViewHousekeeping','canStartHousekeepingTask','canCompleteHousekeepingTask','canApproveInspection','canGenerateHousekeepingSchedule','canAssignHousekeepingTasks','canViewHousekeepingReports','canViewLaundry','canManageLaundry','canReceiveLinen','canIssueLinen','canViewLaundryReports','canViewMaintenance','canCreateMaintenanceJob','canCompleteMaintenanceJob','canTakeRoomOffline','canReturnRoomToService','canViewLostFound','canCreateLostFound','canEditLostFound','canDisposeLostFound','canViewLostFoundReports','canViewOperationalReports','canViewFinancialReports','canViewMarketingReports','canViewGuestReports','canViewAuditReports','canExportReports','canManageMarketing','canManageStaff','canManageSettings','canViewAuditLog','canApproveRoomChanges','canAccessStaffPortal',
  'canViewPlatformAnalytics','canViewOriginAnalytics','canViewEstablishmentPerformance',
];

function expandLegacy(set) {
  if (set.has('canManageHousekeeping')) ['canViewHousekeeping','canStartHousekeepingTask','canCompleteHousekeepingTask','canApproveInspection','canGenerateHousekeepingSchedule','canAssignHousekeepingTasks'].forEach((p) => set.add(p));
  if (set.has('canInspectRooms')) { set.add('canApproveInspection'); set.add('canViewHousekeeping'); }
  if (set.has('canManageLostFound')) ['canViewLostFound','canCreateLostFound','canEditLostFound','canDisposeLostFound'].forEach((p) => set.add(p));
  if (set.has('canViewReports')) { set.add('canViewOperationalReports'); set.add('canViewGuestReports'); }
  if (set.has('canManageMaintenance')) ['canViewMaintenance','canCreateMaintenanceJob','canCompleteMaintenanceJob','canTakeRoomOffline','canReturnRoomToService'].forEach((p) => set.add(p));
  return set;
}

const HK_WORKER = ['canViewDashboard','canViewGuestOverview','canViewHousekeeping','canStartHousekeepingTask','canCompleteHousekeepingTask','canViewLostFound','canCreateLostFound','canViewGuestLimited'];
const HK_LEAD = HK_WORKER.concat(['canApproveInspection','canAssignHousekeepingTasks','canGenerateHousekeepingSchedule','canViewHousekeepingReports','canEditLostFound','canViewRooms']);
export const ROLE_DEFAULTS = {
  super_admin: ALL,
  business_owner: ALL,
  general_manager: ALL,
  supervisor: HK_LEAD.concat(['canViewRooms','canAllocateRooms','canViewGuestDetails','canManageBookings','canViewOperationalReports','canViewGuestReports','canAccessStaffPortal','canDisposeLostFound','canViewLostFoundReports']),
  team_leader: HK_LEAD,
  front_desk: ['canViewDashboard','canViewGuestOverview','canViewGuestPhone','canViewGuestFoodRestrictions','canManageBookings','canCheckGuestsIn','canAllocateRooms','canViewRooms','canViewGuestDetails','canViewHousekeeping','canViewLostFound','canCreateLostFound'],
  housekeeper: HK_WORKER,
  laundry_attendant: ['canViewDashboard','canViewLaundry','canManageLaundry','canReceiveLinen','canIssueLinen','canViewHousekeeping','canViewLostFound','canViewGuestLimited'],
  maintenance: ['canViewDashboard','canViewMaintenance','canCreateMaintenanceJob','canCompleteMaintenanceJob','canTakeRoomOffline','canReturnRoomToService','canViewRooms','canApproveRoomChanges'],
  administration: ['canViewDashboard','canViewOperationalReports','canViewGuestReports','canViewAuditReports','canExportReports','canViewAuditLog','canManageSettings','canManageStaff','canAccessStaffPortal','canViewGuestDetails','canViewRooms'],
  marketing: ['canViewDashboard','canManageMarketing','canViewMarketingReports','canViewGuestReports'],
  finance: ['canViewDashboard','canViewFinancialReports','canExportReports','canViewOperationalReports'],
  night_auditor: ['canViewDashboard','canManageBookings','canCheckGuestsIn','canViewRooms','canViewGuestDetails','canViewHousekeeping','canViewOperationalReports','canViewAuditLog'],
  security: ['canViewDashboard','canViewRooms','canViewGuestLimited','canViewLostFound'],
  custom: ['canViewDashboard'],
  EmployeeOverview: ['canViewDashboard','canViewGuestOverview','canViewGuestDetails','canManageBookings'],
};

export function normalizeRole(role) {
  if (!role) return 'EmployeeOverview';
  if (ROLE_DEFAULTS[role]) return role;
  const aliases = { owner:'business_owner', business:'business_owner', gm:'general_manager', receptionist:'front_desk', reception:'front_desk', hk:'housekeeper', housekeeping:'housekeeper' };
  return aliases[String(role).toLowerCase()] || 'custom';
}

const GUEST_DATA_PERMISSIONS = [
  'canViewGuestOverview',
  'canViewGuestPhone',
  'canViewGuestFoodRestrictions',
];

const DEPARTMENT_GUEST_PERMISSIONS = {
  front_office: ['canViewGuestOverview', 'canViewGuestPhone', 'canViewGuestFoodRestrictions'],
  housekeeping: ['canViewGuestOverview'],
  laundry: ['canViewGuestOverview'],
  maintenance: [],
  administration: [],
  marketing: [],
  finance: [],
  security: ['canViewGuestOverview'],
  grounds_gardens: [],
  activities: ['canViewGuestOverview'],
  food_beverage: ['canViewGuestOverview', 'canViewGuestFoodRestrictions'],
  kitchen: ['canViewGuestOverview', 'canViewGuestFoodRestrictions'],
  restaurant: ['canViewGuestOverview', 'canViewGuestPhone', 'canViewGuestFoodRestrictions'],
  custom: [],
  management: ['canViewGuestOverview', 'canViewGuestPhone', 'canViewGuestFoodRestrictions'],
};

function normalizeDepartments(department, additional_departments) {
  const values = [
    department,
    ...(Array.isArray(additional_departments) ? additional_departments : []),
  ];

  return [...new Set(
    values.filter((value) => typeof value === 'string' && value in DEPARTMENT_GUEST_PERMISSIONS)
  )];
}

export function resolvePermissions({
  actorType,
  role,
  permission_set,
  permissions,
  active,
  department,
  additional_departments,
}) {
  if (active === false) return new Set();

  if (actorType === 'super_admin' || role === 'super_admin') {
    return expandLegacy(new Set(ALL));
  }

  if (actorType === 'business' || role === 'business_owner' || role === 'owner') {
    return expandLegacy(new Set(ALL));
  }

  const r = normalizeRole(role);
  const base = new Set(ROLE_DEFAULTS[r] || []);

  // Guest-data access is department-controlled, not role-controlled.
  // This prevents a Manager/Director/other authority role in a
  // non-guest-facing department from receiving guest data merely
  // because their role has broad administrative permissions.
  GUEST_DATA_PERMISSIONS.forEach((permission) => base.delete(permission));

  for (const dept of normalizeDepartments(department, additional_departments)) {
    for (const permission of DEPARTMENT_GUEST_PERMISSIONS[dept]) {
      base.add(permission);
    }
  }

  // permission_set remains supported for non-guest operational permissions,
  // but it cannot manufacture guest-data access. Guest permissions are
  // exclusively determined by primary/additional departments.
  const supplied = Array.isArray(permission_set)
    ? permission_set
    : (Array.isArray(permissions) ? permissions : []);

  for (const permission of supplied) {
    if (typeof permission === 'string' && !GUEST_DATA_PERMISSIONS.includes(permission)) {
      base.add(permission);
    }
  }

  return expandLegacy(base);
}

export function requirePermission(principal, permission) {
  const set = resolvePermissions(principal || {});
  if (set.has(permission)) return true;
  if (['canStartHousekeepingTask','canCompleteHousekeepingTask','canApproveInspection','canGenerateHousekeepingSchedule'].includes(permission) && set.has('canManageHousekeeping')) return true;
  return false;
}

export function requireAnyPermission(principal, permissions) { return (permissions || []).some((p) => requirePermission(principal, p)); }

// Compatibility mapper for callers that already possess a verified decoded JWT.
// Never elevate based on mutable user_metadata SuperAdmin markers.
export function principalFromJwt(decoded) {
  if (!decoded || typeof decoded !== 'object') return null;
  const meta = decoded.user_metadata || {};
  if (decoded.role === 'service_role') return null;
  if ((meta.role === 'super_admin' || meta.super_admin === true || meta.super_admin === 'true') && decoded.role !== 'super_admin') return null;
  if (decoded.role === 'super_admin') return { actorType:'super_admin', role:'super_admin', active:true, userId:decoded.sub || null, email:decoded.email || meta.email || null, businessId:null, permissions:Array.isArray(meta.permission_set) ? meta.permission_set : [] };
  if (meta.business_id && !meta.employee_id) return { actorType:'business', role:'business_owner', active:meta.active !== false, businessId:meta.business_id, userId:decoded.sub || null, permissions:Array.isArray(meta.permission_set) ? meta.permission_set : [] };
  return { actorType:'employee', role:meta.staff_role || meta.role || 'EmployeeOverview', permission_set:meta.permission_set || null, active:meta.active !== false, businessId:meta.business_id || null, employeeId:meta.employee_id || decoded.sub || null, userId:decoded.sub || null, permissions:Array.isArray(meta.permission_set) ? meta.permission_set : [] };
}

export function assertPermission(event, permission) {
  const authResult = authenticateRequest(event);
  if (!authResult.ok) return authResult;
  // Use the canonical principal produced by _auth.cjs. Do not reconstruct
  // identity from decoded mutable metadata in an authorization boundary.
  const principal = authResult.principal;
  if (!principal) return { ok:false, status:403, error:'Invalid application identity' };
  if (!requirePermission(principal, permission)) return { ok:false, status:403, error:'Missing permission: ' + permission, principal };
  return { ok:true, principal };
}
