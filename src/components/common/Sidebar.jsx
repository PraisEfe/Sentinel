import React from 'react';
import { 
  Home, 
  Search, 
  Radio, 
  Sparkles, 
  BarChart3, 
  Bell, 
  Settings, 
  HelpCircle, 
  LogOut,
  Shield,
  X,
  Sun,
  Moon
} from 'lucide-react';

export default function Sidebar({ 
  currentView, 
  onSelectView, 
  isOpen, 
  onClose,
  unreadAlertsCount = 3,
  onSignOut,
  theme = 'light',
  onToggleTheme
}) {
  const mainNavItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'monitors', label: 'Monitors', icon: Radio },
    { id: 'intelligence', label: 'Intelligence', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlertsCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (viewId) => {
    onSelectView(viewId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-ink-heading/40 dark:bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-surface dark:bg-dark-surface border-r border-surface-border dark:border-dark-border
        flex flex-col justify-between z-40 transition-all duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top: Brand Header */}
        <div className="p-5 border-b border-surface-border dark:border-dark-border flex items-center justify-between">
          <div 
            onClick={() => handleNavClick('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm group-hover:bg-brand-700 transition-colors">
              <Shield className="w-5 h-5 fill-current text-white/90" />
            </div>
            <div>
              <div className="font-display font-extrabold text-sm tracking-wider text-ink-heading dark:text-dark-text">
                SENTINEL
              </div>
              <div className="text-[11px] text-ink-subtle dark:text-dark-muted font-medium">
                Web Intelligence
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden p-1.5 text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface-muted dark:hover:bg-dark-elevated rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Middle: Navigation Scroll Area (Channels section removed matching Figma design) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-ink-subtle dark:text-dark-subtle uppercase">
              Explore
            </div>
            <nav className="space-y-1">
              {mainNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold' 
                        : 'text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface-muted dark:hover:bg-dark-elevated'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-subtle dark:text-dark-muted'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-brand-100 dark:bg-brand-900/70 text-brand-700 dark:text-brand-300">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom: Help, Theme Switcher, & User Profile */}
        <div className="p-3 border-t border-surface-border dark:border-dark-border space-y-2">
          {/* Help & resources link */}
          <button 
            onClick={() => handleNavClick('settings')}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface-muted dark:hover:bg-dark-elevated rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-ink-subtle dark:text-dark-muted" />
            <span>Help & resources</span>
          </button>

          {/* Theme Toggle Pill (placed right above Ada Okafor profile card) */}
          <div className="p-1.5 bg-surface-muted dark:bg-dark-elevated rounded-xl border border-surface-border dark:border-dark-border flex items-center justify-between text-xs font-medium">
            <span className="px-2 text-ink-muted dark:text-dark-muted text-[11px] font-semibold flex items-center gap-1.5">
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-brand-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            </span>

            <button
              onClick={onToggleTheme}
              className={`
                flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs
                ${theme === 'dark' 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-surface text-ink border border-surface-border'}
              `}
              title="Toggle theme"
            >
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>

          {/* User Profile Card */}
          <div className="p-2.5 bg-surface-muted dark:bg-dark-elevated rounded-xl flex items-center justify-between border border-surface-border dark:border-dark-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-semibold text-xs flex items-center justify-center">
                AO
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-ink-heading dark:text-dark-text leading-tight">
                  Ada Okafor
                </div>
                <div className="text-[10px] text-ink-subtle dark:text-dark-muted leading-tight">
                  Research workspace
                </div>
              </div>
            </div>

            <button
              onClick={onSignOut}
              title="Sign out / Switch account"
              className="p-1.5 text-ink-subtle dark:text-dark-muted hover:text-signal-critical hover:bg-surface dark:hover:bg-dark-surface rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
