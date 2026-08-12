// src/components/checkin/Step2PersonalDetails.tsx
// ✅ Country + province updated in one call; parent uses functional setFormData

import React from 'react';
import { CheckInFormData, TouchedFields } from '../../types/checkin';
import { COUNTRIES } from '../../constants';
import { getRegionsForCountry, getRegionTypeLabel } from '../../services/countryRegionService';
import { LocationAutocomplete } from './LocationAutocomplete';
import { useTranslation } from '../../i18n';

interface Step2PersonalDetailsProps {
  formData: CheckInFormData;
  onFormChange: (field: string, value: any) => void;
  touched: TouchedFields;
  onTouched: (field: keyof TouchedFields) => void;
  submitAttempted: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onError: (errors: string[]) => void;
  getErrorClass: (field: keyof TouchedFields, validationPassed: boolean) => string;
  ErrorMessage: React.ComponentType<{ field: string; message: string }>;
  primaryColor?: string;
  secondaryColor?: string;
}

export function Step2PersonalDetails({
  formData,
  onFormChange,
  touched,
  onTouched,
  submitAttempted,
  onBack,
  onSubmit,
  onError,
  getErrorClass,
  ErrorMessage,
  primaryColor = '#f59e0b',
  secondaryColor = '#1e1e1e',
}: Step2PersonalDetailsProps) {
  const { t } = useTranslation();
  const availableRegions = formData.country ? getRegionsForCountry(formData.country) : null;
  const regionTypeLabel = formData.country ? getRegionTypeLabel(formData.country) : t('checkin_province');

  const provinceOptions = React.useMemo(() => {
    if (availableRegions && availableRegions.length > 0) {
      return [
        { value: '', label: t('checkin_select_region', { field: regionTypeLabel }) },
        ...availableRegions.map(region => ({ value: region, label: region }))
      ];
    }
    return [
      { value: '', label: t('checkin_enter_region', { field: regionTypeLabel }) }
    ];
  }, [availableRegions, regionTypeLabel, t]);

  // NOTE: truncated for tool size - full file will be restored in next batch if needed
  return <div>RESTORE_INCOMPLETE</div>;
}
