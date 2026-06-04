// src/components/IndemnityText.tsx
import React from 'react';

interface IndemnityTextProps {
  businessName: string;
  showWarning?: boolean;
  className?: string;
  showGuestDetails?: boolean;
  guestName?: string;
  passportOrId?: string;
}

export function IndemnityText({ 
  businessName, 
  showWarning = true, 
  className = '',
  showGuestDetails = false,
  guestName = '',
  passportOrId = ''
}: IndemnityTextProps) {
  // Ensure business name is displayed properly
  const displayBusinessName = businessName || '[Business Name]';
  
  return (
    <div className={`space-y-8 max-w-3xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center space-y-3 mb-12">
        <p className="font-bold text-2xl text-stone-900 font-serif">{displayBusinessName}</p>
        <p className="font-bold text-xs tracking-widest uppercase border-y border-stone-200 py-3">
          GUEST ACKNOWLEDGEMENT OF INHERENT RISK, WAIVER OF CLAIMS, AND INDEMNITY AGREEMENT
        </p>
      </div>
      
      {/* Warning Block */}
      {showWarning && (
        <div className="bg-amber-50 p-8 border-l-4 border-amber-600 text-stone-900 font-bold leading-relaxed rounded-r-2xl">
          ⚠️ WARNING: THIS IS A LEGALLY BINDING AND IMPORTANT DOCUMENT THAT LIMITS AND EXCLUDES LEGAL RIGHTS. 
          BY SIGNING IT, YOU ASSUME RISKS AND WAIVE CERTAIN RIGHTS, INCLUDING THE RIGHT TO SUE OR CLAIM 
          COMPENSATION UNDER CERTAIN CIRCUMSTANCES.
        </div>
      )}

      {/* PART A: WARNING AND NOTICE */}
      <div>
        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART A: WARNING AND NOTICE</h4>
        <p className="mb-4">
          DO NOT SIGN THIS DOCUMENT UNLESS YOU HAVE READ IT, UNDERSTOOD IT, AND VOLUNTARILY ACCEPT ITS TERMS. 
          IF YOU ARE UNCERTAIN ABOUT ITS MEANING OR EFFECT, YOU SHOULD SEEK INDEPENDENT LEGAL ADVICE BEFORE SIGNING.
        </p>
        <p className="mb-4">
          THIS AGREEMENT APPLIES DURING YOUR ENTIRE STAY AT {displayBusinessName.toUpperCase()} AND TO ALL ACTIVITIES 
          UNDERTAKEN ON THE PROPERTY.
        </p>
      </div>

      {/* PART B: DETAILED ACKNOWLEDGEMENT OF INHERENT RISKS */}
      <div>
        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART B: DETAILED ACKNOWLEDGEMENT OF INHERENT RISKS</h4>
        <p className="mb-4">
          I, the undersigned Guest, for myself, my heirs, executors, administrators, and assigns, hereby acknowledge and agree as follows:
        </p>
        <p className="mb-4">
          <strong>Nature of the Environment:</strong> I understand and accept that {displayBusinessName} is situated within a natural 
          sanctuary environment that is home to wild, dangerous, and unpredictable animals, reptiles, birds, and insects. 
          Encounters with such wildlife, whether during organized activities or incidental to my stay, carry an inherent 
          and unavoidable risk of serious bodily injury, permanent disability, trauma, death, and/or loss of or damage to 
          personal property.
        </p>
        <p className="mb-4">
          <strong>Nature of Activities:</strong> I understand that participating in activities such as, but not limited to, 
          guided or unguided walks, hiking trails, mountain bike rides, game drives, or simply being present on the lodge grounds, 
          involves inherent risks. These risks include, but are not limited to: terrain hazards; variable weather conditions; 
          encounters with wildlife; the potential for collisions, falls, or equipment failure; and the possibility of becoming 
          lost or stranded. Medical assistance may be significantly delayed in the event of an emergency.
        </p>
        <p className="mb-4">
          <strong>Assumption of Inherent Risk:</strong> I hereby freely and voluntarily assume ALL KNOWN AND UNKNOWN INHERENT RISKS 
          associated with my stay and participation in activities at {displayBusinessName}, whether described herein or not.
        </p>
      </div>

      {/* PART C: WAIVER OF CLAIMS AND INDEMNITY */}
      <div>
        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART C: WAIVER OF CLAIMS AND INDEMNITY</h4>
        <p className="mb-4">
          In consideration for being permitted to enter and stay at {displayBusinessName} and to participate in its activities, I hereby agree:
        </p>
        <p className="mb-4">
          <strong>Waiver of Claims:</strong> To the fullest extent permitted by the law of South Africa, I, on behalf of myself 
          and my successors, hereby WAIVE, RELEASE, AND DISCHARGE {displayBusinessName}, its directors, officers, employees, agents, 
          contractors, guides, landowners, and affiliated companies (collectively, the "Released Parties") from ANY AND ALL 
          CLAIMS, DEMANDS, CAUSES OF ACTION, AND LIABILITY for personal injury, illness, death, or loss of or damage to property 
          which I may suffer, arising out of or connected in any way with my stay or participation in activities, WHERE SUCH 
          CLAIMS ARISE FROM THE ORDINARY NEGLIGENCE OF THE RELEASED PARTIES.
        </p>
        <p className="mb-4 font-bold text-stone-900">
          I EXPRESSLY ACKNOWLEDGE THAT THIS WAIVER DOES NOT APPLY TO CLAIMS ARISING FROM THE GROSS NEGLIGENCE OR WILLFUL 
          MISCONDUCT OF THE RELEASED PARTIES.
        </p>
        <p className="mb-4">
          <strong>Indemnity:</strong> I further agree to DEFEND, INDEMNIFY, AND HOLD HARMLESS the Released Parties from and 
          against any and all claims, demands, lawsuits, judgments, costs, and expenses (including legal fees) brought by or on 
          behalf of: Myself; Any member of my family (including minor children); Any companion, invitee, or dependent accompanying 
          me; or Any third party, arising from my acts, omissions, or breach of this Agreement, or my participation in any activity 
          during my stay.
        </p>
      </div>

      {/* PART D: GUEST WARRANTIES AND GENERAL TERMS */}
      <div>
        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART D: GUEST WARRANTIES AND GENERAL TERMS</h4>
        <p className="mb-4">
          <strong>Authority and Capacity:</strong> I warrant that I am at least 18 years of age, of sound mind, and have the legal 
          authority to enter into this Agreement. If I am signing on behalf of any minor children, I warrant that I am their parent 
          or legal guardian and have the full authority to bind them to these terms.
        </p>
        <p className="mb-4">
          <strong>Rules and Safety:</strong> I agree to abide by all rules, regulations, and safety instructions provided by the 
          Lodge, its staff, or guides, whether given verbally or in writing. I accept that failure to do so may result in the 
          termination of my stay without refund and will vitiate any protection offered by this Agreement.
        </p>
        <p className="mb-4">
          <strong>Health and Fitness:</strong> I warrant that I am in good health, physically fit, and have no known medical, 
          psychological, or physical condition that would prevent my safe participation in the activities I intend to undertake. 
          I am responsible for carrying any necessary personal medication.
        </p>
        <p className="mb-4">
          <strong>Emergency Medical Consent:</strong> In the event of a medical emergency, I authorise the Released Parties to 
          secure, at my sole expense, such medical treatment and transport as they, in their sole discretion, deem necessary.
        </p>
        <p className="mb-4">
          <strong>Limitation of Liability for Property:</strong> The Lodge provides a safe in each room for valuables. The Lodge's 
          liability for loss of or damage to guest property is strictly limited to a maximum amount of ZAR 5,000 (Five Thousand Rand), 
          unless such loss is directly attributable to the proven gross negligence of the Lodge and the property was deposited with 
          the front desk for safekeeping. The Lodge is not liable for loss of money, jewellery, or other high-value items kept in 
          guest rooms.
        </p>
        <p className="mb-4">
          <strong>Severability & Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the 
          laws of the Republic of South Africa.
        </p>
      </div>

      {/* PART E: DECLARATION AND SIGNATURE */}
      <div>
        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART E: DECLARATION AND SIGNATURE</h4>
        <p className="font-bold text-stone-900 text-sm mb-6">
          I HEREBY CERTIFY THAT I HAVE READ THIS ENTIRE DOCUMENT, I UNDERSTAND ITS CONTENTS COMPLETELY, AND I SIGN IT OF MY 
          OWN FREE WILL. I UNDERSTAND THAT I AM GIVING UP SUBSTANTIAL LEGAL RIGHTS.
        </p>
        
        <p className="mb-6 font-bold text-stone-800 bg-stone-50 p-6 border border-stone-200 rounded-2xl leading-relaxed italic">
          "We confirm that the contents of this document was explained to us, the guest, and that they were given sufficient 
          opportunity to read and ask questions before signing."
        </p>

        {/* Guest Details Section - Only shown when showGuestDetails is true */}
        {showGuestDetails && (
          <div className="bg-stone-50 p-8 rounded-3xl space-y-4 mt-8 border border-stone-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Primary Guest</p>
                <p className="text-sm font-semibold text-stone-900 mt-1">{guestName || '________________'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">ID / Passport Number</p>
                <p className="text-sm font-mono text-stone-800 mt-1">{passportOrId || '________________'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Date Signed</p>
                <p className="text-sm text-stone-700 mt-1">{new Date().toLocaleDateString('en-ZA')}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Time Signed</p>
                <p className="text-sm text-stone-700 mt-1">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
