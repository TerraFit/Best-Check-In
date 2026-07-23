// src/components/checkin/CheckInForm.tsx
// ✅ With useEffect to detect re-mounts

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
  
  // ✅ DEBUG: Log when component mounts/unmounts
  useEffect(() => {
    console.log('🔍 CheckInForm: Component MOUNTED with resetOnMount:', resetOnMount);
    return () => {
      console.log('🔍 CheckInForm: Component UNMOUNTED');
    };
  }, [resetOnMount]);

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
  } = useCheckIn({ businessId: propBusinessId || null, onComplete, resetOnMount });

  // Refs for signature pad
  useEffect(() => {
    if (step === 4 && canvasRef.current) {
      setTimeout(() => {
        if (canvasRef.current) initSignaturePad(canvasRef.current);
      }, 500);
    }
  }, [step, canvasRef, initSignaturePad]);

  // ✅ DEBUG: Log step changes
  useEffect(() => {
    console.log('🔍 CheckInForm: Step changed to:', step);
  }, [step]);

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
        onReset={() => {
          resetForm();
          setHasDietaryRestrictions(null);
          setShowRestrictionsPanel(false);
        }}
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
            {/* ... business header ... */}
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
              primaryColor={primaryColor}
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
                console.log('🔍 Step3: onSave called');
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
