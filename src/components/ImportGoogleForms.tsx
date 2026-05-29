import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

interface ImportPreviewRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportPreview {
  rows: ImportPreviewRow[];
  validCount: number;
  invalidCount: number;
  warningCount: number;
  columnMapping: Record<string, string>;
  detectedColumns: string[];
}

// Database fields that FastCheckin understands
const FASTCHECKIN_FIELDS = [
  { key: 'guest_first_name', label: 'First Name', required: true, description: 'Guest first name' },
  { key: 'guest_last_name', label: 'Last Name', required: true, description: 'Guest last name' },
  { key: 'guest_email', label: 'Email Address', required: false, description: 'Guest email for confirmation' },
  { key: 'guest_phone', label: 'Phone Number', required: false, description: 'Contact number' },
  { key: 'check_in_date', label: 'Check-in Date', required: true, description: 'Arrival date (DD/MM/YYYY)' },
  { key: 'check_out_date', label: 'Check-out Date', required: false, description: 'Departure date' },
  { key: 'nights', label: 'Number of Nights', required: false, description: 'Auto-calculated' },
  { key: 'guest_country', label: 'Country', required: false, description: 'Country of residence' },
  { key: 'guest_province', label: 'Province/State', required: false, description: 'Province or state' },
  { key: 'guest_city', label: 'City/Town', required: false, description: 'City or town name' },
  { key: 'referral_source', label: 'Referral Source', required: false, description: 'How they heard about us' },
  { key: 'settlement_method', label: 'Payment Method', required: false, description: 'How they paid' },
  { key: 'adults', label: 'Number of Adults', required: false, description: 'Adult guests count' },
  { key: 'children', label: 'Number of Children', required: false, description: 'Children count' },
  { key: 'total_amount', label: 'Total Amount (ZAR)', required: false, description: 'Total booking amount' },
  { key: 'id_number', label: 'ID/Passport Number', required: false, description: 'Identification number' }
];

export default function ImportGoogleForms({ businessId, onImportComplete, onClose }: { 
  businessId: string; 
  onImportComplete: () => void; 
  onClose: () => void;
}) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateFormat, setDateFormat] = useState<'DMY' | 'MDY'>('DMY');

  const downloadTemplate = () => {
    const templateData = [{
      'Full Name': 'John Smith',
      'Email Address': 'john@example.com',
      'Phone Number': '+27 82 123 4567',
      'Check-in Date': '25/12/2024',
      'Check-out Date': '30/12/2024',
      'Country': 'South Africa',
      'Province/State': 'Western Cape',
      'City/Town': 'Cape Town',
      'Referral Source': 'Google',
      'Payment Method': 'Card',
      'Adults': '2',
      'Children': '1',
      'Total Amount (ZAR)': '7500',
      'ID/Passport Number': '9001015001081'
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    const instructions = [
      ['FASTCHECKIN IMPORT TEMPLATE INSTRUCTIONS'],
      [''],
      ['DATE FORMAT: Use DD/MM/YYYY (e.g., 25/12/2024 for 25 December 2024)'],
      [''],
      ['REQUIRED FIELDS:'],
      ['- Full Name - The full name of the guest'],
      ['- Check-in Date - Date of arrival (DD/MM/YYYY format)'],
      [''],
      ['HOW NAMES ARE PROCESSED:'],
      ['- "John Smith" → First Name: "John", Last Name: "Smith"'],
      ['- "John Michael Smith" → First Name: "John", Last Name: "Smith"'],
      [''],
      ['RECOMMENDED FIELDS:'],
      ['- Email Address - For sending confirmation emails'],
      ['- Phone Number - Contact number'],
      ['- Check-out Date - For calculating stay duration'],
      ['- Country - Guest country of residence']
    ];
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    XLSX.writeFile(workbook, 'fastcheckin_import_template.xlsx');
  };

  const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
    if (!fullName) return { firstName: '', lastName: '' };
    
    const trimmed = fullName.trim();
    const words = trimmed.split(' ').filter(w => w.length > 0);
    
    if (words.length === 0) return { firstName: '', lastName: '' };
    if (words.length === 1) return { firstName: words[0], lastName: '' };
    
    return { firstName: words[0], lastName: words[words.length - 1] };
  };

  // ✅ CORRECTED: parseDate that respects selected format
  const parseDate = (dateStr: any, format: 'DMY' | 'MDY'): string => {
    if (!dateStr) return '';
    
    let strValue = '';
    
    // Handle Excel serial date numbers
    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateStr * 86400000);
      return date.toISOString().split('T')[0];
    }
    
    strValue = String(dateStr).trim();
    
    // Handle YYYY-MM-DD format (already correct)
    let match = strValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      const testDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(testDate.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }
    
    // Handle DD/MM/YYYY or MM/DD/YYYY based on selected format
    match = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const first = match[1].padStart(2, '0');
      const second = match[2].padStart(2, '0');
      const year = match[3];
      
      let month: string, day: string;
      
      if (format === 'DMY') {
        // DD/MM/YYYY
        day = first;
        month = second;
      } else {
        // MM/DD/YYYY
        month = first;
        day = second;
      }
      
      const testDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(testDate.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }
    
    // Try JavaScript Date parsing as fallback
    const date = new Date(strValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    console.error('Failed to parse date:', strValue, 'with format:', format);
    return '';
  };

  const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn) return 1;
    try {
      const start = new Date(checkIn);
      const end = checkOut ? new Date(checkOut) : new Date(checkIn);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch (e) {
      return 1;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setError(null);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        throw new Error('No data found in file');
      }
      
      setRawData(jsonData);
      
      const columns = Object.keys(jsonData[0]);
      console.log('📊 Detected columns:', columns);
      setDetectedColumns(columns);
      
      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      columns.forEach(col => {
        const lowerCol = col.toLowerCase();
        
        if (lowerCol.includes('first')) autoMapping[col] = 'guest_first_name';
        else if (lowerCol.includes('last')) autoMapping[col] = 'guest_last_name';
        else if (lowerCol.includes('email')) autoMapping[col] = 'guest_email';
        else if (lowerCol.includes('phone')) autoMapping[col] = 'guest_phone';
        else if (lowerCol.includes('country')) autoMapping[col] = 'guest_country';
        else if (lowerCol.includes('province')) autoMapping[col] = 'guest_province';
        else if (lowerCol.includes('city')) autoMapping[col] = 'guest_city';
        else if (lowerCol.includes('check_in') || lowerCol.includes('arrival')) autoMapping[col] = 'check_in_date';
        else if (lowerCol.includes('check_out') || lowerCol.includes('departure')) autoMapping[col] = 'check_out_date';
        else if (lowerCol.includes('referral')) autoMapping[col] = 'referral_source';
        else if (lowerCol.includes('payment')) autoMapping[col] = 'settlement_method';
        else if (lowerCol.includes('adult')) autoMapping[col] = 'adults';
        else if (lowerCol.includes('child')) autoMapping[col] = 'children';
        else if (lowerCol.includes('amount')) autoMapping[col] = 'total_amount';
        else if (lowerCol.includes('id') || lowerCol.includes('passport')) autoMapping[col] = 'id_number';
      });
      
      console.log('🔗 Auto mapping:', autoMapping);
      
      setColumnMapping(autoMapping);
      generatePreview(jsonData, autoMapping);
      setStep('mapping');
      
    } catch (err) {
      console.error('❌ Error in onDrop:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  }, []);

  const generatePreview = (data: any[], mapping: Record<string, string>) => {
    const rows: ImportPreviewRow[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;

    data.forEach((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const mappedData: Record<string, any> = {};

      for (const [column, field] of Object.entries(mapping)) {
        if (field && row[column] !== undefined && row[column] !== null && row[column] !== '') {
          let value = row[column];
          
          if (field === 'check_in_date' || field === 'check_out_date') {
            if (!value) {
              if (field === 'check_in_date') errors.push('Check-in date is missing');
            } else {
              value = parseDate(value, dateFormat);
              if (field === 'check_in_date' && !value) {
                errors.push(`Check-in date is invalid: ${row[column]}`);
              }
            }
          }
          
          if (field === 'adults' || field === 'children') {
            value = parseInt(value) || 0;
          }
          
          if (field === 'total_amount') {
            value = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
          }
          
          mappedData[field] = value;
        }
      }

      // Handle Full Name column if present
      if (mappedData.guest_full_name && !mappedData.guest_first_name) {
        const { firstName, lastName } = splitFullName(mappedData.guest_full_name);
        mappedData.guest_first_name = firstName;
        mappedData.guest_last_name = lastName;
      }

      // Validate required fields
      if (!mappedData.guest_first_name) {
        errors.push('First name is required');
      }

      if (!mappedData.check_in_date) {
        errors.push('Check-in date is required');
      }

      // Auto-calculate nights
      if (mappedData.check_in_date && mappedData.check_out_date && !mappedData.nights) {
        const nights = calculateNights(mappedData.check_in_date, mappedData.check_out_date);
        if (nights > 0) mappedData.nights = nights;
      } else if (mappedData.check_in_date && !mappedData.nights) {
        mappedData.nights = 1;
      }

      // Warnings for missing contact info
      if (!mappedData.guest_email && !mappedData.guest_phone) {
        warnings.push('No email or phone provided');
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;
      
      warningCount += warnings.length;

      rows.push({
        rowNumber: index + 1,
        data: mappedData,
        isValid,
        errors,
        warnings
      });
    });

    setPreview({
      rows,
      validCount,
      invalidCount,
      warningCount,
      columnMapping: mapping,
      detectedColumns
    });
  };

  const updateMapping = (column: string, field: string) => {
    const newMapping = { ...columnMapping, [column]: field };
    if (field === '') {
      delete newMapping[column];
    }
    setColumnMapping(newMapping);
    generatePreview(rawData, newMapping);
  };

  const handleImport = async () => {
    if (!preview) return;
    
    setStep('importing');
    setImportProgress(0);
    
    try {
      const validRows = preview.rows.filter(r => r.isValid);
      const total = validRows.length;
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setImportProgress(Math.round(((i + 1) / total) * 100));
        
        try {
          const fullName = `${row.data.guest_first_name || ''} ${row.data.guest_last_name || ''}`.trim();
          
          const response = await fetch('/.netlify/functions/create-booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              business_id: businessId,
              guest_name: fullName,
              guest_first_name: row.data.guest_first_name || '',
              guest_last_name: row.data.guest_last_name || '',
              guest_email: row.data.guest_email || '',
              guest_phone: row.data.guest_phone || '',
              guest_country: row.data.guest_country || 'South Africa',
              guest_province: row.data.guest_province || '',
              guest_city: row.data.guest_city || '',
              guest_id_number: row.data.id_number || '',
              check_in_date: row.data.check_in_date,
              check_out_date: row.data.check_out_date || '',
              nights: row.data.nights || 1,
              adults: row.data.adults || 1,
              children: row.data.children || 0,
              total_amount: row.data.total_amount || 0,
              referral_source: row.data.referral_source || '',
              booking_source: row.data.referral_source || '',
              status: 'completed',
              created_at: new Date().toISOString()
            })
          });
          
          if (response.ok) {
            success++;
          } else {
            failed++;
            const errorData = await response.json();
            errors.push(`Row ${row.rowNumber}: ${errorData.error || 'Unknown error'}`);
          }
        } catch (err) {
          failed++;
          errors.push(`Row ${row.rowNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      setImportResult({ success, failed, errors });
      setStep('complete');
      
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('mapping');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024
  });

  // Upload Step
  if (step === 'upload') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Import Guest Data</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Date Format Selector */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format in your file
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as 'DMY' | 'MDY')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="DMY">DD/MM/YYYY (Day/Month/Year) - Recommended</option>
                <option value="MDY">MM/DD/YYYY (Month/Day/Year)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Select the format your dates are in. Most Google Forms exports use DD/MM/YYYY.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-medium text-blue-800">Need a template?</h3>
                  <p className="text-sm text-blue-700 mb-3">Download our Excel template with the correct column format</p>
                  <button onClick={downloadTemplate} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Download Template
                  </button>
                </div>
              </div>
            </div>

            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400'}`}>
              <input {...getInputProps()} />
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600">{isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}</p>
              <p className="text-sm text-gray-400 mt-2">Supports .CSV, .XLSX, .XLS files (max 50MB)</p>
            </div>

            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">📋 Instructions</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Your file can have any column names - you'll map them in the next step</li>
                <li><strong>Required:</strong> Full Name and Check-in Date</li>
                <li><strong>Dates must be in the format you selected above</strong></li>
                <li>Recommended: Email or Phone for guest communication</li>
              </ul>
            </div>

            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Mapping Step
  if (step === 'mapping' && preview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Map Your Columns</h2>
              <button onClick={() => setStep('upload')} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <p className="text-gray-600 mb-6">
              Tell FastCheckin which column corresponds to each data field.
              <span className="text-red-500 ml-2">*</span> Required fields
            </p>

            <div className="space-y-3 mb-6">
              {detectedColumns.map(column => (
                <div key={column} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="w-64">
                    <p className="text-sm font-medium text-gray-700 truncate" title={column}>{column}</p>
                    <p className="text-xs text-gray-400 truncate">{String(rawData[0]?.[column] || '').substring(0, 30)}</p>
                  </div>
                  <span className="text-gray-400">→</span>
                  <select value={columnMapping[column] || ''} onChange={(e) => updateMapping(column, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500">
                    <option value="">-- Ignore this column --</option>
                    {FASTCHECKIN_FIELDS.map(field => (
                      <option key={field.key} value={field.key}>{field.label} {field.required ? '*' : ''}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                Valid records: <span className="font-semibold text-green-600">{preview.validCount}</span> | 
                Invalid: <span className="font-semibold text-red-600">{preview.invalidCount}</span> |
                Warnings: <span className="font-semibold text-yellow-600">{preview.warningCount}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('upload')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Back</button>
                <button onClick={() => setStep('preview')} disabled={preview.validCount === 0} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">Continue to Preview</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preview Step
  if (step === 'preview' && preview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Preview Import Data</h2>
              <button onClick={() => setStep('mapping')} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{preview.rows.length}</p>
                <p className="text-xs text-gray-500">Total Records</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{preview.validCount}</p>
                <p className="text-xs text-green-600">Valid</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{preview.invalidCount}</p>
                <p className="text-xs text-red-600">Invalid (will be skipped)</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{preview.warningCount}</p>
                <p className="text-xs text-yellow-600">Warnings</p>
              </div>
            </div>

            <div className="mb-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Guest Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Check-in</th>
                    <th className="px-3 py-2 text-left">Country</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.rows.slice(0, 10).map((row) => (
                    <tr key={row.rowNumber} className={!row.isValid ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-medium">{`${row.data.guest_first_name || ''} ${row.data.guest_last_name || ''}`.trim() || '-'}</td>
                      <td className="px-3 py-2">{row.data.guest_email || '-'}</td>
                      <td className="px-3 py-2">{row.data.check_in_date || '-'}</td>
                      <td className="px-3 py-2">{row.data.guest_country || '-'}</td>
                      <td className="px-3 py-2">
                        {!row.isValid ? (
                          <span className="text-red-600 text-xs" title={row.errors.join(', ')}>✗ Invalid</span>
                        ) : row.warnings.length > 0 ? (
                          <span className="text-yellow-600 text-xs" title={row.warnings.join(', ')}>⚠ Warning</span>
                        ) : (
                          <span className="text-green-600 text-xs">✓ Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 10 && <p className="text-center text-sm text-gray-500 mt-3">+ {preview.rows.length - 10} more records</p>}
            </div>

            {preview.rows.filter(r => !r.isValid).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-red-800 mb-2">Invalid Records ({preview.invalidCount})</h4>
                <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                  {preview.rows.filter(r => !r.isValid).slice(0, 10).map(row => (
                    <li key={row.rowNumber}>• Row {row.rowNumber}: {row.errors.join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep('mapping')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Back to Mapping</button>
              <button onClick={handleImport} disabled={preview.validCount === 0} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">Import {preview.validCount} Records</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Importing Step
  if (step === 'importing') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Importing Data...</h3>
          <p className="text-gray-500">Please wait while we process your file.</p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
          </div>
          <p className="text-sm text-gray-400 mt-2">{importProgress}% complete</p>
        </div>
      </div>
    );
  }

  // Complete Step
  if (step === 'complete' && importResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h3>
          <p className="text-gray-600">
            Successfully imported: <span className="font-bold text-green-600">{importResult.success}</span><br />
            Failed: <span className="font-bold text-red-600">{importResult.failed}</span>
          </p>
          {importResult.errors.length > 0 && (
            <details className="mt-4 text-left">
              <summary className="text-sm text-red-600 cursor-pointer">View errors ({importResult.errors.length})</summary>
              <div className="mt-2 max-h-32 overflow-y-auto bg-red-50 p-2 rounded text-xs text-red-700">
                {importResult.errors.map((err, i) => <div key={i}>{err}</div>)}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  return null;
}
