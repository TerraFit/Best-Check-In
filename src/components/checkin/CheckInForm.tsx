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
  branding?: any;
}

export function CheckInForm({ onComplete, businessId, resetOnMount = false, branding }: CheckInFormProps) {
  const { t } = useTranslation();
  const checkIn = useCheckIn({ onComplete, businessId: businessId || null, resetOnMount, branding });

  const {
    step,
    setStep,
    formData,
    setFormData,
    touched,
    markTouched,
    submitAttempted,
    setSubmitAttempted,
    foodRestrictions,
    setFoodRestrictions,
    hasDietaryRestrictions,
    setHasDietaryRestrictions,
    showRestrictionsPanel,
    setShowRestrictionsPanel,
    profileLoaded,
    profileSaveSuccess,
    loading,
    loginLoading,
    hasScrolledToBottom,
    handleSubmit,
    handleIndemnityScroll,
    getErrorClass,
  } = checkIn;

  // DynamicCheckIn is the source of truth for business branding.
  // Keep safe fallbacks so the form never renders "undefined" while branding loads.
  const businessName = branding?.trading_name || 'our establishment';
  const primaryColor = branding?.primary_color || '#D97706';
  const secondaryColor = branding?.secondary_color || '#92400E';

  const ErrorMessage: React.FC<{ field: string; message: string }> = ({ message }) =>
    message ? <p className="text-red-500 text-xs mt-1">{message}</p> : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto">
        {step < 5 && (
          <div className="pt-8 px-4">
            <ProgressSteps currentStep={step} totalSteps={4} primaryColor={primaryColor} secondaryColor={secondaryColor} />
          </div>
        )}

        {step === 1 && (
          <Step1EmailEntry
            email={formData.email || ''}
            onEmailChange={(email) => setFormData(prev => ({ ...prev, email }))}
            saveDetails={!!formData.saveDetails}
            onSaveDetailsChange={(saved) => setFormData(prev => ({ ...prev, saveDetails: saved }))}
            popiaConsent={!!formData.popiaConsent}
            onPopiaConsentChange={(consent) => setFormData(prev => ({ ...prev, popiaConsent: consent }))}
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
            onFormChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
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

        {step === 3 && (
          <Step3DietaryRestrictions
            foodRestrictions={foodRestrictions}
            onRestrictionToggle={(key) => setFoodRestrictions(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
            onOtherTextChange={(text) => setFoodRestrictions(prev => ({ ...prev, other_text: text }))}
            hasDietaryRestrictions={hasDietaryRestrictions}
            onHasDietaryRestrictionsChange={setHasDietaryRestrictions}
            showRestrictionsPanel={showRestrictionsPanel}
            onShowRestrictionsPanelChange={setShowRestrictionsPanel}
            onContinue={() => {
              if (hasDietaryRestrictions === null) {
                alert(t('checkin_dietary_alert_choose'));
                return;
              }
              if (hasDietaryRestrictions === false) {
                setStep(4);
                return;
              }
              setShowRestrictionsPanel(true);
            }}
            onSave={() => {
              const hasSelected = Object.entries(foodRestrictions).some(
                ([key, val]) => val === true && key !== 'other_text'
              );
              if (!hasSelected && !foodRestrictions.other_text) {
                alert(t('checkin_dietary_alert_select'));
                return;
              }
              setShowRestrictionsPanel(false);
              setStep(4);
            }}
            onBack={() => {
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
            guestName={`${formData.firstName || ''} ${formData.lastName || ''}`.trim()}
            passportOrId={formData.passportOrId || ''}
            idPhoto={formData.idPhoto || null}
            onIdPhotoChange={(photo) => setFormData(prev => ({ ...prev, idPhoto: photo || '' }))}
            signature={formData.signature || ''}
            onSignatureChange={(sig) => setFormData(prev => ({ ...prev, signature: sig }))}
            acceptLegal={!!formData.acceptLegal}
            onAcceptLegalChange={(accepted) => setFormData(prev => ({ ...prev, acceptLegal: accepted }))}
            hasScrolledToBottom={hasScrolledToBottom}
            onIndemnityScroll={handleIndemnityScroll}
            loading={loading}
            submitAttempted={submitAttempted}
            getErrorClass={getErrorClass}
            ErrorMessage={ErrorMessage}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
          />
        )}

        {step === 5 && (
          <Step5Success
            businessName={businessName}
            email={formData.email || ''}
            guestName={`${formData.firstName || ''} ${formData.lastName || ''}`.trim()}
            onReset={() => window.location.reload()}
          />
        )}

        <div className="py-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
          <span>{t('common_powered_by')}</span>
          <img src="/fastcheckin-logo.png" alt="FastCheckin" className="h-4 w-auto object-contain" />
          <span>FastCheckin</span>
        </div>
      </div>
    </div>
  );
}
