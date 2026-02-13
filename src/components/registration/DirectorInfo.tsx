import React, { useState } from 'react';
import { Director } from '../../types/registration';

interface DirectorInfoProps {
  directors: Director[];
  onChange: (directors: Director[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function DirectorInfo({ directors, onChange, onNext, onBack }: DirectorInfoProps) {
  const [uploading, setUploading] = useState<number | null>(null);

  const handleDirectorChange = (index: number, field: keyof Director, value: string) => {
    const updated = [...directors];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleFileUpload = async (index: number, file: File) => {
    setUploading(index);
    
    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = [...directors];
      updated[index].idPhotoUrl = reader.result as string;
      updated[index].idPhotoFile = file;
      onChange(updated);
      setUploading(null);
    };
    reader.readAsDataURL(file);
  };

  const addDirector = () => {
    onChange([...directors, { name: '', idNumber: '', idPhotoUrl: '' }]);
  };

  const removeDirector = (index: number) => {
    if (directors.length > 1) {
      onChange(directors.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all directors have required fields
    const isValid = directors.every(d => 
      d.name.trim() && 
      d.idNumber.trim() && 
      d.idPhotoUrl
    );
    
    if (isValid) {
      onNext();
    } else {
      alert('Please complete all director information including ID uploads');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">Director Information</h2>
        <p className="text-stone-500 text-sm">FICA requirement - all directors must provide identification.</p>
      </div>

      {directors.map((director, index) => (
        <div key={index} className="border-2 border-stone-100 rounded-2xl p-6 space-y-4 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-stone-900">Director {index + 1}</h3>
            {directors.length > 1 && (
              <button
                type="button"
                onClick={() => removeDirector(index)}
                className="text-red-500 text-xs hover:text-red-700 font-bold uppercase tracking-widest"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                Full Name <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                required
                value={director.name}
                onChange={e => handleDirectorChange(index, 'name', e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                ID / Passport Number <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                required
                value={director.idNumber}
                onChange={e => handleDirectorChange(index, 'idNumber', e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                placeholder="900101 5084 089"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
              Upload ID Document (Photo/Scan) <span className="text-amber-600">*</span>
            </label>
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:border-amber-500 transition-colors">
              {director.idPhotoUrl ? (
                <div className="space-y-3">
                  <img 
                    src={director.idPhotoUrl} 
                    alt="ID Document" 
                    className="max-h-32 mx-auto rounded-lg shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleDirectorChange(index, 'idPhotoUrl', '')}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
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
                        handleFileUpload(index, e.target.files[0]);
                      }
                    }}
                    disabled={uploading === index}
                  />
                  <label
                    htmlFor={`id-${index}`}
                    className="cursor-pointer inline-flex flex-col items-center gap-3"
                  >
                    {uploading === index ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent" />
                        <span className="text-sm text-stone-600">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-amber-50 p-4 rounded-full">
                          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-stone-600">
                          Click to upload ID photo
                        </span>
                        <span className="text-xs text-stone-400">
                          JPG, PNG or PDF (max 5MB)
                        </span>
                      </>
                    )}
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

      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-4 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-all text-sm uppercase tracking-widest"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-8 py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg text-sm uppercase tracking-widest"
        >
          Continue to Payment
        </button>
      </div>
    </form>
  );
}
