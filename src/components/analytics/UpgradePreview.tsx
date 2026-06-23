// src/components/analytics/UpgradePreview.tsx

interface UpgradePreviewProps {
  title: string;
  description: string;
  upgradeTo: string;
  icon?: React.ReactNode;
}

export function UpgradePreview({ title, description, upgradeTo, icon }: UpgradePreviewProps) {
  return (
    <div className="bg-gradient-to-br from-stone-50 to-amber-50 rounded-xl border border-amber-200 p-8 text-center">
      {icon || (
        <div className="w-12 h-12 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}
      
      <h4 className="text-lg font-semibold text-stone-900 mb-2">{title}</h4>
      <p className="text-sm text-stone-500 mb-4">{description}</p>
      
      <button 
        className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm"
        onClick={() => window.location.href = '/business/billing'}
      >
        Upgrade to {upgradeTo}
      </button>
      
      <p className="mt-2 text-xs text-stone-400">Unlock this feature with your subscription</p>
    </div>
  );
}
