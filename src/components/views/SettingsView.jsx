import React, { useState } from 'react';
import { 
  Search, 
  Radio, 
  Bell, 
  Globe, 
  User, 
  Check, 
  Save, 
  Sparkles,
  Shield,
  Sliders
} from 'lucide-react';

export default function SettingsView({ initialTab = 'Search & discovery' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [saveToast, setSaveToast] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // Search & discovery
    groupStories: true,
    includeSocial: true,
    aiSummaries: true,
    detectTone: true,

    // Monitoring defaults
    scanInterval20: true,
    trackRelatedKeywords: true,
    discoverEmerging: true,
    includeHistory30: true,

    // Notifications
    highVelocityAlerts: true,
    majorSourceAlerts: true,
    resultDigest: true,
    emailNotifications: true,

    // Sources & languages
    newsMedia: true,
    publicSocial: true,
    blogsForums: true,
    frenchLanguage: false,

    // Account
    weeklySummary: true,
    personalHistory: true,
    compactDensity: false,
    researchParticipation: true
  });

  const tabs = [
    { id: 'Search & discovery', label: 'Search & discovery', icon: Search },
    { id: 'Monitoring defaults', label: 'Monitoring defaults', icon: Radio },
    { id: 'Notifications', label: 'Notifications', icon: Bell },
    { id: 'Sources & languages', label: 'Sources & languages', icon: Globe },
    { id: 'Account', label: 'Account', icon: User },
  ];

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-brand-800 dark:bg-brand-900 text-white rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom duration-200 border border-brand-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Workspace preferences saved successfully.</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink-heading dark:text-dark-text">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted dark:text-dark-muted mt-1">
          Configure discovery, monitoring and notification preferences.
        </p>
      </div>

      {/* Settings Grid: Left Nav + Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sub-nav */}
        <div className="lg:col-span-1 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left
                  ${isActive 
                    ? 'bg-brand-50 dark:bg-dark-elevated text-brand-700 dark:text-brand-300 shadow-2xs border border-brand-200 dark:border-brand-800' 
                    : 'text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface dark:hover:bg-dark-surface border border-transparent'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-subtle dark:text-dark-subtle'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Form Container */}
        <div className="lg:col-span-3 bg-surface dark:bg-dark-surface rounded-2xl p-6 sm:p-8 border border-surface-border dark:border-dark-border shadow-xs space-y-6">
          {/* Header of Active Section */}
          <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border pb-4">
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-ink-heading dark:text-dark-text">
                {activeTab}
              </h2>
              <p className="text-xs text-ink-muted dark:text-dark-muted mt-0.5">
                {activeTab === 'Search & discovery' && 'Set the defaults used across your workspace.'}
                {activeTab === 'Monitoring defaults' && 'Choose how newly created monitors scan for information.'}
                {activeTab === 'Notifications' && 'Decide which discoveries should notify you and where.'}
                {activeTab === 'Sources & languages' && 'Choose the public sources and languages included in discovery.'}
                {activeTab === 'Account' && 'Manage workspace behavior and account-level preferences.'}
              </p>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save changes</span>
            </button>
          </div>

          {/* Tab 1: Search & discovery */}
          {activeTab === 'Search & discovery' && (
            <div className="divide-y divide-surface-border/60 dark:divide-dark-border/60">
              <ToggleRow
                title="Group similar stories automatically"
                desc="Combine reposts and highly similar reports into one story cluster."
                checked={settings.groupStories}
                onChange={() => handleToggle('groupStories')}
              />
              <ToggleRow
                title="Include public social sources"
                desc="Apply this preference to new searches and monitors."
                checked={settings.includeSocial}
                onChange={() => handleToggle('includeSocial')}
              />
              <ToggleRow
                title="Show AI-generated summaries"
                desc="Apply this preference to new searches and monitors."
                checked={settings.aiSummaries}
                onChange={() => handleToggle('aiSummaries')}
              />
              <ToggleRow
                title="Detect discussion tone"
                desc="Apply this preference to new searches and monitors."
                checked={settings.detectTone}
                onChange={() => handleToggle('detectTone')}
              />
            </div>
          )}

          {/* Tab 2: Monitoring defaults */}
          {activeTab === 'Monitoring defaults' && (
            <div className="divide-y divide-surface-border/60 dark:divide-dark-border/60">
              <ToggleRow
                title="Scan every 20 minutes"
                desc="Use a twenty-minute discovery interval for new monitors."
                checked={settings.scanInterval20}
                onChange={() => handleToggle('scanInterval20')}
              />
              <ToggleRow
                title="Track related keywords"
                desc="Automatically include closely related terms and common name variations."
                checked={settings.trackRelatedKeywords}
                onChange={() => handleToggle('trackRelatedKeywords')}
              />
              <ToggleRow
                title="Discover emerging topics"
                desc="Surface low-volume discussions that are beginning to accelerate."
                checked={settings.discoverEmerging}
                onChange={() => handleToggle('discoverEmerging')}
              />
              <ToggleRow
                title="Include historical matches"
                desc="Search up to thirty days of available history when a monitor is created."
                checked={settings.includeHistory30}
                onChange={() => handleToggle('includeHistory30')}
              />
            </div>
          )}

          {/* Tab 3: Notifications */}
          {activeTab === 'Notifications' && (
            <div className="divide-y divide-surface-border/60 dark:divide-dark-border/60">
              <ToggleRow
                title="High-velocity topic alerts"
                desc="Notify me when discussion grows substantially above its normal baseline."
                checked={settings.highVelocityAlerts}
                onChange={() => handleToggle('highVelocityAlerts')}
              />
              <ToggleRow
                title="Major source alerts"
                desc="Notify me when a high-authority publication mentions a monitored topic."
                checked={settings.majorSourceAlerts}
                onChange={() => handleToggle('majorSourceAlerts')}
              />
              <ToggleRow
                title="New result digest"
                desc="Send a concise digest of newly discovered results every twenty minutes."
                checked={settings.resultDigest}
                onChange={() => handleToggle('resultDigest')}
              />
              <ToggleRow
                title="Email notifications"
                desc="Also deliver selected alerts to ada@sentinel.africa."
                checked={settings.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
              />
            </div>
          )}

          {/* Tab 4: Sources & languages */}
          {activeTab === 'Sources & languages' && (
            <div className="divide-y divide-surface-border/60 dark:divide-dark-border/60">
              <ToggleRow
                title="News and media"
                desc="Search public articles from local, regional and international publishers."
                checked={settings.newsMedia}
                onChange={() => handleToggle('newsMedia')}
              />
              <ToggleRow
                title="Public social content"
                desc="Include publicly accessible social posts and conversations."
                checked={settings.publicSocial}
                onChange={() => handleToggle('publicSocial')}
              />
              <ToggleRow
                title="Blogs and forums"
                desc="Include specialist blogs, community forums and public discussions."
                checked={settings.blogsForums}
                onChange={() => handleToggle('blogsForums')}
              />
              <ToggleRow
                title="French-language results"
                desc="Include relevant French sources alongside English results."
                checked={settings.frenchLanguage}
                onChange={() => handleToggle('frenchLanguage')}
              />
            </div>
          )}

          {/* Tab 5: Account */}
          {activeTab === 'Account' && (
            <div className="space-y-6">
              {/* Account Profile Card */}
              <div className="p-4 bg-surface-muted dark:bg-dark-elevated rounded-xl border border-surface-border dark:border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                    AO
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-ink-heading dark:text-dark-text">Ada Okafor</div>
                    <div className="text-xs text-ink-subtle dark:text-dark-muted">ada@sentinel.africa</div>
                    <div className="text-[11px] font-medium text-brand-700 dark:text-brand-400 mt-0.5">Enterprise Web Intelligence Plan</div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-surface-border/60 dark:divide-dark-border/60">
                <ToggleRow
                  title="Weekly research summary"
                  desc="Receive a weekly overview of your monitored topics and discoveries."
                  checked={settings.weeklySummary}
                  onChange={() => handleToggle('weeklySummary')}
                />
                <ToggleRow
                  title="Personal search history"
                  desc="Keep recent searches available on the Home screen."
                  checked={settings.personalHistory}
                  onChange={() => handleToggle('personalHistory')}
                />
                <ToggleRow
                  title="Compact result density"
                  desc="Show more search results on screen with reduced vertical spacing."
                  checked={settings.compactDensity}
                  onChange={() => handleToggle('compactDensity')}
                />
                <ToggleRow
                  title="Product research participation"
                  desc="Allow the team to request feedback about new discovery features."
                  checked={settings.researchParticipation}
                  onChange={() => handleToggle('researchParticipation')}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange }) {
  return (
    <div className="py-4 flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <div className="text-xs sm:text-sm font-semibold text-ink-heading dark:text-dark-text">{title}</div>
        <p className="text-xs text-ink-muted dark:text-dark-muted leading-relaxed">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
          ${checked ? 'bg-brand-600' : 'bg-surface-border dark:bg-dark-border'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
