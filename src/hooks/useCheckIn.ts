// src/hooks/useCheckIn.ts
// ✅ FIXED: Prevent form submission from reloading page with diagnostic logs

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { checkinService } from '../services/checkinService';
import { 
  CheckInFormData, 
  FoodRestrictions, 
  TouchedFields, 
  DEFAULT_RESTRICTIONS,
  BusinessBranding 
} from '../types/checkin';
import { Booking } from '../types';
import { cleanLocation, formatFullName, parseFullName } from '../utils/checkinHelpers';
import { buildIndemnityPlainText } from '../components/IndemnityText';

interface UseCheckInProps {
  businessId: string | null;
  onComplete: (booking: Booking, token?: string) => void;
}
