// src/i18n/types.ts
export type SupportedLanguage = 'en' | 'af' | 'de' | 'fr' | 'nl' | 'pt' | 'es' | 'ru';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export interface TranslationKeys {
  // Common
  common_welcome: string;
  common_loading: string;
  common_submit: string;
  common_cancel: string;
  common_save: string;
  common_delete: string;
  common_back: string;
  common_next: string;
  common_continue: string;
  common_complete: string;
  
  // Check-in Form
  checkin_title: string;
  checkin_personal_details: string;
  checkin_first_name: string;
  checkin_last_name: string;
  checkin_email: string;
  checkin_phone: string;
  checkin_passport: string;
  checkin_country: string;
  checkin_province: string;
  checkin_city: string;
  checkin_arrival_date: string;
  checkin_nights: string;
  checkin_referral: string;
  checkin_next_destination: string;
  checkin_settlement: string;
  checkin_indemnity: string;
  checkin_signature: string;
  checkin_id_photo: string;
  checkin_complete_button: string;
  checkin_success_message: string;
  checkin_confirmation_sent: string;
  
  // Errors
  error_required: string;
  error_invalid_email: string;
  error_passwords_mismatch: string;
  error_min_length: string;
  error_photo_required: string;
  error_signature_required: string;
  error_indemnity_required: string;
  
  // Indemnity
  indemnity_warning: string;
  indemnity_title: string;
  indemnity_accept: string;
  indemnity_part_a: string;
  indemnity_part_b: string;
  indemnity_part_c: string;
  indemnity_part_d: string;
  indemnity_part_e: string;
  indemnity_scroll_to_accept: string;
  indemnity_scroll_bottom: string;
  
  // Success
  success_checkin_complete: string;
  success_welcome: string;
  success_email_sent: string;
  success_next_steps: string;
  success_key_collection: string;
  success_new_guest_button: string;
  
  // Language Selector
  language_selector_title: string;
  language_english: string;
  language_afrikaans: string;
  language_german: string;
  language_french: string;
  language_dutch: string;
  language_portuguese: string;
  language_spanish: string;
  language_russian: string;
  language_detected_message: string;
  language_switch_confirm: string;
  language_stay: string;
}

export interface Translation extends Record<keyof TranslationKeys, string> {}
