import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface Tab {
  id: string
  name: string
}

interface NavigationTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function NavigationTabs({ tabs, activeTab, onTabChange }: NavigationTabsProps) {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const labelFor = (tab: Tab) => {
    if (tab.id === 'overview') return t('dashboard_overview');
    if (tab.id === 'checkins') return t('dashboard_checkins');
    if (tab.id === 'reports') return t('dashboard_reports');
    if (tab.id === 'settings') return t('dashboard_settings');
    return tab.name;
  };

  const selectTab = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between md:hidden py-2">
          <span className="text-sm font-semibold text-gray-700">{labelFor(tabs.find((tab) => tab.id === activeTab) || { id: activeTab, name: activeTab })}</span>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="business-dashboard-mobile-menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 p-2.5 text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <nav aria-label="Business dashboard" className="hidden md:flex md:space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {labelFor(tab)}
            </button>
          ))}
        </nav>

        {mobileMenuOpen && (
          <nav id="business-dashboard-mobile-menu" aria-label="Business dashboard mobile" className="md:hidden border-t border-gray-100 py-2">
            <div className="grid grid-cols-1 gap-1 pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors
                    ${activeTab === tab.id ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <span>{labelFor(tab)}</span>
                  {activeTab === tab.id && <span aria-hidden className="h-2 w-2 rounded-full bg-orange-500" />}
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
