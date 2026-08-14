// src/i18n/types.ts
// Aligned with actual translation resources. Index signature allows new keys
// while preserving known-key autocomplete and documentation.

export type SupportedLanguage = 'en' | 'af' | 'de' | 'fr' | 'nl' | 'pt' | 'es' | 'ru' | 'zh' | 'ar' | 'he' | 'it';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export interface TranslationKeys {
  // Allow any key present in the JSON resources (canonical source of truth)
  [key: string]: string;

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
  common_not_set: string;
  common_edit: string;
  common_add: string;
  common_search: string;
  common_filter: string;
  common_export: string;
  common_import: string;
  common_yes: string;
  common_no: string;
  common_confirm: string;
  common_close: string;
  common_error: string;
  common_success: string;
  common_warning: string;
  common_info: string;
  common_no_data: string;
  common_try_again: string;
  common_please_wait: string;

  // Navigation
  nav_home: string;
  nav_guest_checkin: string;
  nav_management: string;
  nav_logout: string;
  nav_dashboard: string;
  nav_checkins: string;
  nav_guests: string;
  nav_rooms: string;
  nav_housekeeping: string;
  nav_lost_found: string;
  nav_newsletter: string;
  nav_analytics: string;
  nav_settings: string;
  nav_staff: string;
  nav_super_admin: string;
  nav_back_to_dashboard: string;

  // Rooms
  rooms_title: string;
  rooms_subtitle: string;
  rooms_licensed_capacity: string;
  rooms_licensed_rooms: string;
  rooms_licensed_help: string;
  rooms_list_title: string;
  rooms_room: string;
  rooms_room_number: string;
  rooms_room_name: string;
  rooms_room_type: string;
  rooms_capacity: string;
  rooms_adults: string;
  rooms_children: string;
  rooms_infants: string;
  rooms_available_for_allocation: string;
  rooms_available: string;
  rooms_unavailable: string;
  rooms_edit_room: string;
  rooms_status: string;
  rooms_actions: string;
  rooms_loading: string;
  rooms_no_rooms: string;
  rooms_no_rooms_help: string;
  rooms_notes: string;
  rooms_reason: string;
  rooms_select_reason: string;
  rooms_placeholder_name: string;
  rooms_placeholder_notes: string;
  rooms_save: string;
  rooms_saving: string;
  rooms_cancel: string;
  rooms_close: string;
  rooms_shown_as: string;
  rooms_allocation_help: string;
  rooms_failed_load: string;
  rooms_failed_save: string;
  rooms_saved: string;

  // Housekeeping
  housekeeping_title: string;
  housekeeping_refresh: string;
  housekeeping_full_service: string;
  housekeeping_stayover: string;
  housekeeping_checkout: string;
  housekeeping_task_status: string;

  // Lost & Found
  lost_found_title: string;
  lost_found_found_item: string;
  lost_found_item_photo: string;
  lost_found_guest: string;
  lost_found_room: string;
  lost_found_date_time: string;
  lost_found_contact_status: string;
  lost_found_follow_up: string;
  lost_found_1_day: string;
  lost_found_3_day: string;
  lost_found_7_day: string;
  lost_found_unclaimed: string;
  lost_found_disposal: string;

  // Check-in (existing)
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

  // Errors, warnings, indemnity, success, language (existing keys retained)
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
  warning_duplicate_booking: string;
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
  success_checkin_complete: string;
  success_welcome: string;
  success_email_sent: string;
  success_next_steps: string;
  success_key_collection: string;
  success_new_guest_button: string;
  success_step_checkin_recorded: string;
  success_step_email_sent: string;
  success_step_keys: string;
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
