// src/components/dashboard/SettingsTab.tsx
import { SettingsView } from './SettingsView'
import { SettingsEditForm } from './SettingsEditForm'

interface SettingsTabProps {
  business: any
  editingProfile: boolean
  profileForm: any
  savingProfile: boolean
  businessId: string
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (formData: any) => void
}

export function SettingsTab({
  business,
  editingProfile,
  profileForm,
  savingProfile,
  businessId,
  onEdit,
  onCancelEdit,
  onSave
}: SettingsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Settings</h3>
      
      {!editingProfile ? (
        <SettingsView
          business={business}
          businessId={businessId}
          onEdit={onEdit}
        />
      ) : (
        <SettingsEditForm
          initialForm={profileForm}
          onSave={onSave}
          onCancel={onCancelEdit}
          saving={savingProfile}
        />
      )}
    </div>
  )
}
