import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate, 
  useParams, 
  useLocation 
} from 'react-router-dom';
import { 
  X, Phone, Mail, Globe, User, Calendar, Users, 
  MapPin, Utensils, ArrowRight, Lock, Plus, Edit, Trash2, 
  Shield, ShieldAlert, CheckCircle, TrendingUp, Sparkles, 
  Clock, Download, LogOut, Menu, Settings, AlertCircle, 
  Eye, EyeOff, Smartphone, Laptop, Key, FileText, Check, 
  ChevronRight, LockKeyhole, ClipboardList, Info, QrCode
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import QRCode from 'qrcode';

import { Logo } from './components/Logo';
import { IndemnityText } from './components/IndemnityText';
import { 
  Booking, Employee, FoodRestrictions, FoodRestrictionAuditLog, 
  UserRole, BusinessConfig, AuthUser, AuthSession 
} from './types';

// ============================================================
// 🌐 GLOBAL TRANSLATIONS & TRANSLATION HOOK
// ============================================================

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    common_welcome: "Welcome",
    common_welcome_home: "Welcome Home",
    common_loading: "Loading...",
    common_cancel: "Cancel",
    common_processing: "Processing...",
    common_back_to_details: "← Return to Details",
    common_back: "Back",
    common_powered_by: "Powered by",
    checkin_title: "Statutory Registration",
    checkin_personal_details: "Personal Registry",
    checkin_immigration_act: "Immigration Act Requirement (Section 40)",
    checkin_first_name: "First Name",
    checkin_last_name: "Surname",
    checkin_passport: "Passport / ID Number",
    checkin_phone: "Mobile Phone",
    checkin_country: "Country of Origin",
    checkin_city: "City / Town",
    checkin_arrival_date: "Arrival Date",
    checkin_nights: "Number of Nights",
    checkin_referral: "How did you hear about us?",
    checkin_next_destination: "Next Destination",
    checkin_settlement: "Method of Settlement",
    checkin_indemnity: "Indemnity & Waiver",
    checkin_signature: "Digital Signature",
    checkin_id_photo: "ID Photo",
    checkin_complete_button: "Complete Registration",
    checkin_success_message: "Check-in Complete! 🎉",
    checkin_confirmation_sent: "A confirmation email has been sent to {email}",
    checkin_email_label: "Confirm your Email *",
    checkin_save_details: "Save my details for next time",
    checkin_save_details_sub: "Your information will be securely stored for faster check-ins",
    checkin_profile_loaded: "Your saved details have been loaded",
    checkin_profile_saved: "Your details have been saved for next time",
    checkin_popia_consent: "Get exclusive offers and updates from {businessName}. Unsubscribe anytime.",
    checkin_begin_button: "Begin Statutory Check-In",
    checkin_immigration_act_short: "Immigration Act (Section 40)",
    checkin_select_country: "Select Country",
    checkin_select_province: "Select Province",
    checkin_enter_province: "Enter your province",
    checkin_select_referral: "Select referral source",
    checkin_select_settlement: "Select Settlement",
    checkin_continue_indemnity: "Continue to Indemnity",
    checkin_signature_instruction: "Sign with your finger or mouse",
    checkin_adults: "Adults (Sharing)",
    checkin_children: "Children (Under 16 sharing with adults)",
    success_checkin_complete: "Check-in Complete! 🎉",
    success_welcome: "Welcome to {businessName}",
    success_email_sent: "A confirmation email has been sent to {email}",
    success_next_steps: "What's next?",
    success_step_checkin_recorded: "Your check-in has been recorded",
    success_step_email_sent: "A confirmation email has been sent",
    success_step_keys: "Please proceed to reception to collect your keys",
    success_new_guest_button: "Check in another guest",
    indemnity_accept: "I hereby certify that I have read and accepted the Terms and Conditions and the Waiver and Indemnity as displayed above.",
    indemnity_scroll_bottom: "— End of Document —",
    indemnity_scroll_to_accept: "↓ Scroll to bottom of document to enable acceptance ↓",
    error_id_photo_required: "ID photo is required",
    error_signature_required: "Digital signature is required",
    error_indemnity_scroll: "Please read to the bottom of the indemnity",
    error_required_fields: "Missing required fields",
    error_first_name_required: "First name is required",
    error_last_name_required: "Last name is required",
    error_passport_required: "Passport or ID number is required",
    error_phone_required: "Mobile phone number is required",
    error_country_required: "Country of origin is required",
    error_city_required: "City is required",
    error_arrival_date_required: "Arrival date is required",
    error_nights_required: "Number of nights is required",
    error_referral_required: "Please select how you heard about us",
    error_next_destination_required: "Next destination is required",
    error_settlement_required: "Please select your payment method",
    error_booking_failed: "Failed to save check-in to database",
    warning_duplicate_booking: "Warning: A duplicate booking has been detected for today.",
    error_email_failed: "Email sending failed",
    error_unexpected: "An unexpected error occurred. Please try again.",
    dashboard_total_checkins: "Total Check-ins",
    marketing_consents: "Marketing Consents",
    marketing_consents_toggle_off: "OFF",
    marketing_consents_toggle_on: "ON",
    marketing_consents_total: "total",
    marketing_consents_count: "consented"
  }
};

export function useTranslation() {
  const [lang, setLang] = useState('en');
  const t = (key: string, params?: Record<string, string | number>) => {
    let text = TRANSLATIONS.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };
  return { t, language: lang, setLanguage: setLang };
}

// ============================================================
// 📦 LOCAL STORAGE / MOCK DATABASE INITIALIZER
// ============================================================

const SEED_BUSINESS: BusinessConfig = {
  id: 'jbay-zebra-lodge',
  trading_name: 'J-Bay Zebra Lodge',
  registered_name: 'J-Bay Zebra Lodge (Pty) Ltd',
  slogan: 'Seamless Check-in, Smarter Stay',
  welcome_message: 'Welcome to J-Bay Zebra Lodge, where luxury meets the wild cost of the Eastern Cape.',
  logo_url: '/fastcheckin-logo.png',
  hero_image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  total_rooms: 12,
  avg_price: 1850
};

const SEED_BOOKINGS: Booking[] = [
  {
    id: 'B-82194',
    business_id: 'jbay-zebra-lodge',
    guest_name: 'John Doe',
    guest_first_name: 'John',
    guest_last_name: 'Doe',
    guest_email: 'john.doe@gmail.com',
    guest_phone: '+27 82 123 4567',
    guest_country: 'South Africa',
    guest_province: 'Gauteng',
    guest_city: 'Johannesburg',
    passport_or_id: '9201015082083',
    check_in_date: '2026-07-09',
    check_out_date: '2026-07-12',
    nights: 3,
    adults: 2,
    children: 0,
    total_amount: 5550,
    status: 'checked_in',
    booking_source: 'Booking.com',
    referral_source: 'Google Search',
    popia_marketing_consent: true,
    arriving_from: 'Johannesburg',
    next_destination: 'Port Elizabeth',
    food_restrictions: {
      vegetarian: false,
      vegan: false,
      halal: true,
      kosher: false,
      gluten_free: true,
      dairy_free: false,
      lactose_intolerant: false,
      nut_allergy: false,
      shellfish_allergy: false,
      egg_allergy: false,
      soy_allergy: false,
      pork_free: true,
      diabetic: false,
      no_seafood: false,
      other: false,
      other_text: ''
    },
    created_at: '2026-07-09T10:15:00Z',
    updated_at: '2026-07-09T10:15:00Z'
  },
  {
    id: 'B-73821',
    business_id: 'jbay-zebra-lodge',
    guest_name: 'Sarah Connor',
    guest_first_name: 'Sarah',
    guest_last_name: 'Connor',
    guest_email: 'sarah.c@cyberdyne.co.uk',
    guest_phone: '+44 7911 123456',
    guest_country: 'United Kingdom',
    guest_province: 'Greater London',
    guest_city: 'London',
    passport_or_id: 'PO982138A',
    check_in_date: '2026-07-08',
    check_out_date: '2026-07-15',
    nights: 7,
    adults: 1,
    children: 1,
    total_amount: 12950,
    status: 'checked_in',
    booking_source: 'Direct Website',
    referral_source: 'Instagram Ad',
    popia_marketing_consent: true,
    arriving_from: 'London',
    next_destination: 'Kruger National Park',
    food_restrictions: {
      vegetarian: false,
      vegan: false,
      halal: false,
      kosher: false,
      gluten_free: false,
      dairy_free: true,
      lactose_intolerant: true,
      nut_allergy: true,
      shellfish_allergy: false,
      egg_allergy: false,
      soy_allergy: false,
      pork_free: false,
      diabetic: false,
      no_seafood: false,
      other: true,
      other_text: 'No raw eggs'
    },
    created_at: '2026-07-08T14:30:00Z',
    updated_at: '2026-07-08T14:30:00Z'
  },
  {
    id: 'B-92011',
    business_id: 'jbay-zebra-lodge',
    guest_name: 'Pieter Botha',
    guest_first_name: 'Pieter',
    guest_last_name: 'Botha',
    guest_email: 'pbotha@outlook.co.za',
    guest_phone: '+27 71 987 6543',
    guest_country: 'South Africa',
    guest_province: 'Western Cape',
    guest_city: 'Stellenbosch',
    passport_or_id: '8506065098081',
    check_in_date: '2026-07-05',
    check_out_date: '2026-07-09',
    nights: 4,
    adults: 2,
    children: 2,
    total_amount: 7400,
    status: 'completed',
    booking_source: 'Expedia',
    referral_source: 'Recommended by friend',
    popia_marketing_consent: false,
    arriving_from: 'Stellenbosch',
    next_destination: 'Durban',
    food_restrictions: {
      vegetarian: true,
      vegan: false,
      halal: false,
      kosher: false,
      gluten_free: false,
      dairy_free: false,
      lactose_intolerant: false,
      nut_allergy: false,
      shellfish_allergy: false,
      egg_allergy: false,
      soy_allergy: false,
      pork_free: true,
      diabetic: false,
      no_seafood: false,
      other: false,
      other_text: ''
    },
    created_at: '2026-07-05T12:00:00Z',
    updated_at: '2026-07-09T10:00:00Z'
  }
];

const MOCK_EMPLOYEES: any[] = [
  {
    id: 'emp_1',
    business_id: 'jbay-zebra-lodge',
    full_name: 'John Chefson',
    phone_number: '+27 82 555 1234',
    password_hash: 'scrypt_hashed_pwd', // Simulating hash
    role: 'EmployeeOverview',
    status: 'Active',
    invitation_token: 'active-token-1',
    invitation_expiry: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    invited_at: '2026-07-01T09:00:00Z',
    activated_at: '2026-07-02T10:15:00Z',
    last_login: '2026-07-09T08:00:00Z',
    created_at: '2026-07-01T09:00:00Z',
    updated_at: '2026-07-02T10:15:00Z'
  },
  {
    id: 'emp_2',
    business_id: 'jbay-zebra-lodge',
    full_name: 'Alice Kitchener',
    phone_number: '+27 83 555 9876',
    role: 'EmployeeOverview',
    status: 'Pending',
    invitation_token: 'pending-token-2',
    invitation_expiry: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    invited_at: '2026-07-08T11:00:00Z',
    created_at: '2026-07-08T11:00:00Z',
    updated_at: '2026-07-08T11:00:00Z'
  }
];

const SEED_AUDIT_LOGS: FoodRestrictionAuditLog[] = [
  {
    id: 'audit_1',
    business_id: 'jbay-zebra-lodge',
    employee_id: 'emp_1',
    employee_name: 'John Chefson',
    guest_id: 'B-82194',
    guest_name: 'John Doe',
    previous_value: 'None',
    new_value: 'Halal, Gluten-Free, Pork-Free',
    timestamp: '2026-07-09T08:30:00Z'
  }
];

export function initializeDatabase() {
  if (!localStorage.getItem('fci_business')) {
    localStorage.setItem('fci_business', JSON.stringify(SEED_BUSINESS));
  }
  if (!localStorage.getItem('fci_bookings')) {
    localStorage.setItem('fci_bookings', JSON.stringify(SEED_BOOKINGS));
  }
  if (!localStorage.getItem('fci_employees')) {
    localStorage.setItem('fci_employees', JSON.stringify(MOCK_EMPLOYEES));
  }
  if (!localStorage.getItem('fci_audit_logs')) {
    localStorage.setItem('fci_audit_logs', JSON.stringify(SEED_AUDIT_LOGS));
  }
}

// ============================================================
// 🛠️ DB ACESSOR WRAPPERS
// ============================================================

export const db = {
  getBusiness: (): BusinessConfig => {
    return JSON.parse(localStorage.getItem('fci_business') || JSON.stringify(SEED_BUSINESS));
  },
  updateBusiness: (config: BusinessConfig) => {
    localStorage.setItem('fci_business', JSON.stringify(config));
  },
  getBookings: (): Booking[] => {
    return JSON.parse(localStorage.getItem('fci_bookings') || JSON.stringify(SEED_BOOKINGS));
  },
  saveBookings: (bookings: Booking[]) => {
    localStorage.setItem('fci_bookings', JSON.stringify(bookings));
  },
  getEmployees: (): Employee[] => {
    return JSON.parse(localStorage.getItem('fci_employees') || JSON.stringify(MOCK_EMPLOYEES));
  },
  saveEmployees: (employees: Employee[]) => {
    localStorage.setItem('fci_employees', JSON.stringify(employees));
  },
  getAuditLogs: (): FoodRestrictionAuditLog[] => {
    return JSON.parse(localStorage.getItem('fci_audit_logs') || '[]');
  },
  saveAuditLogs: (logs: any[]) => {
    localStorage.setItem('fci_audit_logs', JSON.stringify(logs));
  }
};

// ============================================================
// 🔒 AUTH UTILITIES
// ============================================================

export function getSession(): AuthSession | null {
  const sessionStr = localStorage.getItem('fci_session');
  if (!sessionStr) return null;
  return JSON.parse(sessionStr);
}

export function saveSession(session: AuthSession) {
  localStorage.setItem('fci_session', JSON.stringify(session));
}

export function destroySession() {
  localStorage.removeItem('fci_session');
}

// ============================================================
// 🌎 GLOBAL CONSTANTS
// ============================================================

const COUNTRIES = [
  'South Africa', 'United Kingdom', 'Germany', 'Netherlands', 'United States',
  'Canada', 'Australia', 'New Zealand', 'France', 'Switzerland', 'Namibia',
  'Botswana', 'Zimbabwe', 'Mozambique', 'Lesotho', 'Eswatini', 'Other'
];

const PROVINCES: Record<string, string[]> = {
  'South Africa': [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  ],
  'Namibia': ['Erongo', 'Hardap', 'Karas', 'Khomas', 'Kunene', 'Zambezi'],
  'Zimbabwe': ['Bulawayo', 'Harare', 'Manicaland', 'Midlands']
};

const REFERRALS = [
  'Word of Mouth', 'Google Search', 'Booking.com', 'Airbnb', 'Instagram',
  'Facebook', 'Travel Agency', 'Returning Guest', 'Other'
];

const SETTLEMENTS = [
  'Credit / Debit Card', 'EFT / Bank Transfer', 'Cash on Arrival', 'Corporate Invoice'
];

const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
  { key: 'gluten_free', label: 'Gluten-Free' },
  { key: 'dairy_free', label: 'Dairy-Free' },
  { key: 'lactose_intolerant', label: 'Lactose Intolerant' },
  { key: 'nut_allergy', label: 'Nut Allergy' },
  { key: 'shellfish_allergy', label: 'Shellfish Allergy' },
  { key: 'egg_allergy', label: 'Egg Allergy' },
  { key: 'soy_allergy', label: 'Soy Allergy' },
  { key: 'pork_free', label: 'Pork-Free' },
  { key: 'diabetic', label: 'Diabetic' },
  { key: 'no_seafood', label: 'No Seafood' }
];

// ============================================================
// 🌐 MAIN APPLICATION COORDINATOR (SPA)
// ============================================================

export default function App() {
  useEffect(() => {
    initializeDatabase();
  }, []);

  const [session, setSession] = useState<AuthSession | null>(getSession());
  const [employees, setEmployees] = useState<Employee[]>(db.getEmployees());
  const [bookings, setBookings] = useState<Booking[]>(db.getBookings());
  const [auditLogs, setAuditLogs] = useState<FoodRestrictionAuditLog[]>(db.getAuditLogs());
  const [business, setBusiness] = useState<BusinessConfig>(db.getBusiness());

  // Keep state synchronized with database writes
  const updateBookingsInStateAndDb = (newBookings: Booking[]) => {
    setBookings(newBookings);
    db.saveBookings(newBookings);
  };

  const updateEmployeesInStateAndDb = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    db.saveEmployees(newEmployees);
  };

  const addAuditLogInStateAndDb = (log: FoodRestrictionAuditLog) => {
    const updated = [log, ...auditLogs];
    setAuditLogs(updated);
    db.saveAuditLogs(updated);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC FRONT END */}
        <Route path="/" element={<HomeLandingPage />} />
        
        {/* DIGITAL CHECKIN ROUTE */}
        <Route 
          path="/checkin" 
          element={
            <CheckInApp 
              business={business} 
              onCheckInComplete={(booking) => {
                const updatedBookings = [booking, ...bookings];
                updateBookingsInStateAndDb(updatedBookings);
              }}
            />
          } 
        />
        <Route 
          path="/checkin/:businessId" 
          element={
            <CheckInApp 
              business={business} 
              onCheckInComplete={(booking) => {
                const updatedBookings = [booking, ...bookings];
                updateBookingsInStateAndDb(updatedBookings);
              }}
            />
          } 
        />

        {/* UNIFIED LOGIN PAGE */}
        <Route 
          path="/business/login" 
          element={
            <UnifiedLoginPage 
              session={session} 
              onLoginSuccess={(newSession) => {
                saveSession(newSession);
                setSession(newSession);
              }} 
            />
          } 
        />

        {/* ONBOARDING INVITATION ACTIVATE PAGE */}
        <Route 
          path="/employee/invite/:token" 
          element={
            <EmployeeOnboardingPage 
              business={business}
              employees={employees}
              onActivationSuccess={(activatedEmp) => {
                const updated = employees.map(e => e.id === activatedEmp.id ? activatedEmp : e);
                updateEmployeesInStateAndDb(updated);
              }}
            />
          } 
        />

        {/* SECURE DASHBOARDS ROUTER */}
        <Route 
          path="/business/dashboard" 
          element={
            <SecureDashboardRouter 
              session={session} 
              business={business}
              bookings={bookings}
              employees={employees}
              auditLogs={auditLogs}
              onLogout={() => {
                destroySession();
                setSession(null);
              }}
              onUpdateBookings={updateBookingsInStateAndDb}
              onUpdateEmployees={updateEmployeesInStateAndDb}
              onAddAuditLog={addAuditLogInStateAndDb}
              onUpdateBusiness={(newBiz) => {
                setBusiness(newBiz);
                db.updateBusiness(newBiz);
              }}
            />
          } 
        />

        {/* CATCH-ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ============================================================
// 🏠 PAGE: HOME LANDING PAGE
// ============================================================

function HomeLandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-stone-900 text-white flex flex-col justify-between">
      {/* Navbar */}
      <header className="px-6 py-4 bg-stone-950/80 backdrop-blur-md border-b border-stone-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo size="md" />
          <button 
            onClick={() => navigate('/business/login')}
            className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 text-sm"
          >
            Management Login
          </button>
        </div>
      </header>

      {/* Hero Content */}
      <main className="flex-grow flex items-center justify-center py-20 px-6 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="max-w-4xl text-center space-y-8 relative z-10">
          <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight leading-none text-white">
            Digital Check-in &{' '}<span className="text-amber-500">Kitchen Synchronisation</span>
          </h1>
          <p className="text-stone-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-sans">
            FastCheckIn provides secure statutory guest registration, digital indemnity waiver collections, and an interactive portal for kitchen operations to monitor dietary restrictions in real-time.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/checkin')}
              className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold px-10 py-5 rounded-2xl transition-all shadow-xl shadow-amber-500/10 uppercase tracking-wider text-xs"
            >
              Start Guest Check-in Form
            </button>
            <button
              onClick={() => navigate('/business/login')}
              className="bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white font-bold px-10 py-5 rounded-2xl transition-all uppercase tracking-wider text-xs"
            >
              Go to Portal Dashboard
            </button>
          </div>

          {/* Quick Stats overview */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-10 border-t border-stone-800 text-stone-400">
            <div>
              <p className="text-3xl font-bold font-serif text-white">100%</p>
              <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">POPIA Compliant</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-serif text-white">&lt; 1 Min</p>
              <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">Check-in Time</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-serif text-white">Live</p>
              <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">Kitchen Sync</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-500 py-6 text-center text-xs border-t border-stone-800">
        <p>&copy; 2026 FastCheckIn. All rights reserved. Powered by www.fastcheckin.co.za</p>
      </footer>
    </div>
  );
}

// ============================================================
// 🔑 PAGE: UNIFIED LOGIN PAGE (Supports Owner Email & Staff Phone)
// ============================================================

interface UnifiedLoginProps {
  session: AuthSession | null;
  onLoginSuccess: (session: AuthSession) => void;
}

function UnifiedLoginPage({ session, onLoginSuccess }: UnifiedLoginProps) {
  const navigate = useNavigate();
  
  const [loginType, setLoginType] = useState<'owner' | 'employee'>('owner');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect automatically to dashboard
  useEffect(() => {
    if (session) {
      navigate('/business/dashboard');
    }
  }, [session, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      try {
        if (loginType === 'owner') {
          // Check for Owner Seed Admin Account
          if (email.toLowerCase().trim() === 'owner@jbay.com' && password === 'admin123') {
            const successSession: AuthSession = {
              token: 'owner-session-token-' + Date.now(),
              user: {
                id: 'owner_1',
                email: 'owner@jbay.com',
                full_name: 'J-Bay Zebra Lodge Admin',
                role: 'owner',
                business_id: 'jbay-zebra-lodge'
              }
            };
            onLoginSuccess(successSession);
            navigate('/business/dashboard');
            return;
          }
          throw new Error('Invalid owner email or password.');
        } else {
          // Check for Employee Mobile Login
          const cleanedPhone = phone.trim();
          const employeesList = db.getEmployees();
          const empMatch = employeesList.find(e => e.phone_number.replace(/\s+/g, '') === cleanedPhone.replace(/\s+/g, ''));
          
          if (!empMatch) {
            throw new Error('Employee account not found. Please contact the business administrator.');
          }

          if (empMatch.status === 'Disabled') {
            throw new Error('This employee account has been disabled. Access denied.');
          }

          if (empMatch.status === 'Pending') {
            throw new Error('Your account is pending activation. Please click the link shared with you over WhatsApp to create your password.');
          }

          // In standard flow we compare password. Since it is simulated, we'll allow standard "password123" or whatever they activated with
          if (password === 'password123' || password === empMatch.password_hash) {
            // Success
            const successSession: AuthSession = {
              token: 'employee-session-token-' + Date.now(),
              user: {
                id: empMatch.id,
                phone_number: empMatch.phone_number,
                full_name: empMatch.full_name,
                role: 'EmployeeOverview',
                business_id: 'jbay-zebra-lodge'
              }
            };
            
            // Record last login in employees table
            const updated = employeesList.map(e => e.id === empMatch.id ? { ...e, last_login: new Date().toISOString() } : e);
            db.saveEmployees(updated);

            onLoginSuccess(successSession);
            navigate('/business/dashboard');
            return;
          }
          throw new Error('Incorrect password.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Logo size="lg" className="justify-center" />
        <h2 className="text-3xl font-serif font-black tracking-tight text-white mt-4">
          Management & Staff Login
        </h2>
        <p className="text-stone-400 text-sm">
          Access your secure Business Overview or Kitchen Sync portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-stone-200">
          
          {/* Segmented Switch Toggle */}
          <div className="flex bg-stone-100 p-1.5 rounded-xl gap-2 mb-6">
            <button
              onClick={() => {
                setLoginType('owner');
                setError(null);
              }}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                loginType === 'owner'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              🏢 Owner Login
            </button>
            <button
              onClick={() => {
                setLoginType('employee');
                setError(null);
              }}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                loginType === 'employee'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              🧑‍🍳 Staff Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-800 font-medium">{error}</p>
              </div>
            )}

            {loginType === 'owner' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Owner Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 py-3 pl-10 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="owner@jbay.com"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Staff Phone Number (international format)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 py-3 pl-10 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                    placeholder="+27821112222"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 py-3 pl-10 pr-10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 hover:bg-stone-950 text-white font-bold py-4 rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Verifying...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Test credentials hints */}
          <div className="mt-8 pt-6 border-t border-stone-100 space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Demo Credentials (Seed Database)
            </h4>
            <div className="text-[11px] text-stone-500 space-y-1">
              <p>🏢 Owner Email: <strong className="font-mono text-stone-700">owner@jbay.com</strong> / <strong className="font-mono text-stone-700">admin123</strong></p>
              <p>🧑‍🍳 Staff Phone: <strong className="font-mono text-stone-700">+27 82 555 1234</strong> / <strong className="font-mono text-stone-700">password123</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🧑‍🍳 PAGE: EMPLOYEE ONBOARDING / ACTIVATION PAGE
// ============================================================

interface OnboardingProps {
  business: BusinessConfig;
  employees: Employee[];
  onActivationSuccess: (activatedEmployee: Employee) => void;
}

function EmployeeOnboardingPage({ business, employees, onActivationSuccess }: OnboardingProps) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  
  // PWA Prompt Support State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Find matching employee by token
    const match = employees.find(e => e.invitation_token === token);
    if (!match) {
      setError('Invalid or expired invitation token. Please request a new invite link from your employer.');
      return;
    }

    // Check expiry (7 days)
    const isExpired = new Date() > new Date(match.invitation_expiry);
    if (isExpired) {
      setError('This invitation link has expired. Links remain valid for 7 days.');
      return;
    }

    // Prevent reuse of used invitation link
    if (match.status === 'Active') {
      setError('This invitation has already been used to activate an account.');
      return;
    }

    setEmployee(match);

    // Watch for PWA native prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [token, employees]);

  // Password strength calculations
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

  const handleSubmit = (e: React.FormEvent) => {
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

    setTimeout(() => {
      if (employee) {
        const updatedEmployee: Employee = {
          ...employee,
          status: 'Active',
          password_hash: password, // Store in plaintext mock for ease of validation
          activated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onActivationSuccess(updatedEmployee);
        setActivated(true);
      }
      setLoading(false);
    }, 1000);
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
          <h2 className="text-2xl font-serif font-black text-stone-900">Invitation Expired</h2>
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
              Welcome aboard, <strong>{employee.full_name}</strong>. You are authorized as an employee under {business.trading_name}.
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

          <button
            onClick={() => navigate('/business/login')}
            className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-stone-950 transition-all text-xs uppercase tracking-wider"
          >
            Launch Employee Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        {business.logo_url && (
          <img src={business.logo_url} alt={business.trading_name} className="h-16 w-auto mx-auto object-contain" />
        )}
        <h2 className="text-3xl font-serif font-black tracking-tight text-white leading-none">
          Employee Onboarding
        </h2>
        <p className="text-stone-400 text-sm">
          Set your secure login password for {business.trading_name}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-stone-200 space-y-6">
          <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-800 font-medium">
            👋 Welcome <strong>{employee?.full_name}</strong>! Your employer has invited you to access the Business Overview.
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
              
              {/* Strength Meter Bar */}
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

// ============================================================
// 🔒 ROUTE SECURITY WRAPPER (RBAC)
// ============================================================

interface SecureDashboardRouterProps {
  session: AuthSession | null;
  business: BusinessConfig;
  bookings: Booking[];
  employees: Employee[];
  auditLogs: FoodRestrictionAuditLog[];
  onLogout: () => void;
  onUpdateBookings: (bookings: Booking[]) => void;
  onUpdateEmployees: (employees: Employee[]) => void;
  onAddAuditLog: (log: FoodRestrictionAuditLog) => void;
  onUpdateBusiness: (business: BusinessConfig) => void;
}

function SecureDashboardRouter({
  session,
  business,
  bookings,
  employees,
  auditLogs,
  onLogout,
  onUpdateBookings,
  onUpdateEmployees,
  onAddAuditLog,
  onUpdateBusiness
}: SecureDashboardRouterProps) {
  const navigate = useNavigate();

  // Route Guard Block
  useEffect(() => {
    if (!session) {
      navigate('/business/login');
    }
  }, [session, navigate]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      {/* Upper Navigation Bar */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <span className="hidden sm:inline-block px-3 py-1 bg-stone-100 rounded-lg text-xs font-bold text-stone-500 uppercase">
                {session.user.role === 'owner' ? '🔑 Administrator' : '🧑‍🍳 Employee Portal'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="font-bold text-xs text-stone-800">{session.user.full_name}</p>
                <p className="text-[10px] text-stone-400 capitalize">{session.user.role === 'owner' ? 'Business Owner' : 'Kitchen Support'}</p>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 hover:border-red-200 text-stone-600 hover:text-red-600 rounded-xl text-xs font-semibold transition-all"
              >
                <LogOut size={12} /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Actual Portal Content Rendering */}
      <PortalDashboardView
        session={session}
        business={business}
        bookings={bookings}
        employees={employees}
        auditLogs={auditLogs}
        onUpdateBookings={onUpdateBookings}
        onUpdateEmployees={onUpdateEmployees}
        onAddAuditLog={onAddAuditLog}
        onUpdateBusiness={onUpdateBusiness}
      />
    </div>
  );
}

// ============================================================
// 📊 VIEW: CENTRAL PORTAL COMPONENT
// ============================================================

interface PortalDashboardViewProps {
  session: AuthSession;
  business: BusinessConfig;
  bookings: Booking[];
  employees: Employee[];
  auditLogs: FoodRestrictionAuditLog[];
  onUpdateBookings: (bookings: Booking[]) => void;
  onUpdateEmployees: (employees: Employee[]) => void;
  onAddAuditLog: (log: FoodRestrictionAuditLog) => void;
  onUpdateBusiness: (business: BusinessConfig) => void;
}

function PortalDashboardView({
  session,
  business,
  bookings,
  employees,
  auditLogs,
  onUpdateBookings,
  onUpdateEmployees,
  onAddAuditLog,
  onUpdateBusiness
}: PortalDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'employees' | 'audit' | 'settings'>('overview');
  
  // Forbidden routing checks for Employees
  const isEmployee = session.user.role === 'EmployeeOverview';
  
  useEffect(() => {
    if (isEmployee) {
      // Force reset to permitted tab if Employee attempts to access blocked tabs
      if (!['overview', 'guests'].includes(activeTab)) {
        setActiveTab('overview');
        alert('403 - Access Denied. Your EmployeeOverview role restricts access to the Business Overview & Guest Food Restrictions only.');
      }
    }
  }, [activeTab, isEmployee]);

  // QR modal generator support
  const [showQrModal, setShowQrModal] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Brand Profile Hero Widget */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center font-bold text-amber-500 font-serif text-3xl">
            {business.trading_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-950 tracking-tight leading-none">
              {business.trading_name}
            </h1>
            <p className="text-stone-400 text-xs mt-1 font-mono">
              {business.slogan} • {business.total_rooms} Luxury Rooms
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <QrCode size={14} /> Display Guest QR Code
          </button>
        </div>
      </div>

      {/* Tabs Menu Indicator Bar */}
      <div className="flex border-b border-stone-200 overflow-x-auto gap-6 text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-amber-500 text-stone-950'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          📈 Business Overview
        </button>

        <button
          onClick={() => setActiveTab('guests')}
          className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'guests'
              ? 'border-amber-500 text-stone-950'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          🥑 Guest Dietaries / Restrictions
        </button>

        {/* RESTRICTED MENU BUTTONS - Hidden from Employees */}
        {!isEmployee && (
          <>
            <button
              onClick={() => setActiveTab('employees')}
              className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'employees'
                  ? 'border-amber-500 text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              🧑‍🍳 Employee Management
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-amber-500 text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              📋 Platform Audit Trail
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'border-amber-500 text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              ⚙️ Resort Settings
            </button>
          </>
        )}
      </div>

      {/* Render active module */}
      {activeTab === 'overview' && (
        <BusinessOverviewTab bookings={bookings} totalRooms={business.total_rooms} />
      )}

      {activeTab === 'guests' && (
        <GuestDietariesTab
          bookings={bookings}
          session={session}
          onSaveDietary={(guestId, updatedDietaries, log) => {
            const updated = bookings.map(b => b.id === guestId ? { ...b, food_restrictions: updatedDietaries, updated_at: new Date().toISOString() } : b);
            onUpdateBookings(updated);
            if (log) {
              onAddAuditLog(log);
            }
          }}
        />
      )}

      {activeTab === 'employees' && !isEmployee && (
        <EmployeeManagementTab
          employees={employees}
          businessName={business.trading_name}
          onUpdateEmployees={onUpdateEmployees}
        />
      )}

      {activeTab === 'audit' && !isEmployee && (
        <AuditTrailTab auditLogs={auditLogs} />
      )}

      {activeTab === 'settings' && !isEmployee && (
        <ResortSettingsTab business={business} onUpdateBusiness={onUpdateBusiness} />
      )}

      {/* Display QR Modal */}
      {showQrModal && (
        <QRCodeModal
          businessId={business.id}
          businessName={business.trading_name}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// 📈 SUB TAB: BUSINESS OVERVIEW (Read Only Widgets)
// ============================================================

interface OverviewProps {
  bookings: Booking[];
  totalRooms: number;
}

function BusinessOverviewTab({ bookings, totalRooms }: OverviewProps) {
  // Safe math calculations
  const totalCheckinsCount = bookings.length;
  const activeStaysCount = bookings.filter(b => b.status === 'checked_in').length;
  
  // Calculate average stay length
  const avgNights = useMemo(() => {
    if (bookings.length === 0) return 0;
    const sum = bookings.reduce((sum, b) => sum + b.nights, 0);
    return (sum / bookings.length).toFixed(1);
  }, [bookings]);

  // Aggregate country distribution
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach(b => {
      counts[b.guest_country] = (counts[b.guest_country] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [bookings]);

  // Aggregate referral attribution
  const referralCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach(b => {
      counts[b.referral_source] = (counts[b.referral_source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [bookings]);

  // Aggregate dietary statistics (Very cool for overview!)
  const dietaryStats = useMemo(() => {
    const counts: Record<string, number> = {
      vegetarian: 0,
      vegan: 0,
      halal: 0,
      kosher: 0,
      gluten_free: 0,
      nut_allergy: 0,
      diabetic: 0
    };

    bookings.forEach(b => {
      if (b.food_restrictions) {
        if (b.food_restrictions.vegetarian) counts.vegetarian++;
        if (b.food_restrictions.vegan) counts.vegan++;
        if (b.food_restrictions.halal) counts.halal++;
        if (b.food_restrictions.kosher) counts.kosher++;
        if (b.food_restrictions.gluten_free) counts.gluten_free++;
        if (b.food_restrictions.nut_allergy) counts.nut_allergy++;
        if (b.food_restrictions.diabetic) counts.diabetic++;
      }
    });

    return Object.entries(counts).map(([key, count]) => ({
      name: key.replace('_', ' ').toUpperCase(),
      count
    })).filter(item => item.count > 0);
  }, [bookings]);

  const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stat Widget Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Registrations</p>
          <p className="text-3xl font-serif font-black text-stone-950 mt-1">{totalCheckinsCount}</p>
          <p className="text-[10px] text-stone-400 mt-2">Historically recorded check-ins</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Active Stays Today</p>
          <p className="text-3xl font-serif font-black text-emerald-600 mt-1">{activeStaysCount}</p>
          <p className="text-[10px] text-stone-400 mt-2">Currently checked-in on property</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Average Length of Stay</p>
          <p className="text-3xl font-serif font-black text-stone-950 mt-1">{avgNights} Nights</p>
          <p className="text-[10px] text-stone-400 mt-2">Average duration per booking</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Kitchen Alerts (Dietaries)</p>
          <p className="text-3xl font-serif font-black text-amber-500 mt-1">
            {bookings.filter(b => Object.values(b.food_restrictions).some(val => val === true)).length} Active
          </p>
          <p className="text-[10px] text-stone-400 mt-2">Guests with dietary warnings</p>
        </div>
      </div>

      {/* Visual Analytics Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Guest Origins */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400">
            🌍 Global Guest Origins
          </h3>
          <div className="h-64">
            {countryCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={10} stroke="#888" />
                  <YAxis fontSize={10} stroke="#888" />
                  <Tooltip cursor={{ fill: '#FAF9F6' }} />
                  <Bar dataKey="value" fill="#F59E0B" radius={[8, 8, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">No data loaded</div>
            )}
          </div>
        </div>

        {/* Dietary Distribution Chart */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400">
            🧑‍🍳 Kitchen Active Dietary Demands
          </h3>
          <div className="h-64">
            {dietaryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dietaryStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={10} stroke="#888" />
                  <YAxis dataKey="name" type="category" fontSize={9} stroke="#888" width={110} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 8, 8, 0]} barSize={16}>
                    {dietaryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                No active food restrictions recorded in bookings.
              </div>
            )}
          </div>
        </div>

        {/* Referral Channels */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 space-y-4 col-span-full">
          <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400">
            📊 Channel Attribution & Referral Source Share
          </h3>
          <div className="h-64">
            {referralCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={referralCounts}>
                  <defs>
                    <linearGradient id="colorRef" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={10} stroke="#888" />
                  <YAxis fontSize={10} stroke="#888" />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorRef)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">No bookings loaded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🥑 SUB TAB: GUEST DIETARIES & RESTRICTIONS EDITOR
// ============================================================

interface DietariesProps {
  bookings: Booking[];
  session: AuthSession;
  onSaveDietary: (guestId: string, updatedRestrictions: FoodRestrictions, log?: FoodRestrictionAuditLog) => void;
}

function GuestDietariesTab({ bookings, session, onSaveDietary }: DietariesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Booking | null>(null);
  const [localRestrictions, setLocalRestrictions] = useState<FoodRestrictions | null>(null);
  const [otherText, setOtherText] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  // Filter list to show active checked-in guests first
  const filteredGuests = useMemo(() => {
    return bookings.filter(b => {
      const nameMatch = b.guestName.toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = b.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || emailMatch;
    });
  }, [bookings, searchTerm]);

  // Open individual guest editor
  const handleOpenGuest = (guest: Booking) => {
    setSelectedGuest(guest);
    setLocalRestrictions({ ...guest.food_restrictions });
    setOtherText(guest.food_restrictions?.other_text || '');
  };

  const handleToggleRestriction = (key: keyof FoodRestrictions) => {
    if (!localRestrictions) return;
    setLocalRestrictions(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: !prev[key]
      };
    });
  };

  const handleSave = () => {
    if (!selectedGuest || !localRestrictions) return;

    // Build the string representation for audit trail
    const previousActive = Object.entries(selectedGuest.food_restrictions)
      .filter(([key, value]) => value === true && key !== 'other_text')
      .map(([key]) => key)
      .join(', ') || 'None';

    const newActive = Object.entries(localRestrictions)
      .filter(([key, value]) => value === true && key !== 'other_text')
      .map(([key]) => key)
      .join(', ') || 'None';

    const finalRestrictions: FoodRestrictions = {
      ...localRestrictions,
      other_text: localRestrictions.other ? otherText : ''
    };

    // Create secure audit log if changes were made
    let auditLog: FoodRestrictionAuditLog | undefined;
    if (previousActive !== newActive || (selectedGuest.food_restrictions?.other_text || '') !== otherText) {
      auditLog = {
        id: 'audit_' + Date.now(),
        business_id: selectedGuest.business_id,
        employee_id: session.user.id,
        employee_name: session.user.full_name,
        guest_id: selectedGuest.id,
        guest_name: selectedGuest.guest_name,
        previous_value: previousActive + (selectedGuest.food_restrictions?.other ? ` (${selectedGuest.food_restrictions.other_text})` : ''),
        new_value: newActive + (finalRestrictions.other ? ` (${otherText})` : ''),
        timestamp: new Date().toISOString()
      };
    }

    onSaveDietary(selectedGuest.id, finalRestrictions, auditLog);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setSelectedGuest(null);
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      
      {/* Left panel - Checked-in Guests List */}
      <div className="lg:col-span-1 bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex flex-col h-[600px]">
        <div className="p-4 border-b border-stone-100 bg-stone-50/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search checked-in guests..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl py-2 px-4 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto divide-y divide-stone-100">
          {filteredGuests.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No matching checked-in guests found.
            </div>
          ) : (
            filteredGuests.map(guest => {
              const activeCount = Object.entries(guest.food_restrictions || {})
                .filter(([key, val]) => val === true && key !== 'other_text')
                .length;

              return (
                <div
                  key={guest.id}
                  onClick={() => handleOpenGuest(guest)}
                  className={`p-4 cursor-pointer transition-colors flex justify-between items-center ${
                    selectedGuest?.id === guest.id ? 'bg-amber-50' : 'hover:bg-stone-50/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-stone-900 truncate">{guest.guest_name}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                      Room {guest.guest_province || 'Suite'} • Check-out {new Date(guest.check_out_date || '').toLocaleDateString('en-ZA')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {activeCount > 0 ? (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        ⚠️ {activeCount} Alert{activeCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="bg-stone-100 text-stone-400 text-[9px] font-medium px-2 py-0.5 rounded-full">
                        Clean
                      </span>
                    )}
                    <ChevronRight size={14} className="text-stone-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel - Restriction Editor */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm min-h-[600px] flex flex-col">
        {selectedGuest && localRestrictions ? (
          <div className="p-6 md:p-8 flex-grow flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Header profile */}
              <div className="flex justify-between items-start border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-stone-950 font-serif leading-none">
                    Dietary Requirements Editor
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Manage kitchen synchronized alerts for <strong className="text-stone-700">{selectedGuest.guest_name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedGuest(null)}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* READ ONLY FIELDS - STRICT COMPLIANCE BLOCK */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-stone-500 font-bold text-[10px] uppercase tracking-wider">
                  <Info size={12} className="text-amber-500" /> Protected Identity Records (Read-Only)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-stone-400 text-[10px] block">Email Address</span>
                    <span className="font-semibold text-stone-700 truncate block">{selectedGuest.guest_email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Mobile Contact</span>
                    <span className="font-semibold text-stone-700 block">{selectedGuest.guest_phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Passport / ID</span>
                    <span className="font-mono font-semibold text-stone-700 block">{selectedGuest.passport_or_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Origin Country</span>
                    <span className="font-semibold text-stone-700 block">{selectedGuest.guest_country}</span>
                  </div>
                </div>
              </div>

              {/* Selectable Chip Grid */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  Select Associated Restrictions
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {DIETARY_OPTIONS.map(opt => {
                    const isActive = localRestrictions[opt.key as keyof FoodRestrictions] === true;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleToggleRestriction(opt.key as keyof FoodRestrictions)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          isActive
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md shadow-amber-500/10 scale-105'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}

                  {/* Other optional restriction button */}
                  <button
                    type="button"
                    onClick={() => handleToggleRestriction('other')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      localRestrictions.other
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md shadow-amber-500/10 scale-105'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Other custom...
                  </button>
                </div>
              </div>

              {/* Custom Other text field */}
              {localRestrictions.other && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Specify Custom Food Restriction
                  </label>
                  <input
                    type="text"
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="e.g. No raw eggs, strawberry allergy..."
                  />
                </div>
              )}
            </div>

            {/* Bottom save bar */}
            <div className="pt-6 border-t border-stone-100 flex items-center justify-between mt-8">
              {successMsg ? (
                <span className="text-emerald-600 text-xs font-bold flex items-center gap-1.5 animate-bounce">
                  ✓ Kitchen synchronisation complete!
                </span>
              ) : (
                <span className="text-stone-400 text-xs">
                  Updated values write immediately to audit trails.
                </span>
              )}

              <button
                type="button"
                onClick={handleSave}
                className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Save Food Restrictions
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-stone-400">
            <Utensils size={48} className="text-stone-200 mb-3" />
            <h3 className="text-sm font-bold text-stone-800">Select a Guest to Edit</h3>
            <p className="text-[11px] text-stone-400 mt-1 max-w-xs">
              Click any guest on the left sidebar to view their profile, existing food restrictions, and to commit updates directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 🧑‍🍳 SUB TAB: EMPLOYEE MANAGEMENT (Business Owner Only)
// ============================================================

interface EmployeeProps {
  employees: Employee[];
  businessName: string;
  onUpdateEmployees: (employees: Employee[]) => void;
}

function EmployeeManagementTab({ employees, businessName, onUpdateEmployees }: EmployeeProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Please fill out all fields');
      return;
    }

    // Format phone number to international format cleanly
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+27' + formattedPhone.substring(1);
    }

    const invitationToken = 'FCINV_' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const newEmp: Employee = {
      id: 'emp_' + Date.now(),
      business_id: 'jbay-zebra-lodge',
      full_name: fullName.trim(),
      phone_number: formattedPhone,
      role: 'EmployeeOverview',
      status: 'Pending',
      invitation_token: invitationToken,
      invitation_expiry: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // 7 days expiration
      invited_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newEmp, ...employees];
    onUpdateEmployees(updated);
    
    // Clear form
    setFullName('');
    setPhone('');
    setShowAddForm(false);
    
    // Alert success with option to share immediately
    alert(`🎉 Added Employee "${fullName}" successfully! You can now click "Share Overview" to send them their activation link.`);
  };

  const handleRemoveEmployee = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete employee "${name}"?`)) {
      const updated = employees.filter(e => e.id !== id);
      onUpdateEmployees(updated);
    }
  };

  const handleToggleDisable = (id: string, currentStatus: 'Active' | 'Pending' | 'Disabled', name: string) => {
    const isCurrentlyDisabled = currentStatus === 'Disabled';
    const newStatus = isCurrentlyDisabled ? 'Active' : 'Disabled';
    
    if (confirm(`Are you sure you want to ${isCurrentlyDisabled ? 'RE-ENABLE' : 'DISABLE'} employee "${name}"?`)) {
      const updated = employees.map(e => e.id === id ? { ...e, status: newStatus, updated_at: new Date().toISOString() } : e);
      onUpdateEmployees(updated as Employee[]);
    }
  };

  // WhatsApp Onboarding link sharing
  const handleShareOverview = (emp: Employee) => {
    const onboardingUrl = `${window.location.origin}/employee/invite/${emp.invitation_token}`;
    
    // Build prefilled WhatsApp invitation message template
    const text = `Hello ${emp.full_name},\n\nYou have been invited to access the FastCheckIn Business Overview.\n\nPlease click the link below to activate your account:\n\n${onboardingUrl}\n\nYou will be asked to create your password.\n\nAfter activation you can install FastCheckIn on your Home Screen for quick access.`;
    
    const cleanPhone = emp.phone_number.replace(/[^0-9+]/g, '').replace('+', '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    
    // Open in a new window immediately
    window.open(waUrl, '_blank');
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
            className="w-full bg-stone-900 hover:bg-stone-950 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Create Invite & Register Employee
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
                      <div className="flex justify-center items-center gap-2">
                        {/* WhatsApp Invite Share button */}
                        <button
                          onClick={() => handleShareOverview(emp)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-[10px] font-bold uppercase transition-all"
                          title="Share onboarding activation link over WhatsApp"
                        >
                          📱 Share Invite Link
                        </button>

                        {/* Disable/Enable Button */}
                        <button
                          onClick={() => handleToggleDisable(emp.id, emp.status, emp.full_name)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                            emp.status === 'Disabled'
                              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                              : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                          }`}
                        >
                          {emp.status === 'Disabled' ? 'Enable' : 'Disable'}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleRemoveEmployee(emp.id, emp.full_name)}
                          className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100"
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

// ============================================================
// 📋 SUB TAB: AUDIT TRAIL LOG LIST (Admins Only)
// ============================================================

interface AuditProps {
  auditLogs: FoodRestrictionAuditLog[];
}

function AuditTrailTab({ auditLogs }: AuditProps) {
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const staffMatch = log.employee_name.toLowerCase().includes(search.toLowerCase());
      const guestMatch = log.guest_name.toLowerCase().includes(search.toLowerCase());
      return staffMatch || guestMatch;
    });
  }, [auditLogs, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 leading-none">
            Dietary Modification Audit Trail
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Permanently logs all employee updates on guest food restrictions for operations compliance
          </p>
        </div>

        <input
          type="text"
          placeholder="Filter logs by staff or guest name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-72 bg-white border border-stone-200 rounded-xl py-2 px-4 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 border-b border-stone-100 text-stone-400 font-bold uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Employee Name</th>
                <th className="px-6 py-4">Guest Reference</th>
                <th className="px-6 py-4">Previous Alert Flags</th>
                <th className="px-6 py-4">Committed Restrictions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                    No modifications logged in database.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 text-stone-500 font-mono">
                      {new Date(log.timestamp).toLocaleString('en-ZA')}
                    </td>
                    <td className="px-6 py-4 font-bold text-stone-900">
                      {log.employee_name}{' '}
                      <span className="text-[10px] text-stone-400 font-mono">({log.employee_id})</span>
                    </td>
                    <td className="px-6 py-4 text-stone-800">
                      <strong>{log.guest_name}</strong>{' '}
                      <span className="text-[10px] text-stone-400 font-mono">({log.guest_id})</span>
                    </td>
                    <td className="px-6 py-4 text-red-600 font-mono text-[11px] truncate max-w-[200px]" title={log.previous_value}>
                      {log.previous_value}
                    </td>
                    <td className="px-6 py-4 text-green-600 font-mono font-bold text-[11px] truncate max-w-[200px]" title={log.new_value}>
                      {log.new_value}
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

// ============================================================
// ⚙️ SUB TAB: RESORT CONFIGURATION SETTINGS
// ============================================================

interface ResortProps {
  business: BusinessConfig;
  onUpdateBusiness: (business: BusinessConfig) => void;
}

function ResortSettingsTab({ business, onUpdateBusiness }: ResortProps) {
  const [tradingName, setTradingName] = useState(business.trading_name);
  const [slogan, setSlogan] = useState(business.slogan || '');
  const [rooms, setRooms] = useState(business.total_rooms);
  const [price, setPrice] = useState(business.avg_price);
  const [welcomeMsg, setWelcomeMsg] = useState(business.welcome_message || '');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusiness({
      ...business,
      trading_name: tradingName,
      slogan,
      total_rooms: rooms,
      avg_price: price,
      welcome_message: welcomeMsg
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm max-w-2xl space-y-6 animate-fade-in">
      <div className="border-b border-stone-100 pb-4">
        <h2 className="text-xl font-bold font-serif text-stone-900 leading-none">
          Resort Operations Settings
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Adjust pricing values, capacity thresholds, or brand messages of the resort
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Resort Name</label>
          <input
            type="text"
            required
            value={tradingName}
            onChange={e => setTradingName(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 py-2.5 px-3 rounded-xl text-xs font-serif"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Resort Slogan</label>
          <input
            type="text"
            value={slogan}
            onChange={e => setSlogan(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 py-2.5 px-3 rounded-xl text-xs font-serif"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Rooms</label>
          <input
            type="number"
            min="1"
            required
            value={rooms}
            onChange={e => setRooms(parseInt(e.target.value) || 1)}
            className="w-full bg-stone-50 border border-stone-200 py-2.5 px-3 rounded-xl text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Average Room Price (ZAR)</label>
          <input
            type="number"
            min="0"
            required
            value={price}
            onChange={e => setPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-stone-50 border border-stone-200 py-2.5 px-3 rounded-xl text-xs font-mono"
          />
        </div>

        <div className="space-y-1 col-span-full">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Welcome Message</label>
          <textarea
            rows={3}
            value={welcomeMsg}
            onChange={e => setWelcomeMsg(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 py-2.5 px-3 rounded-xl text-xs"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-stone-100 flex justify-between items-center">
        {success ? (
          <span className="text-green-600 text-xs font-bold animate-bounce">
            ✓ Settings successfully saved!
          </span>
        ) : (
          <span />
        )}
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-8 py-3 rounded-xl text-xs uppercase tracking-wider transition-all"
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
}

// ============================================================
// 🖨️ COMPONENT: PRINTABLE RESORT POSTER AND QR CODE MODAL
// ============================================================

interface QRCodeModalProps {
  businessId: string;
  businessName: string;
  onClose: () => void;
}

export function QRCodeModal({ businessId, businessName, onClose }: QRCodeModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const checkinUrl = `${window.location.origin}/checkin/${businessId}`;

  useEffect(() => {
    QRCode.toDataURL(checkinUrl, { width: 300, margin: 2 })
      .then(url => setQrUrl(url))
      .catch(err => console.error(err));
  }, [checkinUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full text-center space-y-6 border border-stone-200">
        <div className="flex justify-between items-center pb-2 border-b border-stone-100">
          <h3 className="font-serif font-black text-stone-900 text-lg">Resort Poster QR</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-stone-100 text-stone-400">
            <X size={18} />
          </button>
        </div>

        <div className="border border-stone-200 p-6 rounded-2xl bg-stone-50 space-y-4">
          <p className="font-serif font-extrabold text-sm text-stone-800">{businessName}</p>
          <div className="flex justify-center">
            {qrUrl ? (
              <img src={qrUrl} alt="Check-in QR" className="w-48 h-48 rounded-xl shadow-md border border-stone-200" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-stone-400 bg-stone-100 rounded-xl">
                Generating QR...
              </div>
            )}
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Scan to Check-In</p>
        </div>

        <p className="text-xs text-stone-500 leading-normal">
          Display this QR code at your reception desk. Guests scan this with their phone camera to instantly load the digital check-in registration.
        </p>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={handlePrint}
            className="bg-stone-900 hover:bg-stone-950 text-white font-bold py-3 rounded-xl text-xs uppercase transition-all"
          >
            🖨️ Print Poster
          </button>
          {qrUrl && (
            <a
              href={qrUrl}
              download={`${businessId}-checkin-qr.png`}
              className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold py-3 rounded-xl text-xs uppercase flex items-center justify-center transition-all"
            >
              📥 Download PNG
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 📱 COMPONENT: PRIMARY GUEST CHECK-IN WORKFLOW (WIZARD)
// ============================================================

interface CheckInFormProps {
  business: BusinessConfig;
  onComplete: (booking: Booking, token?: string) => void;
}

export function CheckInForm({ business, onComplete }: CheckInFormProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields State
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [passport, setPassport] = useState('');
  const [country, setCountry] = useState('South Africa');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [arrivingFrom, setArrivingFrom] = useState('');
  const [nextDestination, setNextDestination] = useState('');
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [referral, setReferral] = useState('');
  const [settlement, setSettlement] = useState('');
  const [popiaConsent, setPopiaConsent] = useState(false);

  // Food Restrictions State
  const [dietary, setDietary] = useState<FoodRestrictions>({
    vegetarian: false,
    vegan: false,
    halal: false,
    kosher: false,
    gluten_free: false,
    dairy_free: false,
    lactose_intolerant: false,
    nut_allergy: false,
    shellfish_allergy: false,
    egg_allergy: false,
    soy_allergy: false,
    pork_free: false,
    diabetic: false,
    no_seafood: false,
    other: false,
    other_text: ''
  });

  // Digital Signature Canvas Refs & State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Photo Upload State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // Indemnity Scrolling Validation state
  const indemnityContainerRef = useRef<HTMLDivElement | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [indemnityAccepted, setIndemnityAccepted] = useState(false);

  // Error States
  const [error, setError] = useState<string | null>(null);

  // Step 1: Pre-fill simulated database lookup or proceed
  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please provide a valid email to continue.");
      return;
    }
    // Attempt lookup of previous stay in localStorage to offer seamless checkout experiences
    const stored = localStorage.getItem('fci_bookings');
    if (stored) {
      const all: Booking[] = JSON.parse(stored);
      const match = all.find(b => b.guest_email?.toLowerCase() === email.toLowerCase() || b.email?.toLowerCase() === email.toLowerCase());
      if (match) {
        setFirstName(match.guest_first_name || match.guest_name.split(' ')[0] || '');
        setLastName(match.guest_last_name || match.guest_name.split(' ').slice(1).join(' ') || '');
        setPhone(match.guest_phone || match.phone || '');
        setPassport(match.passport_or_id || match.passportOrId || '');
        setCountry(match.guest_country || match.country || 'South Africa');
        setProvince(match.guest_province || match.province || '');
        setCity(match.guest_city || match.city || '');
        setDietary({ ...match.food_restrictions });
      }
    }
    setStep(2);
  };

  // Step 2 Validation and progression to Step 3
  const handleDetailsNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName || !lastName || !phone || !passport || !country || !city || !arrivingFrom || !nextDestination || !referral || !settlement) {
      setError(t('error_required_fields'));
      return;
    }
    setStep(3);
  };

  // Handle Indemnity Box scroll to make sure they read before checking the box
  const handleScroll = () => {
    const el = indemnityContainerRef.current;
    if (el) {
      const isBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
      if (isBottom) {
        setHasScrolledToBottom(true);
      }
    }
  };

  // Canvas Drawing Actions
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1c1917'; // stone-900
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    const pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Handle image attachment
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoDataUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Final statutory check-in completion handler
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!indemnityAccepted) {
      setError(t('error_indemnity_scroll'));
      return;
    }

    if (!hasSigned) {
      setError(t('error_signature_required'));
      return;
    }

    // Get Signature data URL from canvas
    const canvas = canvasRef.current;
    const signatureUrl = canvas ? canvas.toDataURL() : '';

    const booking: Booking = {
      id: 'bkg_' + Math.random().toString(36).substr(2, 9),
      business_id: business.id,
      guest_name: `${firstName} ${lastName}`,
      guest_first_name: firstName,
      guest_last_name: lastName,
      guest_email: email,
      guest_phone: phone,
      guest_country: country,
      guest_province: province,
      guest_city: city,
      passport_or_id: passport,
      check_in_date: new Date().toISOString().split('T')[0],
      nights: nights,
      adults: adults,
      children: children,
      total_amount: business.avg_price * nights,
      status: 'checked_in',
      booking_source: 'Walk-In Applet',
      referral_source: referral,
      popia_marketing_consent: popiaConsent,
      arriving_from: arrivingFrom,
      next_destination: nextDestination,
      food_restrictions: dietary,
      id_photo_url: photoDataUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      signature_url: signatureUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Legacy compatibility
      guestName: `${firstName} ${lastName}`,
      email: email,
      phone: phone,
      country: country,
      province: province,
      city: city,
      passportOrId: passport,
      nextDestination: nextDestination,
      settlementMethod: settlement,
      referralSource: referral,
      kids: children,
      totalAmount: business.avg_price * nights,
      popiaMarketingConsent: popiaConsent
    };

    const signatureToken = 'TKN_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    onComplete(booking, signatureToken);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Step Indicator Panel */}
        <div className="flex justify-between items-center mb-8 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>1</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 hidden sm:inline">Verification</span>
          </div>
          <div className="h-[2px] w-12 bg-stone-800" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>2</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 hidden sm:inline">Details</span>
          </div>
          <div className="h-[2px] w-12 bg-stone-800" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>3</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 hidden sm:inline">Waiver & Sign</span>
          </div>
        </div>

        {/* Dynamic Step View Rendering */}
        {step === 1 && (
          <div className="bg-stone-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 text-center space-y-8 border border-stone-800 animate-fade-in">
            <Logo size="lg" />
            
            <div className="space-y-2">
              <h1 className="text-3xl font-serif font-black tracking-tight leading-none text-white">{business.trading_name}</h1>
              <p className="text-stone-400 text-sm max-w-md mx-auto">{business.welcome_message}</p>
            </div>

            <form onSubmit={handleEmailNext} className="max-w-md mx-auto space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {t('checkin_email_label')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-3.5 pl-10 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none text-white font-mono"
                    placeholder="guest@example.com"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs font-semibold text-left">{error}</p>
              )}

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {t('checkin_begin_button')} <ArrowRight size={14} />
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleDetailsNext} className="bg-stone-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-stone-800 space-y-8 animate-fade-in">
            <div>
              <h2 className="text-2xl font-serif font-black text-white">{t('checkin_title')}</h2>
              <p className="text-xs text-stone-400 mt-1">{t('checkin_immigration_act')}</p>
            </div>

            {error && (
              <div className="bg-red-950 border border-red-800 text-red-200 text-xs p-4 rounded-xl font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Step 2 Inputs */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_first_name')} *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_last_name')} *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_passport')} *</label>
                  <input
                    type="text"
                    required
                    value={passport}
                    onChange={e => setPassport(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_phone')} *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white font-mono"
                    placeholder="+27..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_country')} *</label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white"
                  >
                    <option value="South Africa">South Africa</option>
                    <option value="Namibia">Namibia</option>
                    <option value="Germany">Germany</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Other">Other International</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_city')} *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Arrived From *</label>
                  <input
                    type="text"
                    required
                    value={arrivingFrom}
                    onChange={e => setArrivingFrom(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white"
                    placeholder="e.g. Cape Town"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_next_destination')} *</label>
                  <input
                    type="text"
                    required
                    value={nextDestination}
                    onChange={e => setNextDestination(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white"
                    placeholder="e.g. Port Elizabeth"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_nights')} *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={nights}
                    onChange={e => setNights(parseInt(e.target.value) || 1)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_referral')} *</label>
                  <select
                    required
                    value={referral}
                    onChange={e => setReferral(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white"
                  >
                    <option value="">-- Choose Referral --</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="TripAdvisor">TripAdvisor</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Friend Word of Mouth">Word of Mouth</option>
                    <option value="Repeat Guest">Repeat Guest</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('checkin_settlement')} *</label>
                  <select
                    required
                    value={settlement}
                    onChange={e => setSettlement(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white"
                  >
                    <option value="">-- Choose Settlement --</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="EFT / Bank Transfer">EFT / Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Prepaid Online">Prepaid Online</option>
                  </select>
                </div>
              </div>

              {/* GUEST DIETARY & RESTRICTIONS IN WIZARD */}
              <div className="border-t border-stone-800 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Utensils className="text-amber-500" size={18} />
                  <h3 className="font-serif font-black text-sm text-white">Guest Kitchen Food Restrictions</h3>
                </div>
                <p className="text-[11px] text-stone-400">
                  Select any dietary requirements or food allergies so our kitchen can adapt statutory menus.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(dietary).map(([key, val]) => {
                    if (key === 'other_text') return null;
                    return (
                      <label key={key} className="flex items-center gap-2 bg-stone-950 border border-stone-800 p-3 rounded-xl text-xs text-stone-300 hover:border-amber-500/50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={val as boolean}
                          onChange={e => setDietary({ ...dietary, [key]: e.target.checked })}
                          className="accent-amber-500"
                        />
                        <span className="capitalize">{key.replace('_', ' ')}</span>
                      </label>
                    );
                  })}
                </div>

                {dietary.other && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Please describe other food allergies or notes</label>
                    <input
                      type="text"
                      value={dietary.other_text || ''}
                      onChange={e => setDietary({ ...dietary, other_text: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-800 py-2.5 px-3 rounded-xl text-xs text-white"
                      placeholder="e.g. strict avoidance of raw garlic..."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-stone-800 pt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-stone-800 hover:border-stone-700 rounded-xl text-xs uppercase text-stone-400 transition-all font-bold"
              >
                {t('common_back')}
              </button>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold px-8 py-3 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                {t('checkin_continue_indemnity')}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="bg-stone-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-stone-800 space-y-8 animate-fade-in">
            <div>
              <h2 className="text-2xl font-serif font-black text-white">{t('checkin_indemnity')}</h2>
              <p className="text-xs text-stone-400 mt-1">Please read and sign statutory waiver</p>
            </div>

            {error && (
              <div className="bg-red-950 border border-red-800 text-red-200 text-xs p-4 rounded-xl font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Scrollable Indemnity Document */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Indemnity Document</label>
              <div 
                ref={indemnityContainerRef}
                onScroll={handleScroll}
                className="h-44 overflow-y-auto bg-stone-950 border border-stone-800 p-4 rounded-xl text-[11px] text-stone-300 leading-relaxed space-y-3 font-mono"
              >
                <IndemnityText 
                  businessName={business.trading_name} 
                  showGuestDetails={true} 
                  guestName={`${firstName} ${lastName}`} 
                  passportOrId={passport} 
                />
                <div className="text-stone-500 font-sans font-bold text-center pt-2">{t('indemnity_scroll_bottom')}</div>
              </div>
              {!hasScrolledToBottom && (
                <p className="text-[10px] text-amber-500 font-bold">{t('indemnity_scroll_to_accept')}</p>
              )}
            </div>

            {/* Checkbox */}
            <label className={`flex gap-3 p-4 rounded-xl border text-xs select-none transition-all ${indemnityAccepted ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-stone-950 border-stone-800 text-stone-400'} ${!hasScrolledToBottom ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={!hasScrolledToBottom}
                checked={indemnityAccepted}
                onChange={e => setIndemnityAccepted(e.target.checked)}
                className="mt-0.5"
              />
              <span className="leading-normal">{t('indemnity_accept')}</span>
            </label>

            {/* ID Capture Section */}
            <div className="space-y-3 border-t border-stone-800 pt-6">
              <h3 className="font-serif font-black text-sm text-white">Passport / ID Document Image Capture</h3>
              <p className="text-[10px] text-stone-400">Attach a photo or scan of your passport/identity card for statutory document collection.</p>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="id-upload-input"
                />
                <label htmlFor="id-upload-input" className="px-6 py-3 bg-stone-950 border border-stone-800 hover:border-amber-500 text-xs font-bold text-stone-300 uppercase rounded-xl cursor-pointer transition-all">
                  📷 Upload ID / Passport Photo
                </label>
                {photoDataUrl ? (
                  <div className="flex items-center gap-2">
                    <img src={photoDataUrl} alt="Attached ID" className="w-16 h-12 object-cover border border-amber-500 rounded-lg shadow-md" />
                    <span className="text-[11px] text-green-500 font-bold flex items-center gap-1">✓ File Attached</span>
                  </div>
                ) : (
                  <span className="text-stone-500 text-[11px]">No image attached (simulates automatic document ingestion)</span>
                )}
              </div>
            </div>

            {/* Digital Signature Pad */}
            <div className="space-y-3 border-t border-stone-800 pt-6">
              <div className="flex justify-between items-center">
                <h3 className="font-serif font-black text-sm text-white">{t('checkin_signature')} *</h3>
                {hasSigned && (
                  <button 
                    type="button" 
                    onClick={clearSignature}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-600 uppercase"
                  >
                    Clear Signature
                  </button>
                )}
              </div>
              <p className="text-[10px] text-stone-400">{t('checkin_signature_instruction')}</p>
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 cursor-crosshair bg-stone-50"
                />
              </div>
            </div>

            {/* Marketing POPIA checkbox */}
            <label className="flex gap-2 text-[11px] text-stone-400 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={popiaConsent}
                onChange={e => setPopiaConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>I consent to J-Bay Zebra Lodge contacting me with guest newsletters or exclusive offers. (POPIA Act South Africa compliant).</span>
            </label>

            {/* Submit Block */}
            <div className="border-t border-stone-800 pt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-stone-800 hover:border-stone-700 rounded-xl text-xs uppercase text-stone-400 transition-all font-bold"
              >
                {t('common_back')}
              </button>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-8 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2"
              >
                {t('checkin_complete_button')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CheckInApp({ business, onCheckInComplete }: { business: BusinessConfig; onCheckInComplete: (booking: Booking) => void }) {
  const [bookingFinished, setBookingFinished] = useState<Booking | null>(null);
  const [indemnityToken, setIndemnityToken] = useState<string>('');

  if (bookingFinished) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full p-10 text-center space-y-6 text-stone-900 border border-stone-200 animate-scale-in">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle size={44} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-black">Check-in Complete! 🎉</h2>
            <p className="text-stone-500 text-sm">
              Welcome to {business.trading_name}, <strong>{bookingFinished.guest_name}</strong>!
            </p>
          </div>

          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-left text-xs space-y-2">
            <p className="font-bold text-amber-900 mb-1">Stay Details:</p>
            <p className="text-stone-700">📅 Check-In: <span className="font-mono">{bookingFinished.check_in_date}</span></p>
            <p className="text-stone-700">🌙 Nights: <span className="font-mono">{bookingFinished.nights} nights</span></p>
            <p className="text-stone-700">🧑 Adults: <span className="font-mono">{bookingFinished.adults}</span> | 👶 Kids: <span className="font-mono">{bookingFinished.children}</span></p>
            {bookingFinished.arriving_from && (
              <p className="text-stone-700">📍 Arrived From: <span className="font-semibold text-stone-900 uppercase font-sans">{bookingFinished.arriving_from}</span></p>
            )}
            {bookingFinished.next_destination && (
              <p className="text-stone-700">📍 Next Destination: <span className="font-semibold text-stone-900 uppercase font-sans">{bookingFinished.next_destination}</span></p>
            )}
            {indemnityToken && (
              <p className="text-amber-800 font-bold border-t border-amber-200 pt-2 mt-2">
                📄 Digital Indemnity signed electronically.<br />
                <span className="text-[10px] text-stone-500 font-normal">Reference Token: {indemnityToken}</span>
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setBookingFinished(null);
              setIndemnityToken('');
            }}
            className="w-full bg-stone-900 hover:bg-stone-950 text-white font-extrabold py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
          >
            Check in another guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <CheckInForm
      business={business}
      onComplete={(booking, token) => {
        setBookingFinished(booking);
        if (token) setIndemnityToken(token);
        onCheckInComplete(booking);
      }}
    />
  );
}
