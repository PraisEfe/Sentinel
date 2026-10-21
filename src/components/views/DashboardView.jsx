import React, { useState } from 'react';
import { 
  Search, 
  ArrowRight, 
  Clock, 
  Radio, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  Globe, 
  TrendingUp, 
  ShieldCheck,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { RECENT_SEARCHES, INITIAL_MONITORS } from '../../data/mockData';

export default function DashboardView({ 
  onSearch, 
  onSelectTopic, 
  onOpenAddMonitor,
  monitors = INITIAL_MONITORS 
}) {
  const [searchQuery, setSearchQuery] = useState('MTN Nigeria announces major service infrastructure initiative');
  const [recentList, setRecentList] = useState(RECENT_SEARCHES);
  const [isBlankState, setIsBlankState] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleClearHistory = () => {
    setRecentList([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* State Switcher Badge for Reviewing Figma Variants */}
      <div className="flex items-center justify-between p-2.5 bg-surface dark:bg-dark-surface rounded-xl border border-surface-border dark:border-dark-border text-xs text-ink-muted dark:text-dark-muted shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500" />
          <span className="font-semibold text-ink dark:text-dark-text">Figma Frame:</span>
          <span>{isBlankState ? 'Dashboard (Blank State) [56:2]' : 'Dashboard (Active State) [8:2]'}</span>
        </div>
        <button
          onClick={() => setIsBlankState(!isBlankState)}
          className="px-2.5 py-1 bg-surface-muted dark:bg-dark-elevated hover:bg-surface-hover dark:hover:bg-dark-border rounded-md font-medium text-brand-700 dark:text-brand-300 transition-colors"
        >
          {isBlankState ? 'Switch to Populated State' : 'Switch to Blank State'}
        </button>
      </div>

      {/* Hero Search Section */}
      <div className="bg-surface dark:bg-dark-surface rounded-3xl p-6 sm:p-10 border border-surface-border dark:border-dark-border shadow-xs space-y-6">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold tracking-wide border border-brand-200/40 dark:border-brand-800">
            <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Live web intelligence</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-ink-heading dark:text-dark-text tracking-tight">
            Discover what's happening online.
          </h1>
          <p className="text-sm sm:text-base text-ink-muted dark:text-dark-muted leading-relaxed">
            Search people, organisations, brands, topics and keywords across the public web.
          </p>
        </div>

        {/* Hero Search Box */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative flex items-center bg-surface-subtle dark:bg-dark-elevated border-2 border-surface-border dark:border-dark-border focus-within:border-brand-600 dark:focus-within:border-brand-500 focus-within:bg-surface dark:focus-within:bg-dark-surface rounded-2xl p-2 transition-all shadow-xs">
            <div className="pl-3 pr-2 text-ink-subtle dark:text-dark-muted">
              <Search className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people, organisations, brands, topics and keywords..."
              className="w-full bg-transparent text-sm sm:text-base text-ink dark:text-dark-text focus:outline-none px-2 py-1 placeholder:text-ink-subtle dark:placeholder:text-dark-subtle"
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm shrink-0"
            >
              <span>Search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Channel Indicators */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-medium text-ink-subtle dark:text-dark-muted pt-1">
          <span className="text-ink-darker dark:text-dark-text font-semibold">Indexed Sources:</span>
          <span className="hover:text-brand-700 dark:hover:text-brand-400 cursor-pointer">News & websites</span>
          <span>·</span>
          <span className="hover:text-brand-700 dark:hover:text-brand-400 cursor-pointer">Public social</span>
          <span>·</span>
          <span className="hover:text-brand-700 dark:hover:text-brand-400 cursor-pointer">Blogs & forums</span>
          <span>·</span>
          <span className="hover:text-brand-700 dark:hover:text-brand-400 cursor-pointer">Continuous discovery</span>
        </div>
      </div>

      {/* Main Grid: Recent Searches & Monitored Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Recent Searches */}
        <div className="bg-surface dark:bg-dark-surface rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border pb-4">
            <div>
              <h2 className="font-display font-bold text-base text-ink-heading dark:text-dark-text">
                Recent searches
              </h2>
              <p className="text-xs text-ink-muted dark:text-dark-muted">
                Pick up where you left off
              </p>
            </div>

            {recentList.length > 0 && !isBlankState && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-ink-subtle dark:text-dark-subtle hover:text-signal-critical font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear history</span>
              </button>
            )}
          </div>

          {isBlankState || recentList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-surface-muted dark:bg-dark-elevated text-ink-subtle dark:text-dark-muted flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-ink-darker dark:text-dark-text">No recent searches</div>
              <div className="text-[11px] text-ink-subtle dark:text-dark-muted max-w-xs mx-auto">
                Your recent discovery queries and investigative searches will appear here.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-surface-border/60 dark:divide-dark-border/60">
              {recentList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSearch(item.query)}
                  className="py-3 px-2 rounded-xl hover:bg-surface-muted dark:hover:bg-dark-elevated cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-ink dark:text-dark-text group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                      {item.query}
                    </div>
                    <div className="text-[11px] text-ink-subtle dark:text-dark-muted">
                      {item.count} · {item.timeAgo}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-ink-subtle dark:text-dark-muted group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: Monitored Topics */}
        <div className="bg-surface dark:bg-dark-surface rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border pb-4">
            <div>
              <h2 className="font-display font-bold text-base text-ink-heading dark:text-dark-text">
                Monitored topics
              </h2>
              <p className="text-xs text-ink-muted dark:text-dark-muted">
                Continuous discovery for saved searches
              </p>
            </div>

            <button
              onClick={onOpenAddMonitor}
              className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-200 flex items-center gap-1 bg-brand-50 dark:bg-brand-900/40 hover:bg-brand-100 dark:hover:bg-brand-900/60 px-3 py-1.5 rounded-lg transition-colors border border-brand-200/60 dark:border-brand-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add monitor</span>
            </button>
          </div>

          {isBlankState ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                <Radio className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-ink-darker dark:text-dark-text">No monitored topics yet</div>
              <div className="text-[11px] text-ink-subtle dark:text-dark-muted max-w-xs mx-auto">
                Save topics to automatically monitor continuous public-web mentions and get velocity digests.
              </div>
              <button
                onClick={onOpenAddMonitor}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create first monitor</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-surface-border/60 dark:divide-dark-border/60">
              {monitors.map((mon) => (
                <div
                  key={mon.id}
                  onClick={() => onSelectTopic(mon.name)}
                  className="py-3 px-2 rounded-xl hover:bg-surface-muted dark:hover:bg-dark-elevated cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-xl font-display font-bold text-xs text-white flex items-center justify-center shadow-2xs"
                      style={{ backgroundColor: mon.color || '#237a55' }}
                    >
                      {mon.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink dark:text-dark-text group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                        {mon.name}
                      </div>
                      <div className="text-[11px] text-ink-subtle dark:text-dark-muted">
                        {mon.category} · Updated {mon.updatedAt}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-100 dark:bg-brand-900/50 text-brand-800 dark:text-brand-300">
                      {mon.newActivity} new
                    </span>
                    <div className="text-[10px] text-ink-subtle dark:text-dark-muted mt-0.5">
                      {mon.totalMentions.toLocaleString()} total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
