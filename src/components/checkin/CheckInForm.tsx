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
}

// Error Message component for form validation
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

export function CheckInForm({ onComplete, businessId: propBusinessId }: CheckInFormProps) {
  const { t } = useTranslation();
  
  // Use the custom hook
  const {
    step,
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
  } = useCheckIn({ businessId: propBusinessId || null, onComplete });

  // Refs for signature pad
  useEffect(() => {
    if (step === 4 && canvasRef.current) {
      setTimeout(() => {
        if (canvasRef.current) initSignaturePad(canvasRef.current);
      }, 500);
    }
  }, [step, canvasRef, initSignaturePad]);

  // Loading state
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

  // Step 5: Success
  if (step === 5) {
    return (
      <Step5Success
        businessName={businessName}
        email={formData.email}
        onReset={resetForm}
        guestName={updateFullName()}
      />
    );
  }

  // Main form with steps
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Toast notifications */}
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
        {/* Business Header */}
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

        {/* Progress Steps */}
        <ProgressSteps 
          currentStep={step} 
          totalSteps={4} 
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-stone-100 flex flex-col min-h-[700px]">
          
          {/* Step 1: Email Entry */}
          {step === 1 && (
            <Step1EmailEntry
              email={formData.email}
              onEmailChange={(email) => setFormData({ ...formData, email })}
              saveDetails={formData.saveDetails}
              onSaveDetailsChange={(saved) => setFormData({ ...formData, saveDetails: saved })}
              popiaConsent={formData.popiaConsent}
              onPopiaConsentChange={(consent) => setFormData({ ...formData, popiaConsent: consent })}
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

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <Step2PersonalDetails
              formData={formData}
              onFormChange={(field, value) => setFormData({ ...formData, [field]: value })}
              touched={touched}
              onTouched={markTouched}
              submitAttempted={submitAttempted}
              onBack={() => setStep(1)}
              onSubmit={handleSubmit}
              onError={(errors) => alert(`${t('error_required_fields')}: ${errors.join(', ')}`)}
              getErrorClass={getErrorClass}
              ErrorMessage={ErrorMessage}
              secondaryColor={secondaryColor}
            />
          )}

          {/* Step 3: Dietary Restrictions */}
          {step === 3 && (
            <Step3DietaryRestrictions
              foodRestrictions={foodRestrictions}
              onRestrictionToggle={(key) => setFoodRestrictions({ ...foodRestrictions, [key]: !foodRestrictions[key] })}
              onOtherTextChange={(text) => setFoodRestrictions({ ...foodRestrictions, other_text: text })}
              hasDietaryRestrictions={hasDietaryRestrictions}
              onHasDietaryRestrictionsChange={setHasDietaryRestrictions}
              showRestrictionsPanel={showRestrictionsPanel}
              onShowRestrictionsPanelChange={setShowRestrictionsPanel}
              onContinue={handleDietaryContinue}
              onSave={handleRestrictionsSave}
              onBack={() => setStep(2)}
            />
          )}

          {/* Step 4: Indemnity & Signature */}
          {step === 4 && (
            <Step4IndemnitySignature
              businessName={businessName}
              guestName={updateFullName()}
              passportOrId={formData.passportOrId}
              idPhoto={formData.idPhoto}
              onIdPhotoChange={(photo) => setFormData({ ...formData, idPhoto: photo || '' })}
              signature={formData.signature}
              onSignatureChange={(sig) => setFormData({ ...formData, signature: sig })}
              acceptLegal={formData.acceptLegal}
              onAcceptLegalChange={(accepted) => setFormData({ ...formData, acceptLegal: accepted })}
              hasScrolledToBottom={hasScrolledToBottom}
              onIndemnityScroll={handleIndemnityScroll}
              loading={loading}
              submitAttempted={submitAttempted}
              getErrorClass={getErrorClass}
              ErrorMessage={ErrorMessage}
              onBack={() => {
                if (hasDietaryRestrictions === true && showRestrictionsPanel) {
                  setShowRestrictionsPanel(false);
                  setStep(3);
                } else {
                  setStep(3);
                }
              }}
              onSubmit={handleSubmit}
            />
          )}
        </form>
      </div>

      {/* Footer */}
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
