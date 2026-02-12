import React, { useState } from 'react';
import Papa from 'papaparse';
import { Booking, MonthlyData } from '../types';
import { ImportPreview, mapRowToBooking, mergeMonthlyData } from '../services/importService';

interface ImportDataProps {
  onImport: (bookings: Booking[], monthlyData: MonthlyData[]) => void;
  existingBookings: Booking[];
  existingMonthlyData: MonthlyData[];
}

const ImportData: React.FC<ImportDataProps> = ({ 
  onImport, 
  existingBookings, 
  existingMonthlyData 
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = (file: File) => {
    setIsImporting(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const newBookings: Booking[] = [];
          const duplicateBookings: Booking[] = [];
          
          results.data.forEach((row: any) => {
            const result = mapRowToBooking(row, existingBookings);
            
            if (result.booking) {
              if (result.isDuplicate) {
                duplicateBookings.push(result.booking);
              } else {
                newBookings.push(result.booking);
              }
            }
          });

          const previewData: ImportPreview = {
            newBookings,
            duplicateBookings,
            stats: {
              total: newBookings.length + duplicateBookings.length,
              new: newBookings.length,
              duplicates: duplicateBookings.length,
              skipped: results.data.length - (newBookings.length + duplicateBookings.length)
            }
          };

          setPreview(previewData);
          setStep('preview');
          setIsImporting(false);
        } catch (err) {
          setError('Failed to process CSV file. Please check the format.');
          setIsImporting(false);
        }
      },
      error: (err) => {
        setError(`Parse error: ${err.message}`);
        setIsImporting(false);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    processFile(file);
  };

  const confirmImport = () => {
    if (!preview) return;
    
    // Merge all bookings (new + duplicates as new stays)
    const allImportedBookings = [
      ...preview.newBookings,
      ...preview.duplicateBookings
    ];
    
    // Merge with existing bookings
    const mergedBookings = [...allImportedBookings, ...existingBookings];
    
    // Recalculate monthly stats
    const mergedMonthly = mergeMonthlyData(existingMonthlyData, allImportedBookings);
    
    // Call the parent onImport handler
    onImport(mergedBookings, mergedMonthly);
    
    setStep('complete');
  };

  const resetImport = () => {
    setPreview(null);
    setStep('upload');
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden">
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 px-10 py-8 text-white">
          <h2 className="text-3xl font-serif font-bold">Legacy Data Import</h2>
          <p className="text-stone-400 text-sm mt-2 max-w-2xl">
            Import guest history from CSV. Duplicate detection will match existing guests by ID/Passport or normalized name + country.
          </p>
        </div>

        <div className="p-10">
          {step === 'upload' && (
            <div className="space-y-8">
              <div className="border-3 border-dashed border-stone-200 rounded-[2rem] p-16 text-center bg-stone-50/50">
                <div className="bg-amber-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-serif font-bold text-stone-900 mb-3">
                  Upload Legacy Registry
                </h3>
                <p className="text-stone-500 mb-8 max-w-md mx-auto">
                  Select your CSV export from the previous system. We'll automatically detect duplicates and normalize country names.
                </p>
                
                <label className="inline-flex items-center bg-stone-900 text-white px-10 py-5 rounded-full cursor-pointer hover:bg-stone-800 transition-all shadow-xl text-sm font-bold uppercase tracking-widest">
                  {isImporting ? (
                    <span className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Processing...
                    </span>
                  ) : (
                    'Select CSV File'
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleFileUpload}
                    disabled={isImporting}
                  />
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Expected CSV Columns
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-amber-100">
                    <span className="font-bold text-amber-900">FULL NAME</span>
                    <span className="text-stone-500 block text-[10px]">Required</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-100">
                    <span className="font-bold text-amber-900">DATE OF ARRIVAL</span>
                    <span className="text-stone-500 block text-[10px]">DD/MM/YYYY</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-100">
                    <span className="font-bold text-amber-900">COUNTRY OF RESIDENCE</span>
                    <span className="text-stone-500 block text-[10px]">Auto-normalized</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-100">
                    <span className="font-bold text-amber-900">ID NUMBER</span>
                    <span className="text-stone-500 block text-[10px]">For matching</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Total Records</p>
                  <p className="text-4xl font-serif font-bold text-stone-900 mt-2">{preview.stats.total}</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">New Guests</p>
                  <p className="text-4xl font-serif font-bold text-emerald-800 mt-2">{preview.stats.new}</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                  <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">Duplicate Stays</p>
                  <p className="text-4xl font-serif font-bold text-amber-800 mt-2">{preview.stats.duplicates}</p>
                </div>
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Skipped</p>
                  <p className="text-4xl font-serif font-bold text-stone-900 mt-2">{preview.stats.skipped}</p>
                </div>
              </div>

              {preview.duplicateBookings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-2 rounded-full">
                      <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-900">Duplicate Detection</h4>
                      <p className="text-sm text-amber-800 mt-1">
                        Found {preview.duplicateBookings.length} stay(s) matching existing guests. These will be added as new stays for those guests.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
                <h4 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Preview of New Records
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[10px] uppercase text-stone-500 font-bold border-b border-stone-200">
                      <tr>
                        <th className="pb-3">Guest Name</th>
                        <th className="pb-3">ID/Passport</th>
                        <th className="pb-3">Country</th>
                        <th className="pb-3">Check-In</th>
                        <th className="pb-3">Nights</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {preview.newBookings.slice(0, 5).map((b, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="py-3 font-medium">{b.guestName}</td>
                          <td className="py-3 font-mono text-xs">{b.passportOrId}</td>
                          <td className="py-3">{b.country}</td>
                          <td className="py-3">{b.checkInDate}</td>
                          <td className="py-3">{b.nights}</td>
                          <td className="py-3">
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold">New Guest</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.newBookings.length > 5 && (
                    <p className="text-xs text-stone-500 mt-4 text-center">
                      +{preview.newBookings.length - 5} more new records
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-6 border-t border-stone-100">
                <button
                  onClick={resetImport}
                  className="px-8 py-4 border border-stone-200 rounded-full text-stone-600 font-bold hover:bg-stone-50 transition-all text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  className="bg-stone-900 text-white px-12 py-4 rounded-full font-bold hover:bg-stone-800 transition-all shadow-lg text-xs uppercase tracking-widest"
                >
                  Confirm Import
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-16 animate-scale-in">
              <div className="bg-emerald-100 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-14 h-14 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-3xl font-serif font-bold text-stone-900 mb-4">
                Import Complete!
              </h3>
              
              <p className="text-stone-500 mb-8 max-w-md mx-auto">
                Successfully imported {preview?.stats.new + preview?.stats.duplicates} stays. Marketing analytics and occupancy data have been updated.
              </p>
              
              <button
                onClick={resetImport}
                className="bg-stone-900 text-white px-12 py-5 rounded-full font-bold hover:bg-stone-800 transition-all shadow-xl text-sm uppercase tracking-widest"
              >
                Import Another File
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportData;
