import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Business, Director } from '../types';

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
    sameAsPhysical: false
  });

  const [directors, setDirectors] = useState<Director[]>([{
    name: '',
    idNumber: '',
    idPhotoUrl: ''
  }]);

  const [idPhotos, setIdPhotos] = useState<File[]>([]);

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

    // Prepare business data
    const businessData: Omit<Business, 'id' | 'createdAt' | 'status' | 'subscriptionTier' | 'subscriptionExpiry'> = {
      registeredName: formData.registeredName,
      businessNumber: formData.businessNumber,
      tradingName: formData.tradingName,
      directors,
      phone: formData.phone,
      email: formData.email,
      physicalAddress: formData.physicalAddress,
      postalAddress: formData.sameAsPhysical ? formData.physicalAddress : formData.postalAddress,
    };

    // Submit to Netlify Function
    try {
      const response = await fetch('/.netlify/functions/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessData)
      });

      if (response.ok) {
        navigate('/registration-success', { 
          state: { email: formData.email }
        });
      } else {
        alert('Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Network error. Please try again.');
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
                  />
                </div>
              </div>

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
                            className="cursor-pointer inline-flex items-center gap-2 text-stone-600"
                          >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Upload ID Photo
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
                  />
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
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="font-bold text-amber-900 mb-2">Subscription Summary</h3>
                <p className="text-amber-800 text-sm mb-4">14-day free trial, then R299/month</p>
                <ul className="text-sm text-amber-700 space-y-2">
                  <li>✓ Unlimited guest check-ins</li>
                  <li>✓ POPIA & Immigration Act compliant</li>
                  <li>✓ Digital indemnity forms</li>
                  <li>✓ Marketing analytics dashboard</li>
                  <li>✓ CSV data import/export</li>
                  <li>✓ 24/7 email support</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-8 border-t border-stone-100">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-8 py-3 border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="ml-auto px-8 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                className="ml-auto px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700"
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
