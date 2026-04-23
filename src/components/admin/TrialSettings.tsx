import { useState, useEffect } from 'react';

interface TrialSettings {
  default_trial_days: number;
  require_payment_method: boolean;
  send_reminder_days: number[];
}

export default function TrialSettings() {
  const [settings, setSettings] = useState<TrialSettings>({
    default_trial_days: 14,
    require_payment_method: false,
    send_reminder_days: [3, 1]
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/get-system-settings');
      const data = await response.json();
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/.netlify/functions/update-system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addReminderDay = () => {
    setSettings(prev => ({
      ...prev,
      send_reminder_days: [...prev.send_reminder_days, 1]
    }));
  };

  const removeReminderDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      send_reminder_days: prev.send_reminder_days.filter(d => d !== day)
    }));
  };

  if (loading) {
    return <div className="animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Trial & Subscription Settings</h2>
      
      <div className="space-y-6">
        {/* Default Trial Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Trial Duration
          </label>
          <div className="flex items-center gap-4">
            <select
              value={settings.default_trial_days}
              onChange={(e) => setSettings({ ...settings, default_trial_days: parseInt(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            >
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={0}>No trial</option>
            </select>
            <button
              onClick={() => setSettings({ ...settings, default_trial_days: 14 })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Reset to 14 days
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Default trial length for new businesses
          </p>
        </div>

        {/* Require Payment Method */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Require payment method upfront</p>
            <p className="text-sm text-gray-500">Businesses must add card before trial starts</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.require_payment_method}
              onChange={(e) => setSettings({ ...settings, require_payment_method: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>

        {/* Reminder Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trial End Reminders (days before)
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {settings.send_reminder_days.sort((a, b) => a - b).map(day => (
              <span key={day} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                {day} day{day !== 1 ? 's' : ''} before
                <button
                  onClick={() => removeReminderDay(day)}
                  className="text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={addReminderDay}
            className="text-sm text-orange-500 hover:text-orange-600"
          >
            + Add reminder
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Businesses will receive email reminders at these intervals
          </p>
        </div>

        <div className="border-t pt-6">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
