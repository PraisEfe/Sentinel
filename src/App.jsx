import React, { useState, useEffect } from 'react';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import ResultDrawer from './components/common/ResultDrawer';
import AddMonitorModal from './components/common/AddMonitorModal';
import GlobalSearchModal from './components/common/GlobalSearchModal';

// Views
import DashboardView from './components/views/DashboardView';
import SearchView from './components/views/SearchView';
import MonitorsView from './components/views/MonitorsView';
import IntelligenceView from './components/views/IntelligenceView';
import AnalyticsView from './components/views/AnalyticsView';
import AlertsView from './components/views/AlertsView';
import SettingsView from './components/views/SettingsView';
import AuthView from './components/views/AuthView';

import { INITIAL_MONITORS } from './data/mockData';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeChannel, setActiveChannel] = useState('All');
  const [searchQuery, setSearchQuery] = useState('MTN Nigeria announces major service infrastructure initiative');
  
  // Theme state: default to system preference, overridden by localStorage
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('sentinel_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [monitors, setMonitors] = useState(INITIAL_MONITORS);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState(null);
  const [isAddMonitorOpen, setIsAddMonitorOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [addMonitorInitialTopic, setAddMonitorInitialTopic] = useState('');
  const [successBanner, setSuccessBanner] = useState(null);

  // Sync theme with <html> element classList and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sentinel_theme', theme);
  }, [theme]);

  // Global Keyboard Shortcut for Search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Handlers
  const handleNavSelect = (viewId, channel = null) => {
    setCurrentView(viewId);
    if (channel) {
      setActiveChannel(channel);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchTrigger = (query) => {
    setSearchQuery(query);
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAddMonitorForTopic = (topicName = '') => {
    setAddMonitorInitialTopic(topicName);
    setIsAddMonitorOpen(true);
  };

  const handleMonitorCreated = (newMonitor) => {
    setMonitors(prev => [newMonitor, ...prev]);
    const bannerMsg = `"${newMonitor.name}" is now being monitored`;
    setSuccessBanner(bannerMsg);
    setCurrentView('monitors');
    setTimeout(() => {
      setSuccessBanner(null);
    }, 5000);
  };

  const handleDeleteMonitor = (id) => {
    setMonitors(prev => prev.filter(m => m.id !== id));
  };

  // If user signed out or viewing Auth
  if (!isAuthenticated || currentView === 'auth') {
    return (
      <AuthView
        onAuthenticate={() => {
          setIsAuthenticated(true);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5] dark:bg-[#101815] text-[#17211d] dark:text-[#f0f3f1] flex flex-col antialiased selection:bg-brand-100 selection:text-brand-800 dark:selection:bg-brand-900 dark:selection:text-brand-200 transition-colors duration-200">
      <div className="flex-1 flex flex-row w-full min-h-screen">
        {/* Left Sidebar (with dark mode toggle above user card and Channels removed) */}
        <Sidebar
          currentView={currentView}
          onSelectView={handleNavSelect}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSignOut={() => setIsAuthenticated(false)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <Header
            monitorsCount={monitors.length}
            sourcesCount={328}
            onOpenAddMonitor={() => handleOpenAddMonitorForTopic('')}
            onOpenSearch={() => setIsGlobalSearchOpen(true)}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          />

          {/* Active View Container */}
          <main className="flex-1 pb-16 bg-[#f5f7f5] dark:bg-[#101815] transition-colors duration-200">
            {currentView === 'dashboard' && (
              <DashboardView
                monitors={monitors}
                onSearch={handleSearchTrigger}
                onSelectTopic={(name) => handleSearchTrigger(name)}
                onOpenAddMonitor={() => handleOpenAddMonitorForTopic('')}
              />
            )}

            {currentView === 'search' && (
              <SearchView
                initialQuery={searchQuery}
                initialChannel={activeChannel}
                onSelectResult={(item) => setSelectedDrawerItem(item)}
                onAddMonitor={(item) => handleOpenAddMonitorForTopic(item.name)}
              />
            )}

            {currentView === 'monitors' && (
              <MonitorsView
                monitors={monitors}
                onOpenAddMonitor={() => handleOpenAddMonitorForTopic('')}
                onSelectMonitor={(name) => handleSearchTrigger(name)}
                onDeleteMonitor={handleDeleteMonitor}
                successBanner={successBanner}
              />
            )}

            {currentView === 'intelligence' && (
              <IntelligenceView
                onSelectCluster={(cluster) => setSelectedDrawerItem(cluster)}
              />
            )}

            {currentView === 'analytics' && (
              <AnalyticsView />
            )}

            {currentView === 'alerts' && (
              <AlertsView
                onNavigateSettings={() => handleNavSelect('settings')}
                onInspectTopic={(topic) => handleSearchTrigger(topic)}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView />
            )}
          </main>
        </div>
      </div>

      {/* Global Slide-Over Result Drawer */}
      <ResultDrawer
        item={selectedDrawerItem}
        onClose={() => setSelectedDrawerItem(null)}
        onAddMonitor={(item) => handleOpenAddMonitorForTopic(item.name)}
      />

      {/* Global Add Monitor Modal Wizard */}
      <AddMonitorModal
        isOpen={isAddMonitorOpen}
        onClose={() => setIsAddMonitorOpen(false)}
        onCreated={handleMonitorCreated}
        initialTopic={addMonitorInitialTopic}
      />

      {/* Global Instant Search Palette (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectResult={(item) => setSelectedDrawerItem(item)}
        onSearchQuery={handleSearchTrigger}
      />
    </div>
  );
}
