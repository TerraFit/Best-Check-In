// src/pages/EmployeeDashboard.tsx
// RBAC: menus generated entirely from resolvePermissions / getEmployeeMenu

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import Logo from '../components/Logo';
import QRCodeModal from '../components/QRCodeModal';
import { GuestOverviewTab } from '../components/staff/GuestOverviewTab';
import LostFoundTab from './tabs/LostFoundTab';
import {
  employeePrincipal,
  getEmployeeMenu,
  hasPermission,
  roleLabel,
  departmentLabel,
} from '../services/rbacService';
import type { PermissionPrincipal } from '../services/rbacService';

interface Booking {
  id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  check_in_date?: string;
  check_out_date?: string;
  status?: string;
  nights?: number;
  food_restrictions?: Record<string, unknown>;
  room_id?: string;
  room_number?: string;
  room_name?: string;
}

interface EmployeeUser {
  id: string;
  full_name: string;
  phone_number: string;
  business_id: string;
  role: string;
  staff_role?: string;
  department?: string;
  permission_set?: string[];
  active?: boolean;
  status?: string;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hkTasks, setHkTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeUser | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [denied, setDenied] = useState(false);

  const principal: PermissionPrincipal = useMemo(() => {
    if (!employee) return { actorType: 'employee', role: 'EmployeeOverview', active: true };
    return employeePrincipal(employee);
  }, [employee]);

  const menu = useMemo(() => getEmployeeMenu(principal), [principal]);

  useEffect(() => {
    try {
      const authStr =
        localStorage.getItem('fastcheckin_employee_auth') ||
        localStorage.getItem('fastcheckin_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        const user = auth.user || auth.employee;
        if (user) {
          setEmployee({
            id: user.id,
            full_name: user.full_name || user.name,
            phone_number: user.phone_number || '',
            business_id: user.business_id || user.businessId,
            role: user.staff_role || user.role || 'EmployeeOverview',
            staff_role: user.staff_role || user.role,
            department: user.department,
            permission_set: user.permission_set,
            active: user.active !== false,
            status: user.status || 'Active',
          });
          setBusinessId(user.business_id || user.businessId || null);
        }
      }
    } catch (e) {
      console.error('Error getting employee data:', e);
    }
  }, []);

  useEffect(() => {
    if (menu.length === 0) return;
    if (!menu.some((m) => m.id === activeMenu)) {
      setActiveMenu(menu[0].id);
    }
  }, [menu, activeMenu]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authStr = localStorage.getItem('fastcheckin_auth');
        const auth = authStr ? JSON.parse(authStr) : null;
        const token = auth?.token;
        const businessIdFromAuth =
          auth?.user?.businessId || auth?.user?.business_id || employee?.business_id;

        if (!token || !businessIdFromAuth) {
          setLoading(false);
          return;
        }

        setBusinessId(businessIdFromAuth);

        const response = await fetch(
          `/.netlify/functions/get-business-bookings?businessId=${businessIdFromAuth}&limit=1000&page=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setBookings(data.bookings || []);
        }

        const bizResponse = await fetch(
          `/.netlify/functions/get-business-branding?id=${businessIdFromAuth}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (bizResponse.ok) {
          const bizData = await bizResponse.json();
          setBusinessName(bizData.trading_name || 'Property');
        }

        if (hasPermission(principal, 'canViewHousekeeping')) {
          try {
            const hkRes = await fetch(
              `/.netlify/functions/get-housekeeping-tasks?businessId=${businessIdFromAuth}&view=today`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (hkRes.ok) {
              const hkData = await hkRes.json();
              setHkTasks(hkData.tasks || hkData.data || []);
            }
          } catch {
            /* optional */
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employee?.business_id, principal]);

  const handleLogout = () => {
    localStorage.removeItem('fastcheckin_employee_auth');
    localStorage.removeItem('fastcheckin_auth');
    localStorage.removeItem('fastcheckin_business_auth');
    navigate('/employee/login');
  };

  const handleMenuClick = (id: string) => {
    if (!menu.some((m) => m.id === id)) {
      setDenied(true);
      setTimeout(() => setDenied(false), 2500);
      return;
    }
    setActiveMenu(id);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  };

  const todaysArrivals = useMemo(
    () =>
      bookings.filter((b) => {
        const checkIn = parseDate(b.check_in_date);
        return checkIn && checkIn.getTime() === today.getTime();
      }),
    [bookings]
  );

  const stayovers = useMemo(
    () =>
      bookings.filter((b) => {
        const checkIn = parseDate(b.check_in_date);
        const checkOut = parseDate(b.check_out_date);
        if (!checkIn || b.status !== 'checked_in') return false;
        if (checkIn.getTime() >= today.getTime()) return false;
        if (!checkOut) return true;
        return checkOut.getTime() > today.getTime();
      }),
    [bookings]
  );

  const todaysCheckouts = useMemo(
    () =>
      bookings.filter((b) => {
        const checkOut = parseDate(b.check_out_date);
        return checkOut && checkOut.getTime() === today.getTime();
      }),
    [bookings]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Loading employee dashboard...</p>
        </div>
      </div>
    );
  }

  const displayRole = roleLabel(employee?.staff_role || employee?.role);
  const displayDept = departmentLabel(employee?.department);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div>
                <h1 className="text-sm font-bold text-stone-900">
                  {businessName || 'Employee Portal'}
                </h1>
                <p className="text-[10px] text-stone-400 flex items-center gap-1">
                  <User size={10} /> {employee?.full_name || 'Staff'}
                  <span className="mx-1">·</span>
                  {displayRole}
                  {employee?.department && (
                    <>
                      <span className="mx-1">·</span>
                      {displayDept}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block px-3 py-1 bg-amber-50 rounded-lg text-xs font-bold text-amber-700 border border-amber-200">
                Staff Portal
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 hover:border-red-200 text-stone-600 hover:text-red-600 rounded-xl text-xs font-semibold"
              >
                <LogOut size={12} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {denied && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            Access denied for that section.
          </div>
        )}

        <div className="flex border-b border-stone-200 overflow-x-auto gap-4 text-sm">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleMenuClick(item.id)}
              className={`pb-3 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeMenu === item.id
                  ? 'border-amber-500 text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {(activeMenu === 'overview' ||
          activeMenu === 'arrivals' ||
          activeMenu === 'departures' ||
          activeMenu === 'guests' ||
          activeMenu === 'checkins') &&
          hasPermission(principal, 'canViewGuestDetails') && (
            <GuestOverviewTab
              bookings={bookings}
              todayArrivals={todaysArrivals}
              todayStayovers={stayovers}
              todayCheckouts={todaysCheckouts}
              businessId={businessId || ''}
              onShowQRModal={() => setShowQRModal(true)}
            />
          )}

        {(activeMenu === 'todays_tasks' || activeMenu === 'my_rooms') &&
          hasPermission(principal, 'canViewHousekeeping') && (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
              <h3 className="font-bold text-sm text-stone-900 mb-4">
                {activeMenu === 'todays_tasks' ? "Today's Housekeeping Tasks" : 'My Rooms'}
              </h3>
              {hkTasks.length === 0 ? (
                <p className="text-sm text-stone-400">
                  No tasks in this view. Generate the schedule from the business Housekeeping tab if
                  needed.
                </p>
              ) : (
                <ul className="space-y-2">
                  {hkTasks.map((t: any) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between border border-stone-100 rounded-xl px-4 py-3 text-sm"
                    >
                      <div>
                        <span className="font-semibold text-stone-900">
                          {t.room_number ? `Room ${t.room_number}` : t.room_id}
                          {t.room_name ? ` · ${t.room_name}` : ''}
                        </span>
                        <span className="text-stone-500 ml-2">
                          {t.task_type === 'full_service'
                            ? t.is_checkout
                              ? '🧺 Full Service (Checkout)'
                              : '🧺 Full Service'
                            : '✨ Refresh'}
                        </span>
                        {t.guest_name && (
                          <span className="block text-xs text-stone-400">{t.guest_name}</span>
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-stone-500">
                        {t.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {(hasPermission(principal, 'canStartHousekeepingTask') ||
                hasPermission(principal, 'canCompleteHousekeepingTask')) && (
                <p className="mt-4 text-xs text-stone-400">
                  Use the business Housekeeping board to Start / Complete / Inspect tasks.
                </p>
              )}
            </div>
          )}

        {activeMenu === 'rooms' &&
          (hasPermission(principal, 'canViewRooms') ||
            hasPermission(principal, 'canAllocateRooms')) && (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 text-sm text-stone-600">
              Room status and allocation are available on the business Rooms page for authorised
              staff. Front Desk can allocate from Guest Details.
            </div>
          )}

        {activeMenu === 'laundry_queue' && hasPermission(principal, 'canViewLaundry') && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 text-sm text-stone-500">
            Laundry module coming soon. Your permissions are ready.
          </div>
        )}

        {activeMenu === 'linen_inventory' && hasPermission(principal, 'canViewLaundry') && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 text-sm text-stone-500">
            Linen inventory coming soon.
          </div>
        )}

        {activeMenu === 'maintenance' && hasPermission(principal, 'canViewMaintenance') && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 text-sm text-stone-500">
            Maintenance module coming soon. Your permissions are ready.
          </div>
        )}

        {activeMenu === 'lost_found' && hasPermission(principal, 'canViewLostFound') && businessId && (
          <LostFoundTab
            mode="employee"
            businessId={businessId}
            businessName={businessName}
            employeeId={employee?.id}
            employeeName={employee?.full_name}
            canCreate={hasPermission(principal, 'canCreateLostFound')}
            canEdit={hasPermission(principal, 'canEditLostFound')}
            canDispose={hasPermission(principal, 'canDisposeLostFound')}
          />
        )}

        {activeMenu === 'reports' &&
          (hasPermission(principal, 'canViewOperationalReports') ||
            hasPermission(principal, 'canViewReports' as any)) && (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 text-sm text-stone-500">
              Operational reports are available from the business Reports tab for authorised roles.
            </div>
          )}

        {activeMenu === 'employees' && hasPermission(principal, 'canManageStaff') && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 text-sm text-stone-500">
            Staff management is available via the business Staff Portal.
          </div>
        )}

        {activeMenu === 'profile' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-2 text-sm">
            <p>
              <span className="text-stone-400">Name</span>
              <br />
              <span className="font-semibold">{employee?.full_name}</span>
            </p>
            <p>
              <span className="text-stone-400">Role</span>
              <br />
              <span className="font-semibold">{displayRole}</span>
            </p>
            <p>
              <span className="text-stone-400">Department</span>
              <br />
              <span className="font-semibold">{displayDept}</span>
            </p>
            <p>
              <span className="text-stone-400">Phone</span>
              <br />
              <span className="font-mono">{employee?.phone_number}</span>
            </p>
          </div>
        )}

        {menu.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">
            No permissions assigned. Contact your administrator.
          </div>
        )}
      </main>

      {showQRModal && businessId && (
        <QRCodeModal
          businessId={businessId}
          businessName={businessName}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
