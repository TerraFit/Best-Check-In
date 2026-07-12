// src/pages/EmployeeOnboardingPage.tsx
// Employee Onboarding Page - Redirects to Employee Login

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, LockKeyhole, CheckCircle, ShieldAlert, Smartphone } from 'lucide-react';
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
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const mockEmployee: Employee = {
          id: 'emp_' + Date.now(),
          business_id: 'jbay-zebra-lodge',
          full_name: 'New Employee',
          phone_number: '+27 82 555 1234',
          role: 'EmployeeOverview',
          status: 'Pending',
          invitation_token: token || '',
          invitation_expiry: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          invited_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setEmployee(mockEmployee);
        setBusinessName('J-Bay Zebra Lodge');

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid or expired invitation link');
      }
    };

    if (token) {
      fetchEmployee();
    } else {
      setError('No invitation token provided');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [token]);

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
      await new Promise(resolve => setTimeout(resolve, 1000));
      setActivated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-serif font-black text-stone-900">Invitation Invalid</h2>
          <p className="text-stone-500 text-sm leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/business/login')}
            className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-950 transition-all text-xs uppercase"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

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

          {/* Guide to Add to Home Screen (PWA) */}
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

          {/* ✅ CHANGED: Redirect to Employee Login instead of Business Login */}
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
          <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-800 font-medium">
            👋 Welcome <strong>{employee?.full_name || 'New Employee'}</strong>! Your employer has invited you to access the Business Overview.
          </div>

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
        </div>
      </div>
    </div>
  );
}

export default EmployeeOnboardingPage;
