// src/components/staff/ResortSettingsTab.tsx
// Full implementation extracted from AI Studio prototype

import React, { useState } from 'react';

interface BusinessConfig {
  id: string;
  trading_name: string;
  registered_name: string;
  logo_url?: string;
  hero_image_url?: string;
  slogan?: string;
  welcome_message?: string;
  total_rooms: number;
  avg_price: number;
}

interface ResortSettingsTabProps {
  business: BusinessConfig;
  onUpdateBusiness: (business: BusinessConfig) => void;
}

export function ResortSettingsTab({ business, onUpdateBusiness }: ResortSettingsTabProps) {
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

export default ResortSettingsTab;
