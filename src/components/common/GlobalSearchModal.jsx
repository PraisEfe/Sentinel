import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Clock, Globe, Sparkles } from 'lucide-react';
import { RECENT_SEARCHES, SEARCH_RESULTS } from '../../data/mockData';

export default function GlobalSearchModal({ 
  isOpen, 
  onClose, 
  onSelectResult,
  onSearchQuery 
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredResults = query.trim()
    ? SEARCH_RESULTS.filter(r => 
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        r.source.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_RESULTS.slice(0, 4);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearchQuery(query);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-ink-heading/40 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Search Palette Container */}
      <div className="relative w-full max-w-2xl bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl border border-surface-border dark:border-dark-border overflow-hidden z-10 flex flex-col animate-in zoom-in-95 duration-150">
        {/* Search Header Input */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-surface-border dark:border-dark-border flex items-center gap-3 bg-surface-subtle dark:bg-dark-elevated">
          <Search className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people, organisations, brands, topics and keywords..."
            className="w-full bg-transparent text-sm sm:text-base text-ink dark:text-dark-text placeholder:text-ink-subtle dark:placeholder:text-dark-subtle focus:outline-none"
          />
          {query && (
            <button 
              type="button" 
              onClick={() => setQuery('')}
              className="p-1 text-ink-subtle dark:text-dark-muted hover:text-ink dark:hover:text-dark-text rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shrink-0"
          >
            Search
          </button>
        </form>

        {/* Search Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Quick Suggestions / Recents if empty query */}
          {!query.trim() && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle dark:text-dark-muted px-2 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Recent Searches</span>
              </div>
              <div className="flex flex-wrap gap-2 px-2">
                {RECENT_SEARCHES.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSearchQuery(item.query);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-muted dark:bg-dark-elevated hover:bg-surface-hover dark:hover:bg-dark-border border border-surface-border dark:border-dark-border text-xs font-medium text-ink dark:text-dark-text transition-colors"
                  >
                    <span>{item.query}</span>
                    <span className="text-[10px] text-ink-subtle dark:text-dark-muted">({item.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle dark:text-dark-muted px-2 mb-2 flex items-center justify-between">
              <span>{query.trim() ? `Search Results (${filteredResults.length})` : 'Featured Discoveries'}</span>
              <span className="text-[10px] text-brand-700 dark:text-brand-400 font-medium">328 public sources</span>
            </div>

            <div className="space-y-1.5">
              {filteredResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-subtle dark:text-dark-muted">
                  No public intelligence found matching "{query}". Try a different keyword or create a monitor.
                </div>
              ) : (
                filteredResults.map(res => (
                  <div
                    key={res.id}
                    onClick={() => {
                      onSelectResult(res);
                      onClose();
                    }}
                    className="group p-3 rounded-xl hover:bg-surface-muted dark:hover:bg-dark-elevated border border-transparent hover:border-surface-border dark:hover:border-dark-border cursor-pointer transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-brand-700 dark:text-brand-400">{res.source}</span>
                        <span className="text-ink-subtle dark:text-dark-subtle">· {res.date}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-brand-50 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-medium">
                          {res.channel}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-ink dark:text-dark-text group-hover:text-brand-800 dark:group-hover:text-brand-300 transition-colors">
                        {res.title}
                      </div>
                      <p className="text-xs text-ink-muted dark:text-dark-muted line-clamp-1">
                        {res.excerpt}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-ink-subtle dark:text-dark-muted group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-surface-subtle dark:bg-dark-elevated border-t border-surface-border dark:border-dark-border flex items-center justify-between text-[11px] text-ink-subtle dark:text-dark-muted">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Press <kbd className="font-mono bg-surface dark:bg-dark-surface px-1 py-0.5 border border-surface-border dark:border-dark-border rounded text-ink dark:text-dark-text">Enter</kbd> to search full public web</span>
          </div>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
