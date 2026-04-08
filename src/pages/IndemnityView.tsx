import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface IndemnityData {
  guest_name: string;
  guest_first_name: string;
  guest_last_name: string;
  passport_or_id: string;
  signature_data: string;
  signed_at: string;
  business_name: string;
  business_logo?: string;
}

export default function IndemnityView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [indemnity, setIndemnity] = useState<IndemnityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid indemnity link');
      setLoading(false);
      return;
    }

    const fetchIndemnity = async () => {
      try {
        const response = await fetch(`/.netlify/functions/get-indemnity-record?token=${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setIndemnity(data);
        } else {
          setError(data.error || 'Indemnity record not found');
        }
      } catch (err) {
        console.error('Error fetching indemnity:', err);
        setError('Failed to load indemnity form');
      } finally {
        setLoading(false);
      }
    };

    fetchIndemnity();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-white">Loading indemnity form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {indemnity?.business_logo ? (
            <img 
              src={indemnity.business_logo} 
              alt={indemnity.business_name} 
              className="h-16 w-auto mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-white">Signed Indemnity Form</h1>
          <p className="text-stone-400 mt-2">{indemnity?.business_name}</p>
        </div>

        {/* Indemnity Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="text-center space-y-3 mb-8">
              <p className="font-bold text-2xl text-stone-900 font-serif">{indemnity?.business_name}</p>
              <p className="font-bold text-xs tracking-widest uppercase border-y border-stone-200 py-3">
                GUEST ACKNOWLEDGEMENT OF INHERENT RISK, WAIVER OF CLAIMS, AND INDEMNITY AGREEMENT
              </p>
            </div>
            
            <div className="bg-amber-50 p-6 border-l-4 border-amber-600 text-stone-900 font-bold leading-relaxed rounded-r-2xl mb-8">
              ⚠️ WARNING: THIS IS A LEGALLY BINDING AND IMPORTANT DOCUMENT THAT LIMITS AND EXCLUDES LEGAL RIGHTS. BY SIGNING IT, YOU ASSUME RISKS AND WAIVE CERTAIN RIGHTS, INCLUDING THE RIGHT TO SUE OR CLAIM COMPENSATION UNDER CERTAIN CIRCUMSTANCES.
            </div>

            {/* Full indemnity text - same as in CheckInForm */}
            <div className="prose prose-sm max-w-none text-stone-700">
              <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART A: WARNING AND NOTICE</h4>
              <p className="mb-4">
                DO NOT SIGN THIS DOCUMENT UNLESS YOU HAVE READ IT, UNDERSTOOD IT, AND VOLUNTARILY ACCEPT ITS TERMS. 
                IF YOU ARE UNCERTAIN ABOUT ITS MEANING OR EFFECT, YOU SHOULD SEEK INDEPENDENT LEGAL ADVICE BEFORE SIGNING.
              </p>
              {/* ... rest of the indemnity text ... */}
            </div>

            {/* Signature Section */}
            <div className="mt-12 pt-8 border-t border-stone-200">
              <h3 className="text-lg font-bold text-stone-900 mb-6">Electronic Signature</h3>
              
              <div className="bg-stone-50 rounded-xl p-6 mb-6">
                <p className="text-sm text-stone-500 mb-2">Signed by:</p>
                <p className="text-xl font-semibold text-stone-900">{indemnity?.guest_name}</p>
                <p className="text-sm text-stone-500 mt-2">ID/Passport Number: {indemnity?.passport_or_id}</p>
                <p className="text-sm text-stone-500">Date Signed: {new Date(indemnity!.signed_at).toLocaleString()}</p>
              </div>

              {/* Signature Image */}
              {indemnity?.signature_data && (
                <div className="bg-stone-50 rounded-xl p-6">
                  <p className="text-sm text-stone-500 mb-3">Digital Signature:</p>
                  <img 
                    src={indemnity.signature_data} 
                    alt="Guest Signature" 
                    className="border border-stone-300 rounded-lg p-4 bg-white"
                    style={{ maxHeight: '150px' }}
                  />
                </div>
              )}

              <div className="mt-8 text-center text-sm text-stone-400">
                <p>This is an electronically signed document. It is legally binding and enforceable.</p>
                <p className="mt-2">Signed via FastCheckin • {new Date(indemnity!.signed_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-stone-50 px-8 py-4 text-center text-xs text-stone-400 border-t border-stone-200">
            <p>© {new Date().getFullYear()} FastCheckin. All rights reserved.</p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-stone-700 text-white rounded-lg hover:bg-stone-600 transition-colors"
          >
            🖨️ Print / Save as PDF
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
