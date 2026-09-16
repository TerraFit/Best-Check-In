// src/services/rbacService.ts
// Resolve Role → Permission Set → UI / API decisions
// Role = authority hierarchy. Department is organisational only.

import {
  ALL_PERMISSIONS,
  EMPLOYEE_MENU_ITEMS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  DEPARTMENT_LABELS,
  TAB_REQUIRED_PERMISSION,
  expandLegacyPermissions,
  normalizeHierarchyRole,
  type EmployeeMenuItem,
  type Permission,
  type StaffDepartment,
  type StaffRole,
} from '../types/permissions';

export interface PermissionPrincipal {
  actorType?: 'business' | 'employee' | 'super_admin' | string;
  role?: string | null;
  permission_set?: string[] | Permission[] | null;
  active?: boolean | null;
  department?: string | null;
  additional_departments?: string[] | null;
}

export function normalizeRole(role: string | null | undefined): StaffRole {
  if (!role) return 'Employee (Legacy)';
  if (role === 'super_admin' || role === 'business_owner' || role === 'owner') {
    return role === 'owner' ? 'business_owner' : (role as StaffRole);
  }
  return normalizeHierarchyRole(role);
}

export function normalizeDepartment(
  dept: string | null | undefined
): StaffDepartment {
  if (!dept) return 'custom';
  if (dept in DEPARTMENT_LABELS) return dept as StaffDepartment;
  return 'custom';
}

/** Resolve effective permission set for a principal */
export function resolvePermissions(principal: PermissionPrincipal): Set<Permission> {
  if (principal.active === false) return new Set();

  if (principal.actorType === 'super_admin' || principal.role === 'super_admin') {
    return expandLegacyPermissions(new Set(ALL_PERMISSIONS));
  }

  if (
    principal.actorType === 'business' ||
    principal.role === 'business_owner' ||
    principal.role === 'owner'
  ) {
    return expandLegacyPermissions(new Set(ALL_PERMISSIONS));
  }

  const role = normalizeRole(principal.role);
  const base = new Set(
    ROLE_DEFAULT_PERMISSIONS[role] ||
    ROLE_DEFAULT_PERMISSIONS['Employee (Legacy)'] ||
    []
  );

  // Guest-data access is department-controlled, not role-controlled.
  // This mirrors the authoritative server policy.
  const guestDataPermissions: Permission[] = [
    'canViewGuestOverview',
    'canViewGuestPhone',
    'canViewGuestFoodRestrictions',
  ];

  for (const permission of guestDataPermissions) {
    base.delete(permission);
  }

  const departmentGuestPermissions: Record<StaffDepartment, Permission[]> = {
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

  const departments = [
    principal.department,
    ...(Array.isArray(principal.additional_departments)
      ? principal.additional_departments
      : []),
  ];

  for (const rawDepartment of departments) {
    const department = normalizeDepartment(rawDepartment);
    for (const permission of departmentGuestPermissions[department]) {
      base.add(permission);
    }
  }

  // permission_set remains supported for non-guest operational permissions,
  // but it cannot manufacture guest-data access. Guest permissions are
  // exclusively determined by primary/additional departments.
  const supplied = Array.isArray(principal.permission_set)
    ? principal.permission_set
    : [];

  for (const permission of supplied) {
    if (
      typeof permission === 'string' &&
      !guestDataPermissions.includes(permission as Permission)
    ) {
      base.add(permission as Permission);
    }
  }

  return expandLegacyPermissions(base);
}

export function hasPermission(
  principal: PermissionPrincipal,
  permission: Permission
): boolean {
  const set = resolvePermissions(principal);
  if (set.has(permission)) return true;
  if (
    (permission === 'canStartHousekeepingTask' ||
      permission === 'canCompleteHousekeepingTask' ||
      permission === 'canApproveInspection' ||
      permission === 'canGenerateHousekeepingSchedule') &&
    set.has('canManageHousekeeping' as Permission)
  ) {
    return true;
  }
  return false;
}

export function hasAnyPermission(
  principal: PermissionPrincipal,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(principal, p));
}

export function hasAllPermissions(
  principal: PermissionPrincipal,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(principal, p));
}

export function canAccessTab(
  principal: PermissionPrincipal,
  tabId: string
): boolean {
  const required = TAB_REQUIRED_PERMISSION[tabId];
  if (!required) return true;
  if (Array.isArray(required)) return hasAnyPermission(principal, required);
  return hasPermission(principal, required);
}

export function filterTabs<
  T extends { id: string; name: string }
>(principal: PermissionPrincipal, tabs: T[]): T[] {
  return tabs.filter((t) => canAccessTab(principal, t.id));
}

export function getEmployeeMenu(principal: PermissionPrincipal): EmployeeMenuItem[] {
  return EMPLOYEE_MENU_ITEMS.filter((item) => {
    if (Array.isArray(item.required)) {
      return hasAnyPermission(principal, item.required);
    }
    return hasPermission(principal, item.required);
  });
}

export function roleLabel(role: string | null | undefined): string {
  const r = normalizeRole(role);
  return ROLE_LABELS[r] || ROLE_LABELS[String(role)] || role || 'Staff';
}

export function departmentLabel(dept: string | null | undefined): string {
  const d = normalizeDepartment(dept);
  return DEPARTMENT_LABELS[d] || dept || '—';
}

export function businessOwnerPrincipal(): PermissionPrincipal {
  return { actorType: 'business', role: 'business_owner', active: true };
}

export function employeePrincipal(emp: {
  role?: string | null;
  staff_role?: string | null;
  permission_set?: string[] | null;
  active?: boolean | null;
  status?: string | null;
  department?: string | null;
  additional_departments?: string[] | null;
}): PermissionPrincipal {
  const active =
    emp.active !== false &&
    (emp.status === undefined || emp.status === null || emp.status === 'Active');
  return {
    actorType: 'employee',
    role: emp.staff_role || emp.role,
    permission_set: emp.permission_set,
    active,
    department: emp.department,
    additional_departments: emp.additional_departments,
  };
}
