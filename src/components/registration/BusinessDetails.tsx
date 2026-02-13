import React from 'react';
import { Address } from '../../types/registration';

interface BusinessDetailsProps {
  data: {
    registeredName: string;
    businessNumber: string;
    tradingName: string;
    phone: string;
    physicalAddress: Address;
    postalAddress: Address;
    sameAsPhysical: boolean;
  };
  onChange: (field: string, value: any) => void;
  onNext: () => void;
}

export default function BusinessDetails({ data, onChange, onNext }: BusinessDetailsProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">Business Registration</h2>
        <p className="text-stone-500 text-sm">Enter your business details to get started with Fast Checkin.</p>
      </div>

      {/* Business Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
            Registered Name <span className="text-amber-600">*</span>
          </label>
          <input
            type="text"
            required
            value={data.registeredName}
            onChange={e => onChange('registeredName', e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            placeholder="J-Bay Zebra Lodge Pty Ltd"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
            Business / Registration Number <span className="text-amber-600">*</span>
          </label>
          <input
            type="text"
            required
            value={data.businessNumber}
            onChange={e => onChange('businessNumber', e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            placeholder="2020/123456/07"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
            Trading Name <span className="text-amber-600">*</span>
          </label>
          <input
            type="text"
            required
            value={data.tradingName}
            onChange={e => onChange('tradingName', e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            placeholder="J-Bay Zebra Lodge"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
            Phone Number <span className="text-amber-600">*</span>
          </label>
          <input
            type="tel"
            required
            value={data.phone}
            onChange={e => onChange('phone', e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            placeholder="+27 82 123 4567"
          />
        </div>
      </div>

      {/* Physical Address */}
      <div className="border-t border-stone-100 pt-8">
        <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Physical Address</h3>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Address Line 1 *"
              required
              value={data.physicalAddress.line1}
              onChange={e => onChange('physicalAddress.line1', e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Address Line 2 (Optional)"
              value={data.physicalAddress.line2}
              onChange={e => onChange('physicalAddress.line2', e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="City *"
              required
              value={data.physicalAddress.city}
              onChange={e => onChange('physicalAddress.city', e.target.value)}
              className="px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="text"
              placeholder="Province *"
              required
              value={data.physicalAddress.province}
              onChange={e => onChange('physicalAddress.province', e.target.value)}
              className="px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Postal Code *"
              required
              value={data.physicalAddress.postalCode}
              onChange={e => onChange('physicalAddress.postalCode', e.target.value)}
              className="px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="text"
              placeholder="Country *"
              required
              value={data.physicalAddress.country}
              onChange={e => onChange('physicalAddress.country', e.target.value)}
              className="px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Postal Address */}
      <div className="border-t border-stone-100 pt-8">
        <div className="flex items-center gap-4 mb-6">
          <input
            type="checkbox"
            id="sameAddress"
            checked={data.sameAsPhysical}
            onChange={e => onChange('sameAsPhysical', e.target.checked)}
            className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
          />
          <label htmlFor="sameAddress" className="font-medium text-stone-700">
            Postal address same as physical address
          </label>
        </div>

        {!data.sameAsPhysical && (
          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Postal Address</h3>
            <div>
              <input
                type="text"
                placeholder="Address Line 1 *"
                required
                value={data.postalAddress.line1}
                onChange={e => onChange('postalAddress.line1', e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                value={data.postalAddress.line2}
                onChange={e => onChange('postalAddress.line2', e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="City *"
                required
                value={data.postalAddress.city}
                onChange={e => onChange('postalAddress.city', e.target.value)}
                className="px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="text"
                placeholder="Province *"
                required
                value={data.postalAddress.province}
                onChange={e => onChange('postalAddress.province', e.target.value)}
                className="px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Postal Code *"
                required
                value={data.postalAddress.postalCode}
                onChange={e => onChange('postalAddress.postalCode', e.target.value)}
                className="px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="text"
                placeholder="Country *"
                required
                value={data.postalAddress.country}
                onChange={e => onChange('postalAddress.country', e.target.value)}
                className="px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6">
        <button
          type="submit"
          className="px-8 py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg text-sm uppercase tracking-widest"
        >
          Continue to Director Information
        </button>
      </div>
    </form>
  );
}
