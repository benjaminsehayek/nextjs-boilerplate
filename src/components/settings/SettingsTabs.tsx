interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'personal', label: 'Personal', icon: '👤' },
  { id: 'business', label: 'Business', icon: '🏢' },
  { id: 'services', label: 'Services & Markets', icon: '📋' },
  { id: 'billing', label: 'Plan & Billing', icon: '💳' },
];

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <div className="border-b border-char-700 mb-8">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-flame-500 text-flame-500'
                : 'border-transparent text-ash-400 hover:text-ash-200'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
