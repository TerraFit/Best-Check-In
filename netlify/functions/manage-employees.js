// src/components/staff/EmployeeManagementTab.tsx
// ✅ FIXED: Delete and Disable now call the API

import React, { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';

interface Employee {
  id: string;
  business_id: string;
  full_name: string;
  phone_number: string;
  role: 'EmployeeOverview';
  status: 'Pending' | 'Active' | 'Disabled';
  invitation_token: string;
  invitation_expiry: string;
  invited_at: string;
  activated_at?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeManagementTabProps {
  employees: Employee[];
  businessName: string;
  onUpdateEmployees: (employees: Employee[]) => void;
}

export function EmployeeManagementTab({
  employees,
  businessName,
  onUpdateEmployees
}: EmployeeManagementTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Helper to get auth token
  const getAuthToken = (): string | null => {
    try {
      const authStr = localStorage.getItem('fastcheckin_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        return auth?.token || null;
      }
    } catch (err) {
      console.error('Error getting auth:', err);
    }
    return null;
  };

  // ============================================================
  // ✅ ADD EMPLOYEE - Calls API
  // ============================================================
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Please fill out all fields');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert('Session token not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      let formattedPhone = phone.trim();
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+27' + formattedPhone.substring(1);
      }

      const invitationToken = 'FCINV_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const newEmp = {
        full_name: fullName.trim(),
        phone_number: formattedPhone,
        role: 'EmployeeOverview',
        status: 'Pending',
        invitation_token: invitationToken,
        invitation_expiry: expiryDate.toISOString(),
        invited_at: new Date().toISOString()
      };

      console.log('📝 Adding employee:', newEmp);

      const response = await fetch('/.netlify/functions/manage-employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEmp)
      });

      const data = await response.json();
      console.log('📡 Add response:', data);

      if (response.ok && data.success) {
        const updated = [data.data, ...employees];
        onUpdateEmployees(updated);
        setFullName('');
        setPhone('');
        setShowAddForm(false);
        alert(`🎉 Added Employee "${fullName}" successfully!`);
      } else {
        alert(data.error || 'Failed to add employee');
      }
    } catch (error) {
      console.error('❌ Add error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ DELETE EMPLOYEE - Calls DELETE API
  // ============================================================
  const handleRemoveEmployee = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete employee "${name}"? This action cannot be undone.`)) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert('Session token not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      console.log(`🗑️ Deleting employee: ${id} (${name})`);

      const response = await fetch('/.netlify/functions/manage-employees', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: id })
      });

      const data = await response.json();
      console.log('📡 Delete response:', data);

      if (response.ok && data.success) {
        const updated = employees.filter(e => e.id !== id);
        onUpdateEmployees(updated);
        alert(`✅ Employee "${name}" deleted successfully.`);
      } else {
        alert(data.error || 'Failed to delete employee.');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('An error occurred while deleting the employee.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ TOGGLE EMPLOYEE STATUS - Calls PUT/PATCH API
  // ============================================================
  const handleToggleDisable = async (id: string, currentStatus: 'Active' | 'Pending' | 'Disabled', name: string) => {
    const isCurrentlyDisabled = currentStatus === 'Disabled';
    const newStatus = isCurrentlyDisabled ? 'Active' : 'Disabled';
    
    if (!confirm(`Are you sure you want to ${isCurrentlyDisabled ? 'RE-ENABLE' : 'DISABLE'} employee "${name}"?`)) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert('Session token not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      console.log(`🔄 ${newStatus} employee: ${id} (${name})`);

      const response = await fetch('/.netlify/functions/manage-employees', {
        method: 'PUT',  // ✅ Using PUT as the backend expects
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          id: id, 
          status: newStatus 
        })
      });

      const data = await response.json();
      console.log('📡 Status toggle response:', data);

      if (response.ok && data.success) {
        const updated = employees.map(e => 
          e.id === id ? { ...e, status: newStatus, updated_at: new Date().toISOString() } : e
        );
        onUpdateEmployees(updated);
        alert(`✅ Employee "${name}" ${isCurrentlyDisabled ? 're-enabled' : 'disabled'} successfully.`);
      } else {
        alert(data.error || 'Failed to update employee status.');
      }
    } catch (error) {
      console.error('❌ Status toggle error:', error);
      alert('An error occurred while updating employee status.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ SHARE OVERVIEW - WhatsApp
  // ============================================================
  const handleShareOverview = (emp: Employee) => {
    const onboardingUrl = `${window.location.origin}/employee/invite/${emp.invitation_token}`;
    const text = `Hello ${emp.full_name},\n\nYou have been invited to access the FastCheckIn Business Overview.\n\nPlease click the link below to activate your account:\n\n${onboardingUrl}\n\nYou will be asked to create your password.\n\nAfter activation you can install FastCheckIn on your Home Screen for quick access.`;
    const cleanPhone = emp.phone_number.replace(/[^0-9+]/g, '').replace('+', '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // ============================================================
  // ✅ COPY LINK - Clipboard
  // ============================================================
  const handleCopyLink = (emp: Employee) => {
    const onboardingUrl = `${window.location.origin}/employee/invite/${emp.invitation_token}`;
    const message = `Hello ${emp.full_name},\n\nYou have been invited to access the FastCheckIn Business Overview.\n\nPlease click the link below to activate your account:\n\n${onboardingUrl}\n\nYou will be asked to create your password.\n\nAfter activation you can install FastCheckIn on your Home Screen for quick access.`;
    
    navigator.clipboard.writeText(message).then(() => {
      setCopySuccess(emp.id);
      setTimeout(() => setCopySuccess(null), 3000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(emp.id);
      setTimeout(() => setCopySuccess(null), 3000);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header bar with CTA */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 leading-none">
            Employee Accounts
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Authorize read-only employee portals with kitchen synchronization permissions
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          <Plus size={14} /> Add New Employee
        </button>
      </div>

      {/* Add Employee Form Container */}
      {showAddForm && (
        <form 
          onSubmit={handleAddEmployee}
          className="bg-white p-6 rounded-3xl border border-stone-200 shadow-lg space-y-4 max-w-lg animate-scale-in"
        >
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400">
              Create Employee Profile
            </h3>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 py-2.5 px-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="John Chefson"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Mobile Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 py-2.5 px-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                placeholder="+27 82 555 1234"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 hover:bg-stone-950 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Create Invite & Register Employee'}
          </button>
        </form>
      )}

      {/* Employees Grid list */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 border-b border-stone-100 text-stone-400 font-bold uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-4">Employee Name</th>
                <th className="px-6 py-4">Mobile Number</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date Invited</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-center">Action Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400">
                    No employees registered. Click "Add New Employee" to register staff.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-stone-900">{emp.full_name}</td>
                    <td className="px-6 py-4 font-mono text-stone-600">{emp.phone_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                        emp.status === 'Active' ? 'bg-green-100 text-green-800' :
                        emp.status === 'Disabled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-500">
                      {new Date(emp.invited_at).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="px-6 py-4 text-stone-500">
                      {emp.last_login ? new Date(emp.last_login).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleShareOverview(emp)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-[9px] font-bold uppercase transition-all"
                          title="Share onboarding activation link over WhatsApp"
                        >
                          📱 Share
                        </button>

                        <button
                          onClick={() => handleCopyLink(emp)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[9px] font-bold uppercase transition-all"
                          title="Copy activation link to clipboard"
                        >
                          {copySuccess === emp.id ? '✅ Copied!' : '📋 Copy Link'}
                        </button>

                        <button
                          onClick={() => handleToggleDisable(emp.id, emp.status, emp.full_name)}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all ${
                            emp.status === 'Disabled'
                              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                              : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                          }`}
                          disabled={loading}
                        >
                          {emp.status === 'Disabled' ? 'Enable' : 'Disable'}
                        </button>

                        <button
                          onClick={() => handleRemoveEmployee(emp.id, emp.full_name)}
                          className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          disabled={loading}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EmployeeManagementTab;
