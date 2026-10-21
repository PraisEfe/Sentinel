import  { useState } from 'react';
import { 
  Search, 
  Radio, 
  Bookmark, 
  SlidersHorizontal, 
  Calendar, 
  Globe, 
  MapPin, 
  Languages, 
  Smile, 
  ArrowUpDown
} from 'lucide-react';
import { SEARCH_RESULTS } from '../../data/mockData';

export default function SearchView({ 
  initialQuery = 'MTN Nigeria announces major service infrastructure initiative',
  initialChannel = 'All',
  onSelectResult,
  onAddMonitor 
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeChannel, setActiveChannel] = useState(initialChannel);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('Any time');
  const [sourceFilter, setSourceFilter] = useState('All sources');
  const [locationFilter, setLocationFilter] = useState('Anywhere');
  const [languageFilter, setLanguageFilter] = useState('All languages');
  const [sentimentFilter, setSentimentFilter] = useState('Any sentiment');
  const [sortBy, setSortBy] = useState('Most Relevant');
  const [isSavedView, setIsSavedView] = useState(false);

  const channels = [
    { id: 'All', label: 'All', count: '4,821' },
    { id: 'News', label: 'News', count: '1,842' },
    { id: 'Social', label: 'Social', count: '1,230' },
    { id: 'Websites', label: 'Websites', count: '940' },
    { id: 'Blogs', label: 'Blogs', count: '489' },
    { id: 'Forums', label: 'Forums', count: '320' },
  ];

  const filteredResults = SEARCH_RESULTS.filter(res => {
    if (activeChannel !== 'All' && res.channel !== activeChannel) return false;
    if (sentimentFilter !== 'Any sentiment' && res.sentiment !== sentimentFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Search Bar Container */}
      <div className="bg-surface dark:bg-dark-surface rounded-2xl p-4 border border-surface-border dark:border-dark-border shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics, people or keywords..."
          className="w-full bg-transparent text-sm sm:text-base font-medium text-ink dark:text-dark-text placeholder:text-ink-subtle dark:placeholder:text-dark-subtle focus:outline-none"
        />
        <button
          onClick={() => {}}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold rounded-xl shrink-0 transition-colors shadow-2xs"
        >
          Search
        </button>
      </div>

      {/* Query Banner & Topic Action */}
      <div className="bg-surface dark:bg-dark-surface rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display font-bold text-lg sm:text-2xl text-ink-heading dark:text-dark-text leading-snug">
            {query}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-dark-muted">
            4,821 relevant results from 328 public sources
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onAddMonitor({ name: query })}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <Radio className="w-4 h-4" />
            <span>Monitor this topic</span>
          </button>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center gap-1.5 border-b border-surface-border dark:border-dark-border overflow-x-auto pb-2">
        {channels.map((ch) => {
          const isActive = activeChannel === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all
                ${isActive
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface-muted dark:hover:bg-dark-elevated'}
              `}
            >
              <span>{ch.label}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-surface-border dark:bg-dark-elevated text-ink-subtle dark:text-dark-muted'}`}>
                {ch.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Layout: Filters Sidebar + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface dark:bg-dark-surface rounded-2xl p-5 border border-surface-border dark:border-dark-border shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-heading dark:text-dark-text">
                <SlidersHorizontal className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Refine results</span>
              </div>
              <button
                onClick={() => {
                  setDateFilter('Any time');
                  setSourceFilter('All sources');
                  setLocationFilter('Anywhere');
                  setLanguageFilter('All languages');
                  setSentimentFilter('Any sentiment');
                }}
                className="text-[11px] text-ink-subtle dark:text-dark-muted hover:text-brand-700 dark:hover:text-brand-400 font-medium"
              >
                Reset
              </button>
            </div>

            {/* Date Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-darker dark:text-dark-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-ink-subtle" />
                <span>Date</span>
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full text-xs bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border rounded-lg px-3 py-2 text-ink dark:text-dark-text focus:outline-none focus:border-brand-600"
              >
                <option>Any time</option>
                <option>Past 24 hours</option>
                <option>Past 7 days</option>
                <option>Past 30 days</option>
                <option>Past 90 days</option>
              </select>
            </div>

            {/* Source Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-darker dark:text-dark-muted flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-ink-subtle" />
                <span>Source</span>
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full text-xs bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border rounded-lg px-3 py-2 text-ink dark:text-dark-text focus:outline-none focus:border-brand-600"
              >
                <option>All sources</option>
                <option>Verified news publishers</option>
                <option>Public social accounts</option>
                <option>Technical blogs</option>
                <option>Community forums</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-darker dark:text-dark-muted flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-ink-subtle" />
                <span>Location</span>
              </label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full text-xs bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border rounded-lg px-3 py-2 text-ink dark:text-dark-text focus:outline-none focus:border-brand-600"
              >
                <option>Anywhere</option>
                <option>Nigeria</option>
                <option>West Africa Regional</option>
                <option>Pan-African</option>
                <option>Global</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-darker dark:text-dark-muted flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-ink-subtle" />
                <span>Language</span>
              </label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full text-xs bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border rounded-lg px-3 py-2 text-ink dark:text-dark-text focus:outline-none focus:border-brand-600"
              >
                <option>All languages</option>
                <option>English</option>
                <option>French</option>
                <option>Hausa / Yoruba / Igbo</option>
              </select>
            </div>

            {/* Sentiment Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-darker dark:text-dark-muted flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-ink-subtle" />
                <span>Sentiment</span>
              </label>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="w-full text-xs bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border rounded-lg px-3 py-2 text-ink dark:text-dark-text focus:outline-none focus:border-brand-600"
              >
                <option>Any sentiment</option>
                <option>Positive</option>
                <option>Neutral</option>
                <option>Critical</option>
              </select>
            </div>

            {/* Save View Action */}
            <div className="pt-2 border-t border-surface-border dark:border-dark-border">
              <button
                onClick={() => setIsSavedView(!isSavedView)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  isSavedView 
                    ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300' 
                    : 'bg-surface dark:bg-dark-elevated hover:bg-surface-muted dark:hover:bg-dark-border border-surface-border dark:border-dark-border text-ink dark:text-dark-text'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSavedView ? 'fill-current text-brand-600 dark:text-brand-400' : 'text-ink-subtle'}`} />
                <span>{isSavedView ? 'View Saved' : 'Save this view'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results List Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-ink-subtle dark:text-dark-muted px-1">
            <span>Showing {filteredResults.length} representative results</span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-semibold text-ink dark:text-dark-text cursor-pointer focus:outline-none"
              >
                <option value="Most Relevant">Most Relevant</option>
                <option value="Most Recent">Most Recent</option>
                <option value="Highest Velocity">Highest Velocity</option>
              </select>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {filteredResults.length === 0 ? (
              <div className="p-12 text-center bg-surface dark:bg-dark-surface rounded-2xl border border-surface-border dark:border-dark-border text-ink-subtle dark:text-dark-muted text-xs">
                No results match the selected filters. Try broadening your criteria.
              </div>
            ) : (
              filteredResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectResult(item)}
                  className="group bg-surface dark:bg-dark-surface hover:bg-surface-subtle dark:hover:bg-dark-elevated p-5 rounded-2xl border border-surface-border dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-500/50 cursor-pointer transition-all shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-700 dark:text-brand-400">{item.source}</span>
                      <span className="text-ink-subtle dark:text-dark-subtle">· {item.date}</span>
                      <span className="px-2 py-0.5 rounded bg-surface-muted dark:bg-dark-elevated text-ink-darker dark:text-dark-muted text-[10px] font-semibold uppercase">
                        {item.channel}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      item.sentiment === 'Positive' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40' :
                      item.sentiment === 'Critical' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40' :
                      'bg-surface-muted dark:bg-dark-elevated text-ink-muted dark:text-dark-muted'
                    }`}>
                      {item.sentiment}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-base sm:text-lg text-ink-heading dark:text-dark-text group-hover:text-brand-800 dark:group-hover:text-brand-300 transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-ink-muted dark:text-dark-muted leading-relaxed line-clamp-2">
                    {item.excerpt}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-ink-subtle dark:text-dark-subtle border-t border-surface-border/50 dark:border-dark-border/60">
                    <div className="flex items-center gap-2">
                      {item.tags?.map(t => (
                        <span key={t} className="text-[11px] text-ink-subtle dark:text-dark-muted font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <span>{item.reach}</span>
                      <span className="text-brand-600 dark:text-brand-400 font-semibold group-hover:underline flex items-center gap-1">
                        Inspect
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
