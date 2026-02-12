
import React, { useState } from 'react';
import Papa from 'papaparse';
import { Booking, MonthlyData, SettlementMethod, ReferralSource } from '../types';

interface ImportDataProps {
  onImport: (bookings: Booking[], monthlyData: MonthlyData[]) => void;
}

const ImportData: React.FC<ImportDataProps> = ({ onImport }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ count: number } | null>(null);

  const mapToBooking = (row: any): Booking | null => {
    // Basic validation: row must have a name and some indicator of a booking
    const name = row['FULL NAME'] || row['Full Name'];
    const arrival = row['DATE OF ARRIVAL'] || row['Date of Arrival'];
    const departure = row['DATE OF DEPARTURE'] || row['Date of Departure'];
    
    if (!name || !arrival) return null;

    // Helper to parse dates like DD/MM/YYYY
    const parseDate = (dateStr: string) => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // Try to handle YYYY vs YY and simple date strings
        let year = parts[2].trim();
        if (year.length === 2) year = '20' + year;
        return new Date(`${year}-${parts[1]}-${parts[0]}`);
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const startDate = parseDate(arrival);
    const endDate = parseDate(departure);
    let nights = 1;
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    const country = (row['COUNTRY OF RESIDENCE'] || 'South Africa').replace('.', '').trim();
    
    // Fixed: Added missing 'adults' and 'kids' properties to satisfy the Booking interface.
    return {
      id: Math.random().toString(36).substr(2, 9),
      guestName: name.trim(),
      email: (row['Adresse e-mail'] || row['Email'] || '').trim(),
      phone: (row['PHONE NUMBER'] || '').trim(),
      country: country,
      city: row['CITY - TOWN'] || row['City / Town'] || '',
      province: row['PROVINCE (RSA only)'] || '',
      passportOrId: 'Imported', // Default for historical data
      nextDestination: 'Unknown',
      checkInDate: arrival,
      checkOutDate: departure || arrival,
      nights: nights,
      settlementMethod: (row['On checking out my account/balance will be settled by :'] || 'Card') as SettlementMethod,
      referralSource: (row['Please, let us know HOW YOU DID HEAR ABOUT J-BAY ZEBRA LODGE !'] || 'Google') as ReferralSource,
      guests: 2,
      adults: 2,
      kids: 0,
      roomType: 'Suite',
      totalAmount: 0,
      status: 'Completed',
      year: startDate ? startDate.getFullYear() : 2024,
      month: startDate ? startDate.toLocaleString('default', { month: 'short' }) : 'Jan',
      popiaMarketingConsent: true,
      timestamp: row['Horodateur'] || new Date().toISOString()
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setStats(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const importedBookings: Booking[] = results.data
            .map(row => mapToBooking(row))
            .filter((b): b is Booking => b !== null);

          if (importedBookings.length === 0) {
            setError("No valid booking records were found in the file. Please check column headers.");
            setIsImporting(false);
            return;
          }

          // Generate Monthly Aggregates for the Marketing charts
          const monthlyMap: Record<string, MonthlyData> = {};
          importedBookings.forEach(b => {
            const key = `${b.month}-${b.year}`;
            if (!monthlyMap[key]) {
              monthlyMap[key] = {
                month: b.month,
                year: b.year,
                bookings: 0,
                revenue: 0,
                referralData: {}
              };
            }
            monthlyMap[key].bookings += 1;
            // Est. revenue for historical trends if not provided
            monthlyMap[key].revenue += (b.nights * 2500); 
            
            const source = b.referralSource || 'Unknown';
            monthlyMap[key].referralData![source] = (monthlyMap[key].referralData![source] || 0) + 1;
          });

          const monthlyData = Object.values(monthlyMap).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months.indexOf(a.month) - months.indexOf(b.month);
          });

          onImport(importedBookings, monthlyData);
          setStats({ count: importedBookings.length });
          setIsImporting(false);
        } catch (err) {
          setError("An error occurred while processing the data. Ensure the CSV format is correct.");
          setIsImporting(false);
        }
      },
      error: (err) => {
        setError(`File upload error: ${err.message}`);
        setIsImporting(false);
      }
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white border-2 border-dashed border-stone-300 rounded-[3rem] p-12 text-center shadow-xl">
        <div className="bg-stone-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <svg className="h-12 w-12 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <h3 className="text-2xl font-serif font-bold text-stone-900 mb-3">Lodge Data Processor</h3>
        <p className="text-stone-500 mb-10 text-sm leading-relaxed max-w-md mx-auto">
          Upload your Guest Registry CSV (the file you just shared) to sync historical analytics and market origin trends.
        </p>
        
        {!stats ? (
          <label className="relative inline-flex items-center bg-stone-900 text-white px-12 py-5 rounded-full cursor-pointer hover:bg-black transition-all group shadow-2xl transform active:scale-95">
            {isImporting ? (
              <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Analyzing CSV...
              </span>
            ) : (
              <span className="text-xs font-bold uppercase tracking-widest">Select File to Import</span>
            )}
            <input 
              type="file" 
              className="hidden" 
              accept=".csv" 
              onChange={handleFileUpload}
              disabled={isImporting}
            />
          </label>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl animate-scale-in">
            <div className="text-emerald-600 font-bold text-lg mb-1">Success!</div>
            <p className="text-emerald-700 text-sm">{stats.count} records have been successfully mapped and integrated.</p>
            <button 
              onClick={() => setStats(null)}
              className="mt-6 text-[10px] uppercase font-bold tracking-widest text-stone-400 hover:text-stone-900"
            >
              Import another file
            </button>
          </div>
        )}
        
        {error && (
          <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-medium border border-red-100 animate-fade-in">
            {error}
          </div>
        )}
        
        <div className="mt-14 pt-10 border-t border-stone-100 grid grid-cols-3 gap-6 text-[9px] text-stone-400 uppercase tracking-[0.2em] font-bold">
           <div className="flex flex-col items-center gap-2">
             <div className="w-2 h-2 bg-stone-200 rounded-full" />
             Yearly Stats
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="w-2 h-2 bg-stone-200 rounded-full" />
             Guest Origin
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="w-2 h-2 bg-stone-200 rounded-full" />
             Source ROI
           </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;
