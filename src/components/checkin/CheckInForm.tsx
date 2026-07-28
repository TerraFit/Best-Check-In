// src/components/checkin/CheckInForm.tsx
// ✅ FIXED: Pass businessId to Step2PersonalDetails

import React, { useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { Booking } from '../../types';
import { useCheckIn } from '../../hooks/useCheckIn';
import { ProgressSteps } from './ProgressSteps';
import { Step1EmailEntry } from './Step1_EmailEntry';
import { Step2PersonalDetails } from './Step2_PersonalDetails';
import { Step3DietaryRestrictions } from './Step3_DietaryRestrictions';
import { Step4IndemnitySignature } from './Step4_IndemnitySignature';
import { Step5Success } from './Step5_Success';

interface CheckInFormProps {
  onComplete: (booking: Booking, indemnityToken?: string) => void;
  businessId?: string;
  resetOnMount?: boolean;
}

const ErrorMessage = ({ field, message }: { field: string; message: string }) => {
  if (!message) return null;
  return (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </p>
  );
};

export function CheckInForm({ onComplete, businessId: propBusinessId, resetOnMount = false }: CheckInFormProps) {
  const { t } = useTranslation();
  
  useEffect(() => {
    console.log('🔍 CheckInForm: Component MOUNTED with resetOnMount:', resetOnMount);
    console.log('🔍 CheckInForm: propBusinessId:', propBusinessId);
    return () => {
      console.log('🔍 CheckInForm: Component UNMOUNTED');
    };
  }, [resetOnMount, propBusinessId]);

  const {
    step,
    setStep,
    branding,
    loading,
    loadingBranding,
    loginLoading,
    submitAttempted,
    hasScrolledToBottom,
    profileLoaded,
    profileSaveSuccess,
    duplicateWarning,
    notification,
    formData,
    setFormData,
    touched,
    markTouched,
    foodRestrictions,
    setFoodRestrictions,
    hasDietaryRestrictions,
    setHasDietaryRestrictions,
    showRestrictionsPanel,
    setShowRestrictionsPanel,
    videoRef,
    canvasRef,
    indemnityRef,
    isCameraActive,
    cameraError,
    startCamera,
    capturePhoto,
    stopCamera,
    retakePhoto,
    clearSignature,
    initSignaturePad,
    handleIndemnityScroll,
    handleDietaryContinue,
    handleRestrictionsSave,
    handleSubmit,
    resetForm,
    updateFullName,
    getErrorClass,
    handleFormChange,
  } = useCheckIn({ businessId: propBusinessId || null, onComplete, resetOnMount });

  useEffect(() => {
    if (step === 4 && canvasRef.current) {
      setTimeout(() => {
        if (canvasRef.current) initSignaturePad(canvasRef.current);
      }, 500);
    }
  }, [step, canvasRef, initSignaturePad]);

  useEffect(() => {
    console.log('🔍 CheckInForm: Step changed to:', step);
  }, [step]);

  if (loadingBranding) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-stone-400">Loading check-in system...</p>
        </div>
      </div>
    );
  }

  const businessName = branding?.trading_name || 'our establishment';
  const primaryColor = branding?.primary_color || '#f59e0b';
  const secondaryColor = branding?.secondary_color || '#1e1e1e';

  if (step === 5) {
    return (
      <Step5Success
        businessName={businessName}
        email={formData.email}
        onReset={() => {
          resetForm();
          setHasDietaryRestrictions(null);
          setShowRestrictionsPanel(false);
        }}
        guestName={updateFullName()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {duplicateWarning && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{duplicateWarning}</span>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed bottom-4 left-4 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
          }`}>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto py-10 px-4">
        {branding && (
          <div className="text-center mb-8">
            {branding.logo_url ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={branding.logo_url} 
                  alt={businessName}
                  className="logo-high-res"
                  style={{
                    maxHeight: '120px',
                    maxWidth: '280px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    imageRendering: 'auto'
                  }}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('h1');
                      fallback.className = 'text-3xl font-bold mb-2 logo-fallback';
                      fallback.style.color = secondaryColor;
                      fallback.textContent = businessName;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold mb-2" style={{ color: secondaryColor }}>
                {businessName}
              </h1>
            )}
            {branding.logo_url && (
              <h1 className="text-3xl font-bold mb-2 logo-fallback-hidden" style={{ color: secondaryColor, display: 'none' }}>
                {businessName}
              </h1>
            )}
            {branding.slogan && (
              <p className="text-stone-500 italic text-lg">{branding.slogan}</p>
            )}
            {branding.physical_address && (
              <p className="text-stone-400 text-sm mt-1 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {`${branding.physical_address.city}, ${branding.physical_address.province}`}
              </p>
            )}
            <p className="text-stone-500 italic mt-2">{branding.welcome_message}</p>
          </div>
        )}

        <ProgressSteps 
          currentStep={step} 
          totalSteps={4} 
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            console.log('🟢 CheckInForm: Parent form submit handler called, step:', step);
            handleSubmit();
          }}
          className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-stone-100 flex flex-col min-h-[700px]"
        >
          
          {step === 1 && (
            <Step1EmailEntry
              email={formData.email}
              onEmailChange={(email) => handleFormChange('email', email)}
              saveDetails={formData.saveDetails}
              onSaveDetailsChange={(saved) => handleFormChange('saveDetails', saved)}
              popiaConsent={formData.popiaConsent}
              onPopiaConsentChange={(consent) => handleFormChange('popiaConsent', consent)}
              onSubmit={handleSubmit}
              loading={loginLoading}
              businessName={businessName}
              businessSlogan={branding?.slogan}
              businessLogo={branding?.logo_url}
              heroImage={branding?.hero_image_url}
              profileLoaded={profileLoaded}
              profileSaveSuccess={profileSaveSuccess}
              primaryColor={primaryColor}
            />
          )}

          {step === 2 && (
            <Step2PersonalDetails
              formData={formData}
              onFormChange={handleFormChange}
              touched={touched}
              onTouched={markTouched}
              submitAttempted={submitAttempted}
              onBack={() => setStep(1)}
              onSubmit={handleSubmit}
              onError={(errors) => alert(`${t('error_required_fields')}: ${errors.join(', ')}`)}
              getErrorClass={getErrorClass}
              ErrorMessage={ErrorMessage}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              businessId={propBusinessId} // ✅ PASS businessId HERE!
            />
          )}

          {step === 3 && (
            <Step3DietaryRestrictions
              foodRestrictions={foodRestrictions}
              onRestrictionToggle={(key) => setFoodRestrictions({ ...foodRestrictions, [key]: !foodRestrictions[key] })}
              onOtherTextChange={(text) => setFoodRestrictions({ ...foodRestrictions, other_text: text })}
              hasDietaryRestrictions={hasDietaryRestrictions}
              onHasDietaryRestrictionsChange={setHasDietaryRestrictions}
              showRestrictionsPanel={showRestrictionsPanel}
              onShowRestrictionsPanelChange={setShowRestrictionsPanel}
              onContinue={() => {
                console.log('🔍 Step3: onContinue called');
                if (hasDietaryRestrictions === null) {
                  alert('Please select whether you have any dietary restrictions.');
                  return;
                }
                if (hasDietaryRestrictions === false) {
                  console.log('🔍 Step3: No restrictions, moving to Step 4');
                  setStep(4);
                  return;
                }
                console.log('🔍 Step3: Has restrictions, showing panel');
                setShowRestrictionsPanel(true);
              }}
              onSave={() => {
                console.log('🔍 Step3: onSave called from parent');
                const hasSelected = Object.entries(foodRestrictions).some(
                  ([key, val]) => val === true && key !== 'other_text'
                );
                if (!hasSelected && !foodRestrictions.other_text) {
                  alert('Please select at least one dietary restriction or add a note.');
                  return;
                }
                console.log('🔍 Step3: Save successful, moving to Step 4');
                setShowRestrictionsPanel(false);
                setStep(4);
              }}
              onBack={() => {
                console.log('🔍 Step3: onBack called');
                if (showRestrictionsPanel) {
                  setShowRestrictionsPanel(false);
                } else {
                  setStep(2);
                }
              }}
              primaryColor={primaryColor}
            />
          )}

          {step === 4 && (
            <Step4IndemnitySignature
              businessName={businessName}
              guestName={updateFullName()}
              passportOrId={formData.passportOrId}
              idPhoto={formData.idPhoto}
              onIdPhotoChange={(photo) => handleFormChange('idPhoto', photo || '')}
              signature={formData.signature}
              onSignatureChange={(sig) => handleFormChange('signature', sig)}
              acceptLegal={formData.acceptLegal}
              onAcceptLegalChange={(accepted) => handleFormChange('acceptLegal', accepted)}
              hasScrolledToBottom={hasScrolledToBottom}
              onIndemnityScroll={handleIndemnityScroll}
              loading={loading}
              submitAttempted={submitAttempted}
              getErrorClass={getErrorClass}
              ErrorMessage={ErrorMessage}
              primaryColor={primaryColor}
              onBack={() => {
                console.log('🔍 Step4: onBack called');
                setStep(3);
              }}
              onSubmit={handleSubmit}
            />
          )}
        </form>
      </div>

      {step !== 5 && (
        <div className="text-center py-6 border-t border-stone-200 mt-8">
          <div className="flex items-center justify-center gap-2 text-stone-400 text-xs">
            <span>{t('common_powered_by')}</span>
            <img src="/fastcheckin-logo.png" alt="FastCheckin" className="h-4 w-auto object-contain" />
            <span>FastCheckin</span>
          </div>
        </div>
      )}
    </div>
  );
}
