// src/pages/tabs/SettingsTab.tsx

import { useState } from 'react';
import { SettingsView, SettingsEditForm } from '../../components/dashboard';
import ChangeRequestModal from '../../components/ChangeRequestModal';

interface SettingsTabProps {
  business: any;
  editingProfile: boolean;
  profileForm: any;
  savingProfile: boolean;
  businessId: string;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (formData: any) => void;
  newsletterEnabled: boolean;
  newsletterTitle: string;
  newsletterPrize: string;
  newsletterCta: string;
  newsletterTerms: string;
  newsletterDrawDate: string;
  newsletterShareText: string;
  savingNewsletter: boolean;
  onNewsletterEnabledChange: (enabled: boolean) => void;
  onNewsletterTitleChange: (title: string) => void;
  onNewsletterPrizeChange: (prize: string) => void;
  onNewsletterCtaChange: (cta: string) => void;
  onNewsletterTermsChange: (terms: string) => void;
  onNewsletterDrawDateChange: (date: string) => void;
  onNewsletterShareTextChange: (text: string) => void;
  onSaveNewsletter: () => void;
  onRefreshBusiness: () => void; // Added for refreshing after change request
}

export function SettingsTab(props: SettingsTabProps) {
  const [changeRequestField, setChangeRequestField] = useState<{
    field: string;
    currentValue: string;
    label: string;
  } | null>(null);

  const handleChangeRequest = (field: string, currentValue: string, label: string) => {
    setChangeRequestField({ field, currentValue, label });
  };

  const handleChangeRequestClose = () => {
    setChangeRequestField(null);
  };

  const handleChangeRequestSubmit = () => {
    setChangeRequestField(null);
    props.onRefreshBusiness();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Settings</h3>
      
      {/* Business Profile Section */}
      {!props.editingProfile ? (
        <SettingsView 
          business={props.business} 
          businessId={props.businessId} 
          onEdit={props.onEdit}
          onRequestChange={handleChangeRequest}
        />
      ) : (
        <SettingsEditForm
          initialForm={props.profileForm}
          onSave={props.onSave}
          onCancel={props.onCancelEdit}
          saving={props.savingProfile}
        />
      )}

      {/* Newsletter Settings Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Newsletter Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="newsletterEnabled"
              checked={props.newsletterEnabled}
              onChange={(e) => props.onNewsletterEnabledChange(e.target.checked)}
              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
            />
            <label htmlFor="newsletterEnabled" className="text-sm font-medium text-gray-700">
              Enable Newsletter Signup
            </label>
          </div>

          {props.newsletterEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Newsletter Title</label>
                <input
                  type="text"
                  value={props.newsletterTitle}
                  onChange={(e) => props.onNewsletterTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prize Description</label>
                <input
                  type="text"
                  value={props.newsletterPrize}
                  onChange={(e) => props.onNewsletterPrizeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call to Action</label>
                <input
                  type="text"
                  value={props.newsletterCta}
                  onChange={(e) => props.onNewsletterCtaChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <input
                  type="text"
                  value={props.newsletterTerms}
                  onChange={(e) => props.onNewsletterTermsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Draw Date (optional)</label>
                <input
                  type="date"
                  value={props.newsletterDrawDate}
                  onChange={(e) => props.onNewsletterDrawDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Share Text</label>
                <input
                  type="text"
                  value={props.newsletterShareText}
                  onChange={(e) => props.onNewsletterShareTextChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={props.onSaveNewsletter}
                disabled={props.savingNewsletter}
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                  props.savingNewsletter 
                    ? 'bg-orange-400 cursor-not-allowed' 
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {props.savingNewsletter ? 'Saving...' : 'Save Newsletter Settings'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Change Request Modal */}
      {changeRequestField && (
        <ChangeRequestModal
          fieldName={changeRequestField.field}
          currentValue={changeRequestField.currentValue}
          label={changeRequestField.label}
          businessId={props.businessId}
          businessName={props.business?.trading_name || ''}
          onClose={handleChangeRequestClose}
          onSubmit={handleChangeRequestSubmit}
        />
      )}
    </div>
  );
}
