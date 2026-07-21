// src/utils/checkinHelpers.ts

export const cleanLocation = (value: string): string => {
  if (!value) return '';
  
  const corrections: Record<string, string> = {
    'cpt': 'Cape Town',
    'jhb': 'Johannesburg',
    'dbn': 'Durban',
    'pe': 'Gqeberha',
    'port elizabeth': 'Gqeberha',
    'p.e.': 'Gqeberha',
    'george': 'George',
    'hermanus': 'Hermanus',
    'stellenbosch': 'Stellenbosch',
    'franschhoek': 'Franschhoek',
    'paarl': 'Paarl',
    'pretoria': 'Pretoria',
    'centurion': 'Centurion',
    'midrand': 'Midrand',
    'sandton': 'Sandton',
    'umhlanga': 'Umhlanga',
    'ballito': 'Ballito',
    'knysna': 'Knysna',
    'plettenberg': 'Plettenberg Bay',
    'plettenberg bay': 'Plettenberg Bay',
    'mossel bay': 'Mossel Bay',
    'oudtshoorn': 'Oudtshoorn',
    'gqeberha': 'Gqeberha',
    'somerset west': 'Somerset West',
    'gordons bay': "Gordon's Bay",
    'gordon\'s bay': "Gordon's Bay",
    'betty\'s bay': "Betty's Bay",
    'betty bay': "Betty's Bay",
    'strand': 'Strand',
    'somerset': 'Somerset West',
    'parl': 'Paarl',
    'j-bay': 'Jeffreys Bay',
    'jbay': 'Jeffreys Bay',
    'jeffery\'s bay': 'Jeffreys Bay',
    'jefferys bay': 'Jeffreys Bay',
    'plett': 'Plettenberg Bay',
    'p-town': 'Pretoria',
    'ct': 'Cape Town',
    'durbs': 'Durban',
    'stellies': 'Stellenbosch',
    'franshhoek': 'Franschhoek',
  };
  
  let cleaned = value.trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();
  for (const [key, correction] of Object.entries(corrections)) {
    if (lower === key || lower.includes(key)) {
      cleaned = correction;
      break;
    }
  }
  
  cleaned = cleaned.replace(/\b\w/g, (char, index) => {
    if (index > 0 && (cleaned[index - 1] === '.' || cleaned[index - 1] === "'")) return char;
    return char.toUpperCase();
  });
  
  return cleaned;
};

export const cleanName = (name: string): string => {
  if (!name) return '';
  const titlePattern = /^(Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Dr\.?|Prof\.?|Rev\.?)\s+/i;
  return name.replace(titlePattern, '').trim();
};

export const formatFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim();
};

export const parseFullName = (fullName: string): { firstName: string; lastName: string } => {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
};

export const getInitials = (name: string): string => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

export const calculateNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const getBusinessLocation = (address?: {
  city: string;
  province: string;
}): string => {
  if (!address) return '';
  return `${address.city}, ${address.province}`;
};
