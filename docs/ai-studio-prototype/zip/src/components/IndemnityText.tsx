import React from 'react';

interface IndemnityTextProps {
  businessName: string;
  showGuestDetails?: boolean;
  guestName?: string;
  passportOrId?: string;
}

export function IndemnityText({ 
  businessName, 
  showGuestDetails = false,
  guestName = '',
  passportOrId = ''
}: IndemnityTextProps) {
  const displayBusinessName = businessName || 'J-Bay Zebra Lodge';
  
  return (
    <div className="space-y-6 max-w-3xl mx-auto text-stone-700 text-sm leading-relaxed">
      <div className="text-center space-y-2 mb-8">
        <p className="font-bold text-2xl text-stone-900 font-serif">{displayBusinessName}</p>
        <p className="font-bold text-xs tracking-wider uppercase border-y border-stone-200 py-3 text-stone-500">
          GUEST ACKNOWLEDGEMENT OF RISK, WAIVER OF CLAIMS, AND INDEMNITY AGREEMENT
        </p>
      </div>
      
      <div className="bg-amber-50 p-6 border-l-4 border-amber-500 text-stone-900 font-semibold rounded-r-xl text-xs leading-relaxed">
        ⚠️ WARNING: THIS IS A LEGALLY BINDING DOCUMENT. BY SIGNING IT, YOU ASSUME RISKS AND WAIVE CERTAIN RIGHTS, INCLUDING THE RIGHT TO CLAIM COMPENSATION UNDER ORDINARY NEGLIGENCE.
      </div>

      <div>
        <h4 className="font-bold text-stone-900 mb-2 uppercase">PART A: WARNING AND NOTICE</h4>
        <p>
          Do not sign this document unless you have read it, understood it, and voluntarily accept its terms. 
          This agreement applies during your entire stay at {displayBusinessName} and to all activities undertaken on the property.
        </p>
      </div>

      <div>
        <h4 className="font-bold text-stone-900 mb-2 uppercase">PART B: DETAILED ACKNOWLEDGEMENT OF INHERENT RISKS</h4>
        <p className="mb-2">
          I, the undersigned Guest, acknowledge and agree to the following risks associated with my stay:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li><strong>Wildlife Encounters:</strong> The property is home to unpredictable wild animals, reptiles, and insects.</li>
          <li><strong>Terrain Hazards:</strong> Steep trails, loose gravel, rocky pathways, and uneven rustic grounds.</li>
          <li><strong>Outdoor Activities:</strong> Self-guided walks, game drives, cycling trails, and pool swimming.</li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold text-stone-900 mb-2 uppercase">PART C: WAIVER OF CLAIMS AND INDEMNITY</h4>
        <p>
          To the fullest extent permitted by South African law, I waive and discharge {displayBusinessName}, its owners, and employees from any claims for personal injury, illness, or property damage arising out of ordinary negligence during my stay. I indemnify the establishment against any third-party claims brought by minors or companions under my guardianship.
        </p>
      </div>

      <div>
        <h4 className="font-bold text-stone-900 mb-2 uppercase">PART D: DECLARATION AND AGREEMENT</h4>
        <p className="font-medium text-stone-900">
          I certify that I have read this document and understand that I am giving up substantial legal rights.
        </p>
      </div>

      {showGuestDetails && (
        <div className="bg-stone-50 p-6 rounded-2xl space-y-3 mt-6 border border-stone-200">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-stone-400 font-medium uppercase">Primary Guest Name</p>
              <p className="text-sm font-semibold text-stone-900 mt-1">{guestName || '________________'}</p>
            </div>
            <div>
              <p className="text-stone-400 font-medium uppercase">ID / Passport Number</p>
              <p className="text-sm font-mono text-stone-800 mt-1">{passportOrId || '________________'}</p>
            </div>
            <div>
              <p className="text-stone-400 font-medium uppercase">Date Signed</p>
              <p className="text-sm text-stone-700 mt-1">{new Date().toLocaleDateString('en-ZA')}</p>
            </div>
            <div>
              <p className="text-stone-400 font-medium uppercase">Time Signed</p>
              <p className="text-sm text-stone-700 mt-1">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
