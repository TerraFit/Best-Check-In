// src/i18n/types.ts
export type SupportedLanguage = 'en' | 'af' | 'de' | 'fr' | 'nl' | 'pt' | 'es' | 'ru' | 'zh' | 'ar' | 'he' | 'it';

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
  common_welcome_home: string;
  common_processing: string;
  common_back_to_details: string;
  common_open_camera: string;
  common_capture: string;
  common_upload_from_gallery: string;
  common_take_new_photo: string;
  common_powered_by: string;
  common_clear: string;
  
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
  checkin_email_label: string;
  checkin_save_details: string;
  checkin_save_details_sub: string;
  checkin_profile_loaded: string;
  checkin_profile_saved: string;
  checkin_popia_consent: string;
  checkin_begin_button: string;
  checkin_immigration_act: string;
  checkin_select_country: string;
  checkin_select_province: string;
  checkin_enter_province: string;
  checkin_select_referral: string;
  checkin_referral_word_of_mouth: string;
  checkin_referral_travel_agency: string;
  checkin_referral_research: string;
  checkin_select_settlement: string;
  checkin_continue_indemnity: string;
  checkin_signature_instruction: string;
  checkin_adults: string;
  checkin_children: string;
  
  // Errors
  error_required: string;
  error_invalid_email: string;
  error_passwords_mismatch: string;
  error_min_length: string;
  error_photo_required: string;
  error_signature_required: string;
  error_indemnity_required: string;
  error_complete_fields: string;
  error_all_required: string;
  error_first_name_required: string;
  error_last_name_required: string;
  error_passport_required: string;
  error_phone_required: string;
  error_country_required: string;
  error_city_required: string;
  error_arrival_date_required: string;
  error_nights_required: string;
  error_referral_required: string;
  error_next_destination_required: string;
  error_settlement_required: string;
  error_is_required: string;
  error_complete_before_submit: string;
  error_id_photo_required_alert: string;
  error_signature_required_alert: string;
  error_scroll_indemnity: string;
  error_booking_failed: string;
  error_unexpected: string;
  error_email_failed: string;
  
  // Warnings
  warning_duplicate_booking: string;
  
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
  success_step_checkin_recorded: string;
  success_step_email_sent: string;
  success_step_keys: string;
  
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
  language_chinese: string;
  language_arabic: string;
  language_hebrew: string;
  language_italian: string;
  language_detected_message: string;
  language_switch_confirm: string;
  language_stay: string;
}

export interface Translation extends Record<keyof TranslationKeys, string> {}
