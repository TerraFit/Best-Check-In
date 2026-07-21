// src/components/checkin/Step4_IndemnitySignature.tsx
import React, { useRef, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { IndemnityText } from '../IndemnityText';
import { CameraCapture } from './CameraCapture';
import { SignaturePad } from './SignaturePad';
import { PhotoUpload } from './PhotoUpload';

interface Step4IndemnitySignatureProps {
  businessName: string;
  guestName: string;
  passportOrId: string;
  idPhoto: string | null;
  onIdPhotoChange: (photo: string | null) => void;
  signature: string;
  onSignatureChange: (signature: string) => void;
  acceptLegal: boolean;
  onAcceptLegalChange: (accepted: boolean) => void;
  hasScrolledToBottom: boolean;
  onIndemnityScroll: (el: HTMLDivElement) => void;
  loading: boolean;
  submitAttempted: boolean;
  getErrorClass: (field: string, isValid: boolean) => string;
  ErrorMessage: React.FC<{ field: string; message: string }>;
  onBack: () => void;
  onSubmit: () => void;
}

export function Step4IndemnitySignature({
  businessName,
  guestName,
  passportOrId,
  idPhoto,
  onIdPhotoChange,
  signature,
  onSignatureChange,
  acceptLegal,
  onAcceptLegalChange,
  hasScrolledToBottom,
  onIndemnityScroll,
  loading,
  submitAttempted,
  getErrorClass,
  ErrorMessage,
  onBack,
  onSubmit,
}: Step4IndemnitySignatureProps) {
  const { t } = useTranslation();
  const indemnityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (indemnityRef.current) {
      const el = indemnityRef.current;
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollTop + clientHeight >= scrollHeight - 20) {
          onIndemnityScroll(el);
        }
      };
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [onIndemnityScroll]);

  const handlePhotoCapture = (photoDataUrl: string) => {
    onIdPhotoChange(photoDataUrl);
  };

  const handlePhotoRemove = () => {
    onIdPhotoChange(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="p-10 md:p-16 animate-fade-in flex flex-col flex-grow">
      <h2 className="text-3xl font-serif font-bold text-stone-900 mb-8">{t('checkin_indemnity')}</h2>
      
      {submitAttempted && (!idPhoto || !signature || !acceptLegal) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-red-800 text-sm">{t('error_complete_before_submit')}</p>
              <ul className="text-red-700 text-xs mt-1 list-disc list-inside">
                {!idPhoto && <li>{t('error_id_photo_required')}</li>}
                {!signature && <li>{t('error_signature_required')}</li>}
                {!acceptLegal && <li>{t('error_indemnity_scroll')}</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-10 flex-grow">
        <div className="relative border border-stone-200 rounded-[2rem] overflow-hidden shadow-inner bg-white">
          <div 
            ref={indemnityRef}
            className="p-10 text-[12px] leading-relaxed text-stone-700 max-h-[500px] overflow-y-auto custom-scrollbar select-none"
          >
            <IndemnityText 
              businessName={businessName || 'our establishment'} 
              showWarning={true}
              showGuestDetails={true}
              guestName={guestName}
              passportOrId={passportOrId}
            />

            <div className={`mt-12 p-8 rounded-3xl border-2 transition-all ${hasScrolledToBottom ? 'bg-amber-50 border-amber-500' : 'bg-stone-50 border-stone-200 opacity-50'}`}>
              <div className="flex items-start gap-5">
                <input 
                  type="checkbox" 
                  id="legalCheck" 
                  className={`w-8 h-8 rounded border-stone-300 focus:ring-amber-600 cursor-pointer disabled:cursor-not-allowed mt-1 ${getErrorClass('acceptLegal', acceptLegal)}`}
                  disabled={!hasScrolledToBottom}
                  checked={acceptLegal} 
                  onChange={e => onAcceptLegalChange(e.target.checked)} 
                />
                <label htmlFor="legalCheck" className={`text-base font-bold leading-relaxed select-none ${hasScrolledToBottom ? 'text-amber-900 cursor-pointer' : 'text-stone-400'}`}>
                  {t('indemnity_accept')}
                </label>
              </div>
              <ErrorMessage field="acceptLegal" message={t('error_indemnity_required')} />
            </div>

            <div className="text-center text-stone-400 text-xs pt-4">
              {t('indemnity_scroll_bottom')}
            </div>
          </div>
          
          {!hasScrolledToBottom && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-8 py-3 rounded-full text-[10px] font-bold animate-bounce shadow-2xl pointer-events-none uppercase tracking-widest z-10">
              {t('indemnity_scroll_to_accept')}
            </div>
          )}
        </div>

        {/* Camera and Signature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
          {/* LEFT COLUMN - ID PHOTO */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">
              {t('checkin_id_photo')} <span className="text-red-500">*</span>
            </h4>
            
            <div className={`aspect-[3/2] bg-stone-100 rounded-xl overflow-hidden border-2 transition-colors ${submitAttempted && !idPhoto ? 'border-red-500' : 'border-dashed border-stone-300'}`}>
              {idPhoto ? (
                <div className="relative w-full h-full">
                  <img src={idPhoto} alt="Guest ID" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={handlePhotoRemove}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full text-xs hover:bg-red-700 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-100">
                  <CameraCapture onCapture={handlePhotoCapture} />
                </div>
              )}
            </div>
            
            {submitAttempted && !idPhoto && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('error_id_photo_required')}
              </p>
            )}

            {/* Alternative: Upload from gallery */}
            {!idPhoto && (
              <PhotoUpload 
                onUpload={handlePhotoCapture}
                onRemove={handlePhotoRemove}
                currentPhoto={idPhoto}
              />
            )}
          </div>

          {/* RIGHT COLUMN - SIGNATURE */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">
              {t('checkin_signature')} <span className="text-red-500">*</span>
            </h4>
            <SignaturePad 
              onSignatureChange={onSignatureChange}
              height={130}
            />
            {submitAttempted && !signature && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('error_signature_required')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between pt-6 border-t border-stone-100 items-center">
        <button type="button" onClick={onBack} className="text-stone-500 font-medium hover:text-stone-800 uppercase text-[10px] tracking-widest transition-colors">
          {t('common_back_to_details')}
        </button>
        <button 
          type="submit" 
          disabled={loading || !hasScrolledToBottom}
          className="bg-amber-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-amber-700 transition-all shadow-md text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('common_processing') : t('checkin_complete_button')}
        </button>
      </div>
    </form>
  );
}
