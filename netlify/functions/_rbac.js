// netlify/functions/_rbac.js
// Authorization policy/role matrix. Authentication and tenant identity are
// delegated to the canonical server-side auth foundation in _auth.cjs.
const { authenticateRequest } = require('./_auth.cjs');

const ALL = [
  'canViewDashboard','canViewGuestDetails','canViewGuestLimited','canManageBookings','canCheckGuestsIn','canAllocateRooms','canViewRooms','canViewHousekeeping','canStartHousekeepingTask','canCompleteHousekeepingTask','canApproveInspection','canGenerateHousekeepingSchedule','canAssignHousekeepingTasks','canViewHousekeepingReports','canViewLaundry','canManageLaundry','canReceiveLinen','canIssueLinen','canViewLaundryReports','canViewMaintenance','canCreateMaintenanceJob','canCompleteMaintenanceJob','canTakeRoomOffline','canReturnRoomToService','canViewLostFound','canCreateLostFound','canEditLostFound','canDisposeLostFound','canViewLostFoundReports','canViewOperationalReports','canViewFinancialReports','canViewMarketingReports','canViewGuestReports','canViewAuditReports','canExportReports','canManageMarketing','canManageStaff','canManageSettings','canViewAuditLog','canApproveRoomChanges','canAccessStaffPortal',
];

function expandLegacy(set) {
  if (set.has('canManageHousekeeping')) ['canViewHousekeeping','canStartHousekeepingTask','canCompleteHousekeepingTask','canApproveInspection','canGenerateHousekeepingSchedule','canAssignHousekeepingTasks'].forEach((p) => set.add(p));
  if (set.has('canInspectRooms')) { set.add('canApproveInspection'); set.add('canViewHousekeeping'); }
  if (set.has('canManageLostFound')) ['canViewLostFound','canCreateLostFound','canEditLostFound','canDisposeLostFound'].forEach((p) => set.add(p));
  if (set.has('canViewReports')) { set.add('canViewOperationalReports'); set.add('canViewGuestReports'); }
  if (set.has('canManageMaintenance')) ['canViewMaintenance','canCreateMaintenanceJob','canCompleteMaintenanceJob','canTakeRoomOffline','canReturnRoomToService'].forEach((p) => set.add(p));
  return set;
}

const HK_WORKER = ['canViewDashboard','canViewHousekeeping','canStartHousekeepingTask','canCompleteHousekeepingTask','canViewLostFound','canCreateLostFound','canViewGuestLimited'];
const HK_LEAD = HK_WORKER.concat(['canApproveInspection','canAssignHousekeepingTasks','canGenerateHousekeepingSchedule','canViewHousekeepingReports','canEditLostFound','canViewRooms']);
const ROLE_DEFAULTS = {
  super_admin: ALL,
  business_owner: ALL,
  general_manager: ALL,
  supervisor: HK_LEAD.concat(['canViewRooms','canAllocateRooms','canViewGuestDetails','canManageBookings','canViewOperationalReports','canViewGuestReports','canAccessStaffPortal','canDisposeLostFound','canViewLostFoundReports']),
  team_leader: HK_LEAD,
  front_desk: ['canViewDashboard','canManageBookings','canCheckGuestsIn','canAllocateRooms','canViewRooms','canViewGuestDetails','canViewHousekeeping','canViewLostFound','canCreateLostFound'],
  housekeeper: HK_WORKER,
  laundry_attendant: ['canViewDashboard','canViewLaundry','canManageLaundry','canReceiveLinen','canIssueLinen','canViewHousekeeping','canViewLostFound','canViewGuestLimited'],
  maintenance: ['canViewDashboard','canViewMaintenance','canCreateMaintenanceJob','canCompleteMaintenanceJob','canTakeRoomOffline','canReturnRoomToService','canViewRooms','canApproveRoomChanges'],
  administration: ['canViewDashboard','canViewOperationalReports','canViewGuestReports','canViewAuditReports','canExportReports','canViewAuditLog','canManageSettings','canManageStaff','canAccessStaffPortal','canViewGuestDetails','canViewRooms'],
  marketing: ['canViewDashboard','canManageMarketing','canViewMarketingReports','canViewGuestReports'],
  finance: ['canViewDashboard','canViewFinancialReports','canExportReports','canViewOperationalReports'],
  night_auditor: ['canViewDashboard','canManageBookings','canCheckGuestsIn','canViewRooms','canViewGuestDetails','canViewHousekeeping','canViewOperationalReports','canViewAuditLog'],
  security: ['canViewDashboard','canViewRooms','canViewGuestLimited','canViewLostFound'],
  custom: ['canViewDashboard'],
  EmployeeOverview: ['canViewDashboard','canViewGuestDetails','canManageBookings'],
};

function normalizeRole(role) {
  if (!role) return 'EmployeeOverview';
  if (ROLE_DEFAULTS[role]) return role;
  const aliases = { owner:'business_owner', business:'business_owner', gm:'general_manager', receptionist:'front_desk', reception:'front_desk', hk:'housekeeper', housekeeping:'housekeeper' };
  return aliases[String(role).toLowerCase()] || 'custom';
}

function resolvePermissions({ actorType, role, permission_set, permissions, active }) {
  if (active === false) return new Set();
  if (actorType === 'super_admin' || role === 'super_admin') return expandLegacy(new Set(ALL));
  if (actorType === 'business' || role === 'business_owner' || role === 'owner') return expandLegacy(new Set(ALL));
  const r = normalizeRole(role);
  const base = new Set(ROLE_DEFAULTS[r] || []);
  const supplied = Array.isArray(permission_set) ? permission_set : (Array.isArray(permissions) ? permissions : []);
  if (supplied.length) {
    if (r === 'custom') return expandLegacy(new Set(supplied.filter((p) => typeof p === 'string')));
    supplied.forEach((p) => { if (typeof p === 'string') base.add(p); });
  }
  return expandLegacy(base);
}

function requirePermission(principal, permission) {
  const set = resolvePermissions(principal || {});
  if (set.has(permission)) return true;
  if (['canStartHousekeepingTask','canCompleteHousekeepingTask','canApproveInspection','canGenerateHousekeepingSchedule'].includes(permission) && set.has('canManageHousekeeping')) return true;
  return false;
}

function requireAnyPermission(principal, permissions) { return (permissions || []).some((p) => requirePermission(principal, p)); }

function principalFromJwt(decoded) {
  const meta = (decoded && decoded.user_metadata) || {};
  if ((decoded && decoded.role) === 'service_role') return null; // service-role is never a human application principal
  const explicitSuperAdmin = decoded?.role === 'super_admin' || meta.super_admin === true || meta.super_admin === 'true';
  if (explicitSuperAdmin) return { actorType:'super_admin', role:'super_admin', active:true, userId:decoded.sub || null, email:decoded.email || meta.email || null, businessId:null, permissions:Array.isArray(meta.permission_set) ? meta.permission_set : [] };
  if (meta.business_id && !meta.employee_id) return { actorType:'business', role:'business_owner', active:meta.active !== false, businessId:meta.business_id, userId:decoded.sub || null, permissions:Array.isArray(meta.permission_set) ? meta.permission_set : [] };
  return { actorType:'employee', role:meta.staff_role || meta.role || 'EmployeeOverview', permission_set:meta.permission_set || null, active:meta.active !== false, businessId:meta.business_id || null, employeeId:meta.employee_id || decoded.sub || null, userId:decoded.sub || null, permissions:Array.isArray(meta.permission_set) ? meta.permission_set : [] };
}

function assertPermission(event, permission) {
  const auth = authenticateRequest(event);
  if (!auth.ok) return auth;
  const principal = principalFromJwt(auth.decoded);
  if (!principal) return { ok:false, status:401, error:'Invalid application identity' };
  if (!requirePermission(principal, permission)) return { ok:false, status:403, error:'Missing permission: ' + permission, principal };
  return { ok:true, principal };
}

module.exports = { ALL, ROLE_DEFAULTS, normalizeRole, resolvePermissions, requirePermission, requireAnyPermission, principalFromJwt, assertPermission };
