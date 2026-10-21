import React from 'react';
import { Plus, Database, Search, Menu, Radio } from 'lucide-react';

export default function Header({ 
  onOpenAddMonitor, 
  onOpenSearch, 
  onToggleSidebar, 
  monitorsCount = 4,
  sourcesCount = 328
}) {
  return (
    <header className="sticky top-0 z-20 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md border-b border-surface-border dark:border-dark-border px-4 lg:px-8 py-3.5 flex items-center justify-between transition-colors">
      {/* Left side: Mobile menu & Live Status */}
      <div className="flex items-center gap-3 lg:gap-4">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface-muted dark:hover:bg-dark-elevated rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-600 dark:bg-brand-500"></span>
          </span>
          <span className="text-ink dark:text-dark-text font-semibold">Monitoring {monitorsCount} topics</span>
          <span className="hidden sm:inline text-ink-subtle dark:text-dark-muted">· Last scan just now</span>
        </div>
      </div>

      {/* Right side: Global stats, quick search, and Add monitor CTA */}
      <div className="flex items-center gap-3">
        {/* Sources indexed badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border rounded-full text-xs text-ink-darker dark:text-dark-muted font-medium">
          <Database className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>{sourcesCount} sources indexed</span>
        </div>

        {/* Quick Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text bg-surface dark:bg-dark-elevated border border-surface-border dark:border-dark-border hover:border-surface-borderDark dark:hover:border-brand-500/50 rounded-lg transition-colors shadow-2xs"
          title="Search anything (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search web...</span>
          <kbd className="hidden lg:inline px-1.5 py-0.5 text-[10px] bg-surface-muted dark:bg-dark-surface rounded text-ink-subtle dark:text-dark-subtle font-mono border border-surface-border dark:border-dark-border">⌘K</kbd>
        </button>

        {/* Add Monitor Button */}
        <button
          onClick={onOpenAddMonitor}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add monitor</span>
        </button>
      </div>
    </header>
  );
}
