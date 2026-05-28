// src/components/dashboard/TrialBanner.tsx
import { useNavigate } from 'react-router-dom'

interface TrialBannerProps {
  subscriptionStatus: string | null
  trialDaysLeft: number | null
}

export function TrialBanner({ subscriptionStatus, trialDaysLeft }: TrialBannerProps) {
  const navigate = useNavigate()

  // Don't show anything if not on trial or trial days unknown
  if (subscriptionStatus !== 'trial' || trialDaysLeft === null || trialDaysLeft > 7) {
    return null
  }

  const isUrgent = trialDaysLeft <= 3
  const bgColor = isUrgent ? 'bg-red-50 border-l-4 border-red-500' : 'bg-amber-50 border-l-4 border-amber-500'
  const iconColor = isUrgent ? 'text-red-500' : 'text-amber-500'
  const titleColor = isUrgent ? 'text-red-800' : 'text-amber-800'
  const textColor = isUrgent ? 'text-red-700' : 'text-amber-700'
  const buttonColor = isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
  const titleText = isUrgent ? '⚠️ Your free trial ends soon!' : `Your free trial ends in ${trialDaysLeft} days`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className={`rounded-lg p-4 ${bgColor}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className={`font-semibold ${titleColor}`}>{titleText}</p>
              <p className={`text-sm ${textColor}`}>
                Upgrade now to continue using FastCheckin without interruption.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/business/billing')}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${buttonColor}`}
          >
            Upgrade Now →
          </button>
        </div>
      </div>
    </div>
  )
}
