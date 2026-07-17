// src/pages/EmployeeOnboardingPage.tsx
// ✅ FIXED: All login redirects now go to /employee/login
// ✅ FIXED: JSX syntax error

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, LockKeyhole, CheckCircle, ShieldAlert, Smartphone, User, Calendar, Clock } from 'lucide-react';
import Logo from '../components/Logo';

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

function EmployeeOnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [fetching, setFetching] = useState(true);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // ============================================================
  // ✅ FETCH EMPLOYEE BY TOKEN
  // ============================================================
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!token) {
        setError('No invitation token provided');
        setFetching(false);
        return;
      }

      try {
        console.log('🔍 Fetching employee for token:', token);
        const response = await fetch(`/.netlify/functions/get-employee-by-token?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        console.log('📡 Response:', data);

        if (response.ok && data.success && data.employee) {
          setEmployee(data.employee);
          setBusinessName(data.businessName || 'J-Bay Zebra Lodge');
          setIsTokenValid(true);
        } else if (response.status === 404) {
          setError('Invalid or expired invitation link. Please request a new one from your employer.');
          setIsTokenValid(false);
        } else {
          setError(data.error || 'Failed to verify invitation. Please try again.');
          setIsTokenValid(false);
        }
      } catch (err) {
        console.error('❌ Error fetching employee:', err);
        setError('Network error. Please check your connection and try again.');
        setIsTokenValid(false);
      } finally {
        setFetching(false);
      }
    };

    fetchEmployee();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [token]);

  // ============================================================
  // ✅ PASSWORD STRENGTH CALCULATOR
  // ============================================================
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-stone-200' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 1: return { score, label: 'Weak', color: 'bg-red-500' };
      case 2: return { score, label: 'Fair', color: 'bg-orange-500' };
      case 3: return { score, label: 'Good', color: 'bg-blue-500' };
      case 4: return { score, label: 'Excellent (Very Strong)', color: 'bg-green-500' };
      default: return { score: 0, label: '', color: 'bg-stone-200' };
    }
  }, [password]);

  // ============================================================
  // ✅ ACTIVATE EMPLOYEE
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passwordStrength.score < 2) {
      setError('Password is too weak. Please include at least 8 characters with letters, numbers, or symbols.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Confirm password does not match.');
      return;
    }

    setLoading(true);

    try {
      console.log('🔵 Activating employee with token:', token);
      
      const response = await fetch('/.netlify/functions/activate-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: token,
          password: password 
        })
      });

      const data = await response.json();
      console.log('🔵 Activation response:', data);

      if (response.ok && data.success) {
        setActivated(true);
        if (data.employee) {
          setEmployee(prev => prev ? { ...prev, ...data.employee } : data.employee);
        }
      } else {
        setError(data.error || 'Activation failed. Please try again.');
      }
    } catch (err) {
      console.error('❌ Activation error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ PWA INSTALL HANDLER
  // ============================================================
  const triggerPWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted PWA installation');
      }
      setDeferredPrompt(null);
    } else {
      alert('PWA native prompt is not available on this browser. Please follow the guides below to manually add to your home screen.');
    }
  };

  // ============================================================
  // ✅ LOADING STATE
  // ============================================================
  if (fetching) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ✅ ERROR STATE
  // ============================================================
  if (error && !activated) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-serif font-black text-stone-900">Invitation Invalid</h2>
          <p className="text-stone-500 text-sm leading-relaxed">{error}</p>
          
          <button
            onClick={() => navigate('/employee/login')}
            className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold py-3 rounded-xl transition-all text-xs uppercase"
          >
            Go to Employee Login
          </button>
          
          <button
            onClick={() => navigate('/business/login')}
            className="w-full mt-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-3 rounded-xl transition-all text-xs uppercase"
          >
            ← Back to Business Login
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // ✅ SUCCESS STATE (Activated)
  // ============================================================
  if (activated && employee) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] p-10 max-w-xl w-full text-center space-y-8 shadow-2xl animate-fade-in">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={44} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-black text-stone-900">Account successfully activated!</h2>
            <p className="text-stone-500 text-sm">
              Welcome aboard, <strong>{employee.full_name}</strong>. You are now authorized to access the {businessName} Business Overview.
            </p>
          </div>

          <div className="bg-stone-50 rounded-xl p-4 grid grid-cols-2 gap-4 text-left text-xs">
            <div>
              <p className="text-stone-400 font-medium uppercase tracking-wider">Employee</p>
              <p className="font-semibold text-stone-800">{employee.full_name}</p>
            </div>
            <div>
              <p className="text-stone-400 font-medium uppercase tracking-wider">Phone</p>
              <p className="font-mono text-stone-700">{employee.phone_number}</p>
            </div>
            <div>
              <p className="text-stone-400 font-medium uppercase tracking-wider">Role</p>
              <p className="text-stone-700 capitalize">{employee.role || 'Employee'}</p>
            </div>
            <div>
              <p className="text-stone-400 font-medium uppercase tracking-wider">Status</p>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Active</span>
            </div>
          </div>

          <div className="border-t border-b border-stone-100 py-6 space-y-4 text-left">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 text-center">
              Add FastCheckIn to your Home Screen
            </h3>

            {deferredPrompt ? (
              <button
                onClick={triggerPWAInstall}
                className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs uppercase"
              >
                <Smartphone size={16} /> Install FastCheckIn App
              </button>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-stone-50 p-4 rounded-xl space-y-1">
                  <p className="font-bold text-xs text-stone-800">📱 Android Chrome</p>
                  <p className="text-[11px] text-stone-500 leading-normal">
                    1. Tap the three dots (⋮)<br />
                    2. Tap "Add to Home Screen"
                  </p>
                </div>
                <div className="bg-stone-50 p-4 rounded-xl space-y-1">
                  <p className="font-bold text-xs text-stone-800">🍎 iPhone Safari</p>
                  <p className="text-[11px] text-stone-500 leading-normal">
                    1. Tap the Share button (📤)<br />
                    2. Select "Add to Home Screen"
                  </p>
                </div>
                <div className="bg-stone-50 p-4 rounded-xl space-y-1">
                  <p className="font-bold text-xs text-stone-800">💻 Desktop Chrome</p>
                  <p className="text-[11px] text-stone-500 leading-normal">
                    Click the Install Icon in the top address bar.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/employee/login')}
            className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold py-4 rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider"
          >
            🚀 Launch Employee Dashboard →
          </button>
          
          <button
            onClick={() => navigate('/business/login')}
            className="w-full mt-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider"
          >
            ← Back to Business Login
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // ✅ FORM STATE
  // ============================================================
  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <Logo size="lg" className="justify-center" />
        <h2 className="text-3xl font-serif font-black tracking-tight text-white leading-none">
          Employee Onboarding
        </h2>
        <p className="text-stone-400 text-sm">
          Set your secure login password for {businessName || 'your business'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-stone-200 space-y-6">
          
          <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-800 font-medium flex items-start gap-3">
            <User size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-bold">Welcome {employee?.full_name || 'New Employee'}</span>
              <span className="block text-amber-700 font-normal mt-0.5">
                Your employer has invited you to access the Business Overview portal.
              </span>
            </div>
          </div>

          {employee && (
            <div className="bg-stone-50 p-3 rounded-xl grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-stone-400">Phone</span>
                <p className="font-mono text-stone-700">{employee.phone_number}</p>
              </div>
              <div>
                <span className="text-stone-400">Invited</span>
                <p className="text-stone-700 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(employee.invited_at).toLocaleDateString('en-ZA')}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-stone-400">Expires</span>
                <p className="text-stone-700 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(employee.invitation_expiry).toLocaleDateString('en-ZA')}
                  <span className="text-[10px] text-stone-400 ml-2">(7 days from invite)</span>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 py-3 pl-10 pr-10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="At least 8 characters..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {password && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-semibold text-stone-500">
                    <span>Password Strength:</span>
                    <span className="text-stone-700">{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`} 
                      style={{ width: `${passwordStrength.score * 25}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Confirm Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 py-3 pl-10 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Re-enter password..."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
                <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-800 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold py-4 rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-stone-950 border-t-transparent" />
                  Activating...
                </>
              ) : (
                'Create Password & Activate Account'
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => navigate('/business/login')}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              ← Back to Business Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeOnboardingPage;
