import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie, LineChart, Line
} from 'recharts';
import { MonthlyData, SeasonStats, Booking, ViewState } from '../types';
import { HIGH_SEASON_MONTHS, LOW_SEASON_MONTHS, COLORS, REFERRAL_SOURCES } from '../constants';
import { getMarketingAdvice } from '../services/geminiService';

interface DashboardProps {
  data: MonthlyData[];
  bookings: Booking[];
  activeView: ViewState;
  onNavigate?: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, bookings, activeView, onNavigate }) => {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partners, setPartners] = useState<string[]>([]);
  const [hotelName, setHotelName] = useState('Management Portal');

  // Get hotel name from user data
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('jbay_user') || '{}');
      
      // Try to get hotel name from different sources
      if (user?.hotelName) {
        setHotelName(user.hotelName);
      } else if (user?.email) {
        // Try to find hotel from localStorage hotels data
        const hotels = JSON.parse(localStorage.getItem('jbay_hotels') || '[]');
        const hotel = hotels.find((h: any) => h.managerEmail === user.email);
        if (hotel?.name) {
          setHotelName(hotel.name);
        } else {
          // Fallback to email-based name
          const namePart = user.email.split('@')[0];
          setHotelName(namePart.charAt(0).toUpperCase() + namePart.slice(1) + "'s Hotel");
        }
      }
    } catch (e) {
      console.log('Not logged in as manager');
    }
  }, []);

  // Force registry to show when view=reports in URL
  const urlParams = new URLSearchParams(window.location.search);
  const showRegistry = urlParams.get('view') === 'reports';
  const showImport = urlParams.get('view') === 'import';

  // 🔴 FIX: DO NOT REDIRECT - just let CheckInApp handle it
  if (showImport) {
    return null; // Simply return nothing - parent component will render ImportData
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => 
      b.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passportOrId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bookings, searchTerm]);

  // Only compute stats if we're showing analytics
  const referralStats = useMemo(() => {
    if (showRegistry) return [];
    return REFERRAL_SOURCES.map(source => ({
      name: source,
      value: data.reduce((acc, curr) => acc + (curr.referralData?.[source] || 0), 0) || 0
    })).filter(s => s.value > 0);
  }, [data, showRegistry]);

  const countryStats = useMemo(() => {
    if (showRegistry) return [];
    const counts: Record<string, number> = {};
    bookings.forEach(b => {
      counts[b.country] = (counts[b.country] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings, showRegistry]);

  const stats = useMemo(() => {
    if (showRegistry) return [];
    const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const high = data.filter(d => HIGH_SEASON_MONTHS.includes(monthsArr.indexOf(d.month)));
    const low = data.filter(d => LOW_SEASON_MONTHS.includes(monthsArr.indexOf(d.month)));
    const mid = data.filter(d => !HIGH_SEASON_MONTHS.includes(monthsArr.indexOf(d.month)) && !LOW_SEASON_MONTHS.includes(monthsArr.indexOf(d.month)));

    const calculateStats = (arr: MonthlyData[], name: 'High' | 'Low' | 'Mid'): SeasonStats => ({
      season: name,
      bookings: arr.reduce((acc, curr) => acc + curr.bookings, 0),
      revenue: arr.reduce((acc, curr) => acc + curr.revenue, 0),
      occupancy: arr.length > 0 ? (arr.reduce((acc, curr) => acc + (curr.occupancyPercent || 0), 0) / arr.length) : 0
    });

    return [
      calculateStats(high, 'High'),
      calculateStats(mid, 'Mid'),
      calculateStats(low, 'Low')
    ];
  }, [data, showRegistry]);

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    const advice = await getMarketingAdvice(data, stats);
    setAiAdvice(advice);
    setLoadingAdvice(false);
  };

  const exportAnalyticsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month,Year,Bookings,Occupancy %,Estimated Revenue\n";
    data.forEach(d => {
      csvContent += `${d.month},${d.year},${d.bookings},${d.occupancyPercent || 0},${d.revenue}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "JBay_Lodge_Marketing_Analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyMarketingSummary = () => {
    const topSource = [...referralStats].sort((a,b) => b.value - a.value)[0];
    const topCountry = countryStats[0];
    const avgOccupancy = Math.round(data.reduce((acc, curr) => acc + (curr.occupancyPercent || 0), 0) / data.length);
    const summary = `
J-BAY ZEBRA LODGE - MARKETING INTELLIGENCE SUMMARY
--------------------------------------------------
Overall Occupancy: ${avgOccupancy}%
Top Performing Source: ${topSource?.name}
Primary Market: ${topCountry?.name}
Total Annual Revenue: R${data.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()}

Insight generated for Marketing Use.
    `;
    navigator.clipboard.writeText(summary.trim());
    setCopySuccess('summary');
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/marketing-view-${Date.now()}`);
    setCopySuccess('link');
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const invitePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (partnerEmail && !partners.includes(partnerEmail)) {
      setPartners([...partners, partnerEmail]);
      setPartnerEmail('');
    }
  };

  // SHOW REGISTRY VIEW
  if (showRegistry) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-900">{hotelName} - Guest Registry</h2>
            <p className="text-stone-500 text-sm mt-1">Immigration Act Section 40 - Daily Register</p>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search by name or ID..."
              className="w-64 bg-white border border-stone-200 rounded-full py-2 px-4 pl-10 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-stone-500 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Guest Name</th>
                  <th className="px-6 py-4">ID/Passport</th>
                  <th className="px-6 py-4">Country</th>
                  <th className="px-6 py-4">Check-In</th>
                  <th className="px-6 py-4">Check-Out</th>
                  <th className="px-6 py-4">Nights</th>
                  <th className="px-6 py-4">Next Destination</th>
                  <th className="px-6 py-4">Signed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{b.guestName}</td>
                      <td className="px-6 py-4 font-mono text-sm">{b.passportOrId}</td>
                      <td className="px-6 py-4">{b.country}</td>
                      <td className="px-6 py-4">{b.checkInDate}</td>
                      <td className="px-6 py-4">{b.checkOutDate}</td>
                      <td className="px-6 py-4">{b.nights}</td>
                      <td className="px-6 py-4">{b.nextDestination}</td>
                      <td className="px-6 py-4">
                        {b.signatureData ? (
                          <span className="text-emerald-600 font-bold">✓</span>
                        ) : (
                          <span className="text-stone-300">✗</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-stone-500">
                      No guest registrations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => window.location.href = '/admin'}
            className="text-sm text-stone-500 hover:text-stone-900 font-medium"
          >
            ← Back to Analytics
          </button>
        </div>
      </div>
    );
  }

  // SHOW ANALYTICS DASHBOARD
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">{hotelName}</h2>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => window.location.href = '/admin'} 
              className="text-[10px] font-bold uppercase tracking-widest pb-1 transition-all text-amber-600 border-b-2 border-amber-600"
            >
              Analytics
            </button>
            <button 
              onClick={() => {
                window.location.href = '/admin?view=reports';
              }} 
              className="text-[10px] font-bold uppercase tracking-widest pb-1 transition-all text-stone-400 hover:text-stone-600"
            >
              Guest Register
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowShareModal(true)}
            className="bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-sm text-xs font-bold uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Share & Export
          </button>
          <button 
            onClick={handleGetAdvice}
            disabled={loadingAdvice}
            className="bg-stone-900 hover:bg-black text-white px-8 py-3 rounded-full flex items-center gap-2 transition-all shadow-lg text-xs font-bold uppercase tracking-widest"
          >
            {loadingAdvice ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : "AI Marketing Strategy"}
          </button>
        </div>
      </header>

      {/* Analytics Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(s => (
          <div key={s.season} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest mb-1">{s.season} Season</h4>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-serif font-bold text-stone-900">{Math.round(s.occupancy)}%</p>
              <span className="text-xs text-stone-400">Avg. Occupancy</span>
            </div>
            <p className="text-[10px] text-amber-700 font-bold mt-2 uppercase tracking-widest">R{s.revenue.toLocaleString()} Revenue</p>
          </div>
        ))}
      </div>

      {aiAdvice && (
        <div className="bg-stone-900 text-stone-100 p-8 rounded-3xl shadow-2xl animate-fade-in border-l-8 border-amber-600">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-amber-500 font-serif">
              Strategic Marketing Recommendations
            </h3>
            <button onClick={() => setAiAdvice(null)} className="text-stone-400 hover:text-white transition-colors">✕</button>
          </div>
          <div className="prose prose-invert max-w-none text-stone-300 leading-relaxed text-sm whitespace-pre-line">
            {aiAdvice}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="font-bold text-sm uppercase tracking-widest mb-6 text-stone-400">Occupancy Percentage Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} />
                <Tooltip 
                  formatter={(val) => [`${val}%`, 'Occupancy']}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                />
                <Line type="monotone" dataKey="occupancyPercent" stroke="#2D3E40" strokeWidth={3} dot={{ r: 4, fill: '#2D3E40' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="font-bold text-sm uppercase tracking-widest mb-6 text-stone-400">Revenue Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.slice(-12)}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C5A059" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C5A059" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                <Area type="monotone" dataKey="revenue" stroke="#C5A059" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="font-bold text-sm uppercase tracking-widest mb-6 text-stone-400">Origin of Guests</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} width={120} />
                <Tooltip cursor={{fill: '#f5f5f0'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                <Bar dataKey="value" fill="#7D5A50" radius={[0, 10, 10, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="font-bold text-sm uppercase tracking-widest mb-6 text-stone-400">Referral Attribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={referralStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {referralStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2D3E40', '#C5A059', '#7D5A50', '#A0816C', '#D4C4B5', '#4B5320', '#6F4E37'][index % 7]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-scale-in">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-stone-900">Collaboration Hub</h3>
                  <p className="text-stone-500 text-sm mt-1">Export analytics or invite your marketing partner.</p>
                </div>
                <button onClick={() => setShowShareModal(false)} className="text-stone-400 hover:text-stone-900 transition-colors p-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100 pb-2">Internal Assets</h4>
                  <button 
                    onClick={copyMarketingSummary}
                    className="w-full bg-stone-50 hover:bg-amber-50 border border-stone-200 p-5 rounded-2xl text-left flex items-center justify-between group transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs">Copy Stats Briefing</h4>
                      <p className="text-[10px] text-stone-500 mt-0.5">Quick text for agency WhatsApp.</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${copySuccess === 'summary' ? 'text-emerald-600' : 'text-stone-400'}`}>
                      {copySuccess === 'summary' ? 'Copied!' : 'Copy'}
                    </span>
                  </button>

                  <button 
                    onClick={exportAnalyticsCSV}
                    className="w-full bg-stone-50 hover:bg-amber-50 border border-stone-200 p-5 rounded-2xl text-left flex items-center justify-between group transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs">Export Marketing CSV</h4>
                      <p className="text-[10px] text-stone-500 mt-0.5">Raw data for spreadsheets.</p>
                    </div>
                    <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100 pb-2">Invite Marketing Partner</h4>
                  <form onSubmit={invitePartner} className="space-y-2">
                    <input 
                      type="email" 
                      placeholder="Agency email..." 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 ring-amber-600/20"
                      value={partnerEmail}
                      onChange={e => setPartnerEmail(e.target.value)}
                    />
                    <button type="submit" className="w-full bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl hover:bg-black transition-all">
                      Grant Access
                    </button>
                  </form>
                  {partners.length > 0 && (
                    <div className="max-h-24 overflow-y-auto pr-2 space-y-2">
                      {partners.map(p => (
                        <div key={p} className="flex justify-between items-center bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                          <span className="text-[10px] font-medium text-emerald-800 truncate">{p}</span>
                          <span className="text-[8px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase font-bold">Authorized</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 p-6 rounded-3xl flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.803a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.103-1.103" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm italic">Direct View Link</h4>
                    <p className="text-[10px] text-stone-500">Provide temporary restricted access.</p>
                  </div>
                </div>
                <button 
                  onClick={copyShareLink}
                  className="bg-white border border-stone-200 px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-stone-100 transition-all shadow-sm"
                >
                  {copySuccess === 'link' ? 'Copied URL!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
