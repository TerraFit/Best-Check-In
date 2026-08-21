// src/components/dashboard/SettingsView.tsx

import { t } from '../../i18n';

interface SettingsViewProps {
  business: {
    id?: string;
    trading_name?: string;
    registered_name?: string;
    slogan?: string;
    email?: string;
    secondary_email?: string;
    phone?: string;
    mobile_phone?: string;
    secondary_phone?: string;
    total_rooms?: number;
    avg_price?: number;
    logo_url?: string;
    directors?: unknown;
  } | null;
  businessId: string;
  onEdit: () => void;
  onRequestChange: (field: string, currentValue: string, label: string) => void;
}

export function SettingsView({ business, businessId, onEdit, onRequestChange }: SettingsViewProps) {
  if (!business) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('settings_no_business_data')}</p>
        <button type="button" onClick={onEdit} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          {t('settings_add_info')}
        </button>
      </div>
    );
  }

  const editableFields = new Set(['email', 'secondary_email', 'phone', 'mobile_phone', 'secondary_phone']);

  const directors = Array.isArray(business.directors)
    ? business.directors
    : typeof business.directors === 'string' && business.directors.trim()
      ? (() => {
          try {
            const parsed = JSON.parse(business.directors);
            return Array.isArray(parsed) ? parsed : [{ name: business.directors }];
          } catch {
            return [{ name: business.directors }];
          }
        })()
      : [];

  const renderField = (
    label: string,
    value: string | number | undefined,
    field: string,
    locked: boolean = true,
    immutable: boolean = false,
  ) => {
    const displayValue = value || t('common_not_set');
    const isEditable = !locked || editableFields.has(field);

    return (
      <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-900 break-words">{displayValue}</p>
        </div>
        {!immutable && (isEditable ? (
          <button type="button" onClick={onEdit} className="shrink-0 text-xs text-green-600 hover:text-green-700 font-medium">
            {t('settings_editable')} · {t('settings_edit_profile')}
          </button>
        ) : (
          <button type="button" onClick={() => onRequestChange(field, String(value || ''), label)} className="shrink-0 text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {t('settings_request_change')}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">{t('dashboard_business_info')}</p>
          <div className="space-y-1 text-sm">
            {renderField(t('settings_business_id'), businessId, 'id', true, true)}
            {renderField(t('settings_registered_name'), business.registered_name, 'registered_name', true)}
            {renderField(t('dashboard_trading_name'), business.trading_name, 'trading_name', true)}
            {renderField(t('settings_slogan'), business.slogan, 'slogan', true)}
            {renderField(t('dashboard_email'), business.email, 'email', false)}
            {renderField(t('settings_secondary_email'), business.secondary_email, 'secondary_email', false)}
            {renderField(t('dashboard_phone'), business.phone, 'phone', false)}
            {renderField(t('settings_mobile_phone'), business.mobile_phone, 'mobile_phone', false)}
            {renderField(t('settings_secondary_phone'), business.secondary_phone, 'secondary_phone', false)}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">{t('settings_property_details')}</p>
          <div className="space-y-1 text-sm">
            {renderField(t('dashboard_total_rooms'), business.total_rooms, 'total_rooms', true)}
            {renderField(t('dashboard_avg_price'), business.avg_price ? `R ${business.avg_price.toLocaleString()}` : t('common_not_set'), 'avg_price', true)}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('settings_directors')}</p>
            {directors.length > 0 ? (
              <div className="space-y-2">
                {directors.map((director: any, idx: number) => {
                  const directorName = typeof director === 'string' ? director : director?.name;
                  const directorId = typeof director === 'string' ? '' : director?.id_number;
                  return (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-gray-900">{directorName || t('common_not_set')}</p>
                      {directorId && <p className="text-xs text-gray-500">{t('settings_id')}: {directorId}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('settings_no_directors')}</p>
            )}
            <button type="button" onClick={() => onRequestChange('directors', JSON.stringify(directors), t('settings_directors'))} className="mt-2 text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232 18.768 8.768M16.732 3.732a2.5 2.5 0 0 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
              {t('settings_request_change')}
            </button>
          </div>
        </div>
      </div>

      {business.logo_url && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">{t('settings_current_logo')}</p>
          <img src={business.logo_url} alt={t('settings_business_logo')} className="h-20 w-auto border rounded-lg p-2 bg-white" />
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onEdit} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          {t('settings_edit_profile')}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p>🔒 <strong>{t('settings_locked_fields')}</strong> {t('settings_locked_description')}</p>
      </div>
    </div>
  );
}
