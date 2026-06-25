import { useState, useMemo } from 'react';
import { MOCK_VISITOR_RECORDS } from './data/mockVisitorData';
import { VisitorOriginMap } from './components/analytics/VisitorOriginMap';
import { SubscriptionTier, SubscriptionLimits, VisitorRecord } from './types';
import { 
  Compass, 
  QrCode, 
  Users, 
  Flame, 
  Calendar, 
  Clock, 
  Filter, 
  RotateCcw, 
  BookOpen, 
  Laptop, 
  Bell, 
  Settings, 
  CheckCircle,
  TrendingUp,
  Globe2
} from 'lucide-react';

export default function App() {
  // Active demo subscription state
  const [activeTier, setActiveTier] = useState<SubscriptionTier>('starter');

  // Filter conditions
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [guestTypeFilter, setGuestTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Limit structures derived dynamically
  const limits: SubscriptionLimits = useMemo(() => {
    return {
      subscriptionTier: activeTier,
      canViewCountries: activeTier !== 'starter',
      canViewRegions: activeTier === 'pro' || activeTier === 'business',
      canViewCities: activeTier === 'business',
      maxDrillLevel: activeTier === 'starter' ? 'continents' : activeTier === 'growth' ? 'countries' : activeTier === 'pro' ? 'regions' : 'cities',
    };
  }, [activeTier]);

  // Handle tier upgrades/changes in the explorer
  const handleTierChange = (tier: SubscriptionTier) => {
    setActiveTier(tier);
  };

  // Dynamically filter records based on current conditions
  const filteredRecords = useMemo(() => {
    return MOCK_VISITOR_RECORDS.filter((record) => {
      // 1. Search term match (country, region, city)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesCountry = record.country.toLowerCase().includes(term);
        const matchesRegion = record.region.toLowerCase().includes(term);
        const matchesCity = record.city.toLowerCase().includes(term);
        if (!matchesCountry && !matchesRegion && !matchesCity) return false;
      }

      // 2. Check-in method match
      if (methodFilter !== 'all' && record.checkInMethod !== methodFilter) {
        return false;
      }

      // 3. Guest Type match
      if (guestTypeFilter !== 'all' && record.guestType !== guestTypeFilter) {
        return false;
      }

      // 4. Time range match
      if (dateRange === '7d') {
        const recordDate = new Date(record.timestamp);
        const diffTime = Math.abs(Date.now() - recordDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (dateRange === '30d') {
        const recordDate = new Date(record.timestamp);
        const diffTime = Math.abs(Date.now() - recordDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return false;
      }

      return true;
    });
  }, [searchTerm, methodFilter, guestTypeFilter, dateRange]);

  // Calculate dynamic dashboard stats
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) {
      return { total: 0, countryCount: 0, topOrigin: 'N/A', qrPercentage: '0%' };
    }

    const uniqueCountries = new Set(filteredRecords.map(r => r.country));
    
    // Find top country source
    const countryCounts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      countryCounts[r.country] = (countryCounts[r.country] || 0) + 1;
    });
    let topCountry = 'N/A';
    let maxCount = 0;
    Object.entries(countryCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCountry = name;
      }
    });

    const qrCount = filteredRecords.filter(r => r.checkInMethod === 'QR Code').length;
    const qrPercentage = ((qrCount / total) * 100).toFixed(0) + '%';

    return {
      total,
      countryCount: uniqueCountries.size,
      topOrigin: `${topCountry} (${((maxCount / total) * 100).toFixed(0)}%)`,
      qrPercentage
    };
  }, [filteredRecords]);

  // Reset all filters
  const handleResetFilters = () => {
    setDateRange('all');
    setMethodFilter('all');
    setGuestTypeFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 font-sans">
      {/* Navigation Top Header */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Brand icon / Logo */}
              <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center text-white font-extrabold shadow-md shadow-orange-500/20">
                <QrCode size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-base font-extrabold text-stone-950 tracking-tight">
                  FastCheckin
                </span>
                <span className="text-xs text-stone-400 block font-mono">www.FastCheckin.co.za</span>
              </div>
            </div>

            {/* Simulated Live Connection status */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-lg text-xs font-mono text-stone-500 border border-stone-200">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                <span>SYSTEM_ONLINE</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-stone-400 hover:text-stone-600 rounded-lg transition-colors">
                  <Bell size={18} />
                </button>
                <button className="p-2 text-stone-400 hover:text-stone-600 rounded-lg transition-colors">
                  <Settings size={18} />
                </button>
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs border border-orange-200">
                  FC
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-stone-950 tracking-tight">
              Visitor Origin Dashboard
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Visualize where your visitors check in from around the globe. Click to drill down into deeper structures, powered by the orange bubble mapping framework.
            </p>
          </div>
          {/* Quick billing/upgrade promotion */}
          <div className="flex items-center gap-3 bg-orange-50 px-4 py-3 rounded-2xl border border-orange-100/50 self-start md:self-auto">
            <div className="p-2 bg-orange-500 rounded-xl text-white">
              <Flame size={18} className="animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-orange-950 block">Unlock Deep Insights</span>
              <span className="text-[11px] text-orange-700 block">Upgrade to view states and cities</span>
            </div>
          </div>
        </div>

        {/* 🛠️ Dashboard Interactive Controls Console */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Main Filtering card */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm h-fit space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
                <Filter size={15} className="text-orange-500" />
                Filter Dataset
              </span>
              {(dateRange !== 'all' || methodFilter !== 'all' || guestTypeFilter !== 'all' || searchTerm !== '') && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>

            {/* Time period */}
            <div>
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-2">Time Period</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: 'all', label: 'All Time' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setDateRange(item.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition-all ${
                      dateRange === item.id
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Check-In method */}
            <div>
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-2">Check-in Channel</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="all">All Channels (Combined)</option>
                <option value="QR Code">QR Code Scan</option>
                <option value="Reception Desk">Reception Desk Check-in</option>
                <option value="Direct Link">Direct Invitation Link</option>
                <option value="Kiosk">Self-Service Kiosk</option>
              </select>
            </div>

            {/* Guest Type */}
            <div>
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-2">Guest Type</span>
              <select
                value={guestTypeFilter}
                onChange={(e) => setGuestTypeFilter(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="all">All Guests (Combined)</option>
                <option value="First-time">First-time visitors</option>
                <option value="Returning">Returning loyal guests</option>
                <option value="VIP">VIP Priority visitors</option>
              </select>
            </div>

            {/* Search terms */}
            <div>
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-2">Filter by name</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search country, state or city..."
                className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Slogan details */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 font-mono">
              <span>ACTIVE_RECORDS:</span>
              <span className="font-bold text-stone-700">{filteredRecords.length}</span>
            </div>
          </div>

          {/* Core Analytics Map container (Occupies 3 Columns) */}
          <div className="lg:col-span-3">
            <VisitorOriginMap
              data={filteredRecords}
              limits={limits}
              onTierChange={handleTierChange}
              isLoading={false}
            />
          </div>
        </div>

        {/* 📊 Summary Stats Blocks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: 'Total Check-ins',
              value: stats.total,
              desc: 'Filtered visitor records count',
              icon: <Users size={16} className="text-orange-500" />,
              bg: 'bg-orange-50'
            },
            {
              label: 'Source Countries',
              value: stats.countryCount,
              desc: 'Unique visitor origin nations',
              icon: <Globe2 size={16} className="text-blue-500" />,
              bg: 'bg-blue-50'
            },
            {
              label: 'Lead Visitor Source',
              value: stats.topOrigin,
              desc: 'Top contributor by volume',
              icon: <TrendingUp size={16} className="text-emerald-500" />,
              bg: 'bg-emerald-50'
            },
            {
              label: 'QR Code Adoption',
              value: stats.qrPercentage,
              desc: 'Saves desk check-in queue times',
              icon: <QrCode size={16} className="text-purple-500" />,
              bg: 'bg-purple-50'
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{item.label}</span>
                <div className={`p-1.5 rounded-lg ${item.bg}`}>{item.icon}</div>
              </div>
              <div>
                <span className="text-xl font-extrabold text-stone-900 leading-none">{item.value}</span>
                <span className="text-[10px] text-stone-400 block mt-1 truncate">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 📋 Live Data Feed log list */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
            <div>
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <CheckCircle size={15} className="text-green-500" />
                Live Guest Records Stream
              </h4>
              <p className="text-[11px] text-stone-400 mt-0.5">Showing records currently computed in the bubbles above</p>
            </div>
            <span className="text-[11px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
              ROWS: {filteredRecords.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 font-mono text-stone-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3">Visitor ID</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Continent</th>
                  <th className="px-6 py-3">Country</th>
                  <th className="px-6 py-3">State / Region</th>
                  <th className="px-6 py-3">City / Suburb</th>
                  <th className="px-6 py-3">Channel</th>
                  <th className="px-6 py-3">Guest Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredRecords.length > 0 ? (
                  filteredRecords.slice(0, 10).map((record) => (
                    <tr key={record.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-3 font-mono text-stone-500 font-bold">{record.id}</td>
                      <td className="px-6 py-3 text-stone-400 font-mono">
                        {new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-6 py-3 text-stone-700">{record.continent}</td>
                      <td className="px-6 py-3 text-stone-900 font-bold">{record.country}</td>
                      <td className="px-6 py-3 text-stone-600">{record.region}</td>
                      <td className="px-6 py-3 text-orange-600 font-semibold">{record.city}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                          record.checkInMethod === 'QR Code' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                          record.checkInMethod === 'Reception Desk' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          record.checkInMethod === 'Kiosk' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {record.checkInMethod}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          record.guestType === 'VIP' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          record.guestType === 'Returning' ? 'bg-slate-100 text-slate-700' :
                          'bg-stone-100 text-stone-500'
                        }`}>
                          {record.guestType}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-stone-400">
                      No records match the current filters. Click reset to load initial guest entries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredRecords.length > 10 && (
            <div className="px-6 py-3 border-t border-stone-100 bg-stone-50/50 text-center text-stone-400 text-[11px] font-mono">
              And {filteredRecords.length - 10} more records in database. Filter data to target specific entries.
            </div>
          )}
        </div>

        {/* Footer info brand block */}
        <div className="mt-16 text-center border-t border-stone-200/60 pt-8 pb-12">
          <p className="text-xs text-stone-400 font-mono tracking-widest uppercase">
            ⚡ FastCheckin — Comprehensive Visitor Registration Solutions
          </p>
          <p className="text-[10px] text-stone-400/80 mt-1 max-w-md mx-auto leading-relaxed">
            FastCheckin delivers instant self-service, touchless QR code scan, and secure cloud guest register suites for wineries, estate parks, corporate parks, and high-frequency hospitality zones.
          </p>
          <div className="flex justify-center gap-6 mt-4 text-xs font-bold text-stone-400/80">
            <a href="https://www.fastcheckin.co.za" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">www.FastCheckin.co.za</a>
            <span>•</span>
            <span className="text-stone-300">Cape Town, South Africa</span>
          </div>
        </div>

      </main>
    </div>
  );
}
