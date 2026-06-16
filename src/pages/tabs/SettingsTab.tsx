// src/pages/tabs/SettingsTab.tsx
import { SettingsView, SettingsEditForm } from '../../components/dashboard';

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
}

export function SettingsTab({
  business,
  editingProfile,
  profileForm,
  savingProfile,
  businessId,
  onEdit,
  onCancelEdit,
  onSave,
  newsletterEnabled,
  newsletterTitle,
  newsletterPrize,
  newsletterCta,
  newsletterTerms,
  newsletterDrawDate,
  newsletterShareText,
  savingNewsletter,
  onNewsletterEnabledChange,
  onNewsletterTitleChange,
  onNewsletterPrizeChange,
  onNewsletterCtaChange,
  onNewsletterTermsChange,
  onNewsletterDrawDateChange,
  onNewsletterShareTextChange,
  onSaveNewsletter,
}: SettingsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Settings</h3>
      
      {!editingProfile ? (
        <SettingsView business={business} businessId={businessId} onEdit={onEdit} />
      ) : (
        <SettingsEditForm
          initialForm={profileForm}
          onSave={onSave}
          onCancel={onCancelEdit}
          saving={savingProfile}
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
              checked={newsletterEnabled}
              onChange={(e) => onNewsletterEnabledChange(e.target.checked)}
              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
            />
            <label htmlFor="newsletterEnabled" className="text-sm font-medium text-gray-700">
              Enable Newsletter Signup
            </label>
          </div>

          {newsletterEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Newsletter Title</label>
                <input
                  type="text"
                  value={newsletterTitle}
                  onChange={(e) => onNewsletterTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prize Description</label>
                <input
                  type="text"
                  value={newsletterPrize}
                  onChange={(e) => onNewsletterPrizeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call to Action</label>
                <input
                  type="text"
                  value={newsletterCta}
                  onChange={(e) => onNewsletterCtaChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <input
                  type="text"
                  value={newsletterTerms}
                  onChange={(e) => onNewsletterTermsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Draw Date (optional)</label>
                <input
                  type="date"
                  value={newsletterDrawDate}
                  onChange={(e) => onNewsletterDrawDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Share Text</label>
                <input
                  type="text"
                  value={newsletterShareText}
                  onChange={(e) => onNewsletterShareTextChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={onSaveNewsletter}
                disabled={savingNewsletter}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {savingNewsletter ? 'Saving...' : 'Save Newsletter Settings'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
