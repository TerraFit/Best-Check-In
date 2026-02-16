import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Director } from '../types';

export default function BusinessRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    registeredName: '',
    businessNumber: '',
    tradingName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    physicalAddress: {
      line1: '',
      line2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'South Africa'
    },
    postalAddress: {
      line1: '',
      line2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'South Africa'
    },
    sameAsPhysical: false,
    subscriptionTier: 'monthly',
    paymentMethod: 'card'
  });

  const [directors, setDirectors] = useState<Director[]>([{
    name: '',
    idNumber: '',
    idPhotoUrl: ''
  }]);

  const handleDirectorChange = (index: number, field: keyof Director, value: string) => {
    const updated = [...directors];
    updated[index] = { ...updated[index], [field]: value };
    setDirectors(updated);
  };

  const addDirector = () => {
    setDirectors([...directors, { name: '', idNumber: '', idPhotoUrl: '' }]);
  };

  const removeDirector = (index: number) => {
    if (directors.length > 1) {
      setDirectors(directors.filter((_, i) => i !== index));
    }
  };

  const handleIdPhotoUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = [...directors];
      updated[index].idPhotoUrl = reader.result as string;
      setDirectors(updated);
    };
    reader.readAsDataURL(file);
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate passwords match
  if (formData.password !== formData.confirmPassword) {
    alert("Passwords don't match");
    return;
  }

  if (formData.password.length < 8) {
    alert("Password must be at least 8 characters");
    return;
  }

  // Create data object step by step
  console.log("🔍 Step 1 - Password from form:", {
    password: formData.password ? '***' : 'MISSING',
    length: formData.password.length
  });

  const businessData = {
    registeredName: formData.registeredName,
    businessNumber: formData.businessNumber,
    tradingName: formData.tradingName,
    phone: formData.phone,
    email: formData.email,
    password: formData.password, // This MUST be here
    physicalAddress: formData.physicalAddress,
    postalAddress: formData.sameAsPhysical ? formData.physicalAddress : formData.postalAddress,
    sameAsPhysical: formData.sameAsPhysical,
    directors: directors,
    subscriptionTier: formData.subscriptionTier,
    paymentMethod: formData.paymentMethod
  };

  console.log("🔍 Step 2 - Final object keys:", Object.keys(businessData));
  console.log("🔍 Step 3 - Password in object:", !!businessData.password);
  console.log("🔍 Step 4 - Password length:", businessData.password?.length);

  // Log the actual JSON being sent
  const jsonString = JSON.stringify(businessData);
  console.log("🔍 Step 5 - JSON being sent:", jsonString.substring(0, 200) + "...");

  try {
    const response = await fetch('/.netlify/functions/register-business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString
    });

    const result = await response.json();
    console.log("📡 Response:", result);

    if (response.ok) {
      navigate('/registration-success', { 
        state: { email: formData.email }
      });
    } else {
      alert(`Registration failed: ${result.error || result.message || 'Please try again.'}`);
    }
  } catch (error) {
    console.error('🔥 Network error:', error);
    alert('Network error. Please check your connection and try again.');
  }
};

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-500'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-24 h-1 mx-2 ${
                  step > s ? 'bg-amber-600' : 'bg-stone-200'
                }`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-bold uppercase tracking-widest">
            <span className={step >= 1 ? 'text-amber-600' : 'text-stone-400'}>Business Details</span>
            <span className={step >= 2 ? 'text-amber-600' : 'text-stone-400'}>Director Information</span>
            <span className={step >= 3 ? 'text-amber-600' : 'text-stone-400'}>Account Setup</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Step 1: Business Details */}
          {step === 1 && (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif font-bold text-stone-900">Business Registration</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Registered Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.registeredName}
                    onChange={e => setFormData({...formData, registeredName: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="J-Bay Zebra Lodge Pty Ltd"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Business / Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessNumber}
                    onChange={e => setFormData({...formData, businessNumber: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="2020/123456/07"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Trading Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tradingName}
                    onChange={e => setFormData({...formData, tradingName: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="J-Bay Zebra Lodge"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="+27 82 123 4567"
                  />
                </div>
              </div>

              {/* Physical Address */}
              <div className="border-t border-stone-100 pt-8">
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Physical Address</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Address Line 1 *"
                      required
                      value={formData.physicalAddress.line1}
                      onChange={e => setFormData({
                        ...formData, 
                        physicalAddress: {...formData.physicalAddress, line1: e.target.value}
                      })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Address Line 2 (Optional)"
                      value={formData.physicalAddress.line2}
                      onChange={e => setFormData({
                        ...formData, 
                        physicalAddress: {...formData.physicalAddress, line2: e.target.value}
                      })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City *"
                      required
                      value={formData.physicalAddress.city}
                      onChange={e => setFormData({
                        ...formData, 
                        physicalAddress: {...formData.physicalAddress, city: e.target.value}
                      })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Province *"
                      required
                      value={formData.physicalAddress.province}
                      onChange={e => setFormData({
                        ...formData, 
                        physicalAddress: {...formData.physicalAddress, province: e.target.value}
                      })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Postal Code *"
                      required
                      value={formData.physicalAddress.postalCode}
                      onChange={e => setFormData({
                        ...formData, 
                        physicalAddress: {...formData.physicalAddress, postalCode: e.target.value}
                      })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Country *"
                      required
                      value={formData.physicalAddress.country}
                      onChange={e => setFormData({
                        ...formData, 
                        physicalAddress: {...formData.physicalAddress, country: e.target.value}
                      })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl"
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
                    checked={formData.sameAsPhysical}
                    onChange={e => setFormData({...formData, sameAsPhysical: e.target.checked})}
                    className="w-5 h-5 rounded border-stone-300 text-amber-600"
                  />
                  <label htmlFor="sameAddress" className="font-medium text-stone-700">
                    Postal address same as physical address
                  </label>
                </div>

                {!formData.sameAsPhysical && (
                  <>
                    <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Postal Address</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Address Line 1 *"
                          required
                          value={formData.postalAddress.line1}
                          onChange={e => setFormData({
                            ...formData, 
                            postalAddress: {...formData.postalAddress, line1: e.target.value}
                          })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Address Line 2 (Optional)"
                          value={formData.postalAddress.line2}
                          onChange={e => setFormData({
                            ...formData, 
                            postalAddress: {...formData.postalAddress, line2: e.target.value}
                          })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="City *"
                          required
                          value={formData.postalAddress.city}
                          onChange={e => setFormData({
                            ...formData, 
                            postalAddress: {...formData.postalAddress, city: e.target.value}
                          })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Province *"
                          required
                          value={formData.postalAddress.province}
                          onChange={e => setFormData({
                            ...formData, 
                            postalAddress: {...formData.postalAddress, province: e.target.value}
                          })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Postal Code *"
                          required
                          value={formData.postalAddress.postalCode}
                          onChange={e => setFormData({
                            ...formData, 
                            postalAddress: {...formData.postalAddress, postalCode: e.target.value}
                          })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Country *"
                          required
                          value={formData.postalAddress.country}
                          onChange={e => setFormData({
                            ...formData, 
                            postalAddress: {...formData.postalAddress, country: e.target.value}
                          })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Director Information */}
          {step === 2 && (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif font-bold text-stone-900">Director Information</h2>
              <p className="text-stone-500 text-sm">All directors must provide ID verification (FICA requirement)</p>

              {directors.map((director, index) => (
                <div key={index} className="border border-stone-200 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-stone-900">Director {index + 1}</h3>
                    {directors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDirector(index)}
                        className="text-red-500 text-xs hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={director.name}
                        onChange={e => handleDirectorChange(index, 'name', e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                        ID / Passport Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={director.idNumber}
                        onChange={e => handleDirectorChange(index, 'idNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                      Upload ID Document (Photo/Scan) *
                    </label>
                    <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center">
                      {director.idPhotoUrl ? (
                        <div className="space-y-3">
                          <img src={director.idPhotoUrl} alt="ID" className="max-h-32 mx-auto rounded-lg" />
                          <button
                            type="button"
                            onClick={() => handleDirectorChange(index, 'idPhotoUrl', '')}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            id={`id-${index}`}
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                handleIdPhotoUpload(index, e.target.files[0]);
                              }
                            }}
                          />
                          <label
                            htmlFor={`id-${index}`}
                            className="cursor-pointer inline-flex flex-col items-center gap-2 text-stone-600"
                          >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm">Click to upload ID photo</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addDirector}
                className="text-amber-600 font-bold text-sm hover:text-amber-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Another Director
              </button>
            </div>
          )}

          {/* Step 3: Account Setup */}
          {step === 3 && (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif font-bold text-stone-900">Account Setup</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Email Address (Login) *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Confirm Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                    placeholder="••••••••"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Subscription Tiers */}
              <div className="border-t border-stone-100 pt-8">
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Choose Your Plan</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <label className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                    formData.subscriptionTier === 'monthly' 
                      ? 'border-amber-600 bg-amber-50' 
                      : 'border-stone-200 hover:border-amber-200'
                  }`}>
                    <input
                      type="radio"
                      name="tier"
                      value="monthly"
                      checked={formData.subscriptionTier === 'monthly'}
                      onChange={e => setFormData({...formData, subscriptionTier: e.target.value})}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-stone-900">Monthly</h4>
                        <p className="text-2xl font-serif font-bold text-amber-700 mt-2">R299</p>
                        <p className="text-xs text-stone-500">per month</p>
                      </div>
                      {formData.subscriptionTier === 'monthly' && (
                        <div className="bg-amber-600 text-white p-1 rounded-full">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className={`border-2 rounded-2xl p-6 cursor-pointer transition-all relative overflow-hidden ${
                    formData.subscriptionTier === 'annual' 
                      ? 'border-amber-600 bg-amber-50' 
                      : 'border-stone-200 hover:border-amber-200'
                  }`}>
                    <div className="absolute top-0 right-0 bg-amber-600 text-white px-3 py-1 text-[10px] font-bold uppercase">
                      Save 17%
                    </div>
                    <input
                      type="radio"
                      name="tier"
                      value="annual"
                      checked={formData.subscriptionTier === 'annual'}
                      onChange={e => setFormData({...formData, subscriptionTier: e.target.value})}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-stone-900">Annual</h4>
                        <p className="text-2xl font-serif font-bold text-amber-700 mt-2">R2,990</p>
                        <p className="text-xs text-stone-500">R249/month</p>
                      </div>
                      {formData.subscriptionTier === 'annual' && (
                        <div className="bg-amber-600 text-white p-1 rounded-full">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Method */}
              <div className="border-t border-stone-100 pt-8">
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Payment Method</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <label className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    formData.paymentMethod === 'card' 
                      ? 'border-amber-600 bg-amber-50' 
                      : 'border-stone-200 hover:border-amber-200'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span className="font-medium">Credit / Debit Card</span>
                    </div>
                  </label>

                  <label className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    formData.paymentMethod === 'eft' 
                      ? 'border-amber-600 bg-amber-50' 
                      : 'border-stone-200 hover:border-amber-200'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="eft"
                      checked={formData.paymentMethod === 'eft'}
                      onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">EFT / Bank Transfer</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Terms */}
              <div className="bg-stone-50 p-6 rounded-xl">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    className="w-5 h-5 mt-0.5 rounded border-stone-300 text-amber-600"
                  />
                  <span className="text-sm text-stone-600">
                    I agree to the <a href="#" className="text-amber-700 font-bold hover:underline">Terms of Service</a> and 
                    <a href="#" className="text-amber-700 font-bold hover:underline ml-1">Privacy Policy</a>. I understand that 
                    my subscription will automatically renew unless cancelled.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-8 border-t border-stone-100">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-8 py-3 border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 transition-all text-sm uppercase tracking-widest"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="ml-auto px-8 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all text-sm uppercase tracking-widest"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                className="ml-auto px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all text-sm uppercase tracking-widest shadow-lg"
              >
                Complete Registration
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
