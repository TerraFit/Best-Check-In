// src/components/staff/BusinessOverviewTab.tsx
// Extracted from AI Studio prototype - BusinessOverviewTab function

import React, { useMemo } from 'react';
import { 
import { t } from '../../i18n';
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Cell, AreaChart, Area
} from 'recharts';

interface BusinessOverviewTabProps {
  bookings: any[];
  totalRooms: number;
}

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export function BusinessOverviewTab({ bookings, totalRooms }: BusinessOverviewTabProps) {
  // Calculate statistics
  const totalCheckinsCount = bookings.length;
  const activeStaysCount = bookings.filter((b: any) => b.status === 'checked_in' || b.status === 'Checked-In').length;
  
  const avgNights = useMemo(() => {
    if (bookings.length === 0) return '0';
    const sum = bookings.reduce((s: number, b: any) => s + (b.nights || 0), 0);
    return (sum / bookings.length).toFixed(1);
  }, [bookings]);

  // Aggregate country distribution
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b: any) => {
      const country = b.guest_country || b.country || 'Unknown';
      counts[country] = (counts[country] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  // Aggregate referral sources
  const referralCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b: any) => {
      const source = b.referral_source || b.referralSource || 'Unknown';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  // Aggregate dietary statistics
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

    bookings.forEach((b: any) => {
      const restrictions = b.food_restrictions;
      if (restrictions) {
        if (restrictions.vegetarian) counts.vegetarian++;
        if (restrictions.vegan) counts.vegan++;
        if (restrictions.halal) counts.halal++;
        if (restrictions.kosher) counts.kosher++;
        if (restrictions.gluten_free) counts.gluten_free++;
        if (restrictions.nut_allergy) counts.nut_allergy++;
        if (restrictions.diabetic) counts.diabetic++;
      }
    });

    return Object.entries(counts)
      .map(([key, count]) => ({
        name: key.replace('_', ' ').toUpperCase(),
        count
      }))
      .filter(item => item.count > 0);
  }, [bookings]);

  const activeDietaries = bookings.filter((b: any) => 
    b.food_restrictions && Object.values(b.food_restrictions).some(v => v === true)
  ).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stat Widget Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('staff_total_registrations')}</p>
          <p className="text-3xl font-serif font-black text-stone-950 mt-1">{totalCheckinsCount}</p>
          <p className="text-[10px] text-stone-400 mt-2">{t('staff_hist_checkins')}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('staff_active_stays')}</p>
          <p className="text-3xl font-serif font-black text-emerald-600 mt-1">{activeStaysCount}</p>
          <p className="text-[10px] text-stone-400 mt-2">{t('staff_checked_in_on_property')}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('staff_avg_length_stay')}</p>
          <p className="text-3xl font-serif font-black text-stone-950 mt-1">{avgNights} Nights</p>
          <p className="text-[10px] text-stone-400 mt-2">{t('staff_avg_duration')}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('staff_kitchen_alerts')}</p>
          <p className="text-3xl font-serif font-black text-amber-500 mt-1">{activeDietaries} Active</p>
          <p className="text-[10px] text-stone-400 mt-2">{t('staff_dietary_warnings')}</p>
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
              <div className="h-full flex items-center justify-center text-xs text-stone-400">{t('staff_no_data_loaded')}</div>
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
              <div className="h-full flex items-center justify-center text-xs text-stone-400">{t('staff_no_bookings_loaded')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessOverviewTab;
