// src/components/dashboard/SettingsEditForm.tsx
import { useState } from 'react'

interface SettingsEditFormProps {
  initialForm: {
    total_rooms: string
    avg_price: string
    slogan: string
    welcome_message: string
    logo_url: string
  }
  onSave: (formData: any) => void
  onCancel: () => void
  saving: boolean
}

export function SettingsEditForm({ initialForm, onSave, onCancel, saving }: SettingsEditFormProps) {
  const [profileForm, setProfileForm] = useState(initialForm)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const handleSave = () => {
    onSave(profileForm)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)')
      return
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert('File must be less than 2MB')
      return
    }
    
    setUploadingLogo(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileForm(prev => ({ ...prev, logo_url: reader.result as string }))
      setUploadingLogo(false)
    }
    reader.onerror = () => {
      setUploadingLogo(false)
      alert('Error reading file')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Number of Rooms</label>
          <input
            type="number"
            value={profileForm.total_rooms}
            onChange={(e) => setProfileForm({ ...profileForm, total_rooms: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Average Room Price (ZAR)</label>
          <input
            type="number"
            value={profileForm.avg_price}
            onChange={(e) => setProfileForm({ ...profileForm, avg_price: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slogan</label>
          <input
            type="text"
            value={profileForm.slogan}
            onChange={(e) => setProfileForm({ ...profileForm, slogan: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
          <input
            type="text"
            value={profileForm.welcome_message}
            onChange={(e) => setProfileForm({ ...profileForm, welcome_message: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Logo</label>
          <div className="flex items-center gap-4">
            {profileForm.logo_url ? (
              <img src={profileForm.logo_url} alt="Logo Preview" className="h-16 w-16 object-contain border rounded-lg p-1 bg-white" />
            ) : (
              <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadingLogo}
              />
              <button
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {uploadingLogo ? 'Uploading...' : 'Choose Image'}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 2MB</p>
            </div>
            {profileForm.logo_url && (
              <button
                onClick={() => setProfileForm({ ...profileForm, logo_url: '' })}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
