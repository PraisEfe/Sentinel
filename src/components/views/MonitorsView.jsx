import  { useState } from 'react';
import { 

  Plus, 
  CheckCircle2, 
  Search, 
  Trash2, 
  ChevronRight
} from 'lucide-react';
import { INITIAL_MONITORS } from '../../data/mockData';

export default function MonitorsView({ 
  monitors = INITIAL_MONITORS, 
  onOpenAddMonitor, 
  onSelectMonitor,
  onDeleteMonitor,
  successBanner = null 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMonitors = monitors.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Success Notification Banner (matching Frame 'Created' in Figma) */}
      {successBanner && (
        <div className="p-4 bg-brand-50 dark:bg-brand-950/80 border-2 border-brand-200 dark:border-brand-800 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-brand-900 dark:text-brand-200 font-semibold shadow-xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-brand-600 text-white">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <span>{successBanner}</span>
          </div>
          <span className="text-xs text-brand-700 dark:text-brand-400 font-medium">Scanning live now</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink-heading dark:text-dark-text">
            Monitors
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-dark-muted mt-1">
            Track topics and receive updates as new information appears.
          </p>
        </div>

        <button
          onClick={onOpenAddMonitor}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Plus className="w-4 h-4" />
          <span>Add monitor</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface dark:bg-dark-surface rounded-2xl p-5 border border-surface-border dark:border-dark-border shadow-2xs space-y-1">
          <div className="text-2xl font-bold font-display text-ink-heading dark:text-dark-text">
            {monitors.length}
          </div>
          <div className="text-xs font-semibold text-ink-muted dark:text-dark-muted">
            Active monitors
          </div>
          <div className="text-[11px] text-brand-700 dark:text-brand-400 font-medium">
            100% operational
          </div>
        </div>

        <div className="bg-surface dark:bg-dark-surface rounded-2xl p-5 border border-surface-border dark:border-dark-border shadow-2xs space-y-1">
          <div className="text-2xl font-bold font-display text-ink-heading dark:text-dark-text">
            558
          </div>
          <div className="text-xs font-semibold text-ink-muted dark:text-dark-muted">
            New mentions today
          </div>
          <div className="text-[11px] text-ink-subtle dark:text-dark-subtle">
            Across news, social & forums
          </div>
        </div>

        <div className="bg-surface dark:bg-dark-surface rounded-2xl p-5 border border-surface-border dark:border-dark-border shadow-2xs space-y-1">
          <div className="text-2xl font-bold font-display text-ink-heading dark:text-dark-text">
            6m
          </div>
          <div className="text-xs font-semibold text-ink-muted dark:text-dark-muted">
            Average discovery time
          </div>
          <div className="text-[11px] text-ink-subtle dark:text-dark-subtle">
            Sub-10 minute indexing SLA
          </div>
        </div>

        <div className="bg-brand-50 dark:bg-brand-950/50 rounded-2xl p-5 border border-brand-200/80 dark:border-brand-800 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-600 dark:bg-brand-400"></span>
            </span>
            <span className="text-xs font-bold text-brand-900 dark:text-brand-200">Live Health</span>
          </div>
          <div className="text-xs text-brand-800 dark:text-brand-300 font-medium">
            All monitors are scanning normally
          </div>
        </div>
      </div>

      {/* Search / Filter bar */}
      <div className="flex items-center justify-between gap-4 bg-surface dark:bg-dark-surface p-3 rounded-2xl border border-surface-border dark:border-dark-border shadow-2xs">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-ink-subtle dark:text-dark-muted ml-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter active monitors..."
            className="w-full bg-transparent text-xs text-ink dark:text-dark-text placeholder:text-ink-subtle dark:placeholder:text-dark-subtle focus:outline-none"
          />
        </div>
        <div className="text-xs text-ink-subtle dark:text-dark-muted hidden sm:block">
          Discovery interval: <span className="font-semibold text-ink dark:text-dark-text">every 20m</span>
        </div>
      </div>

      {/* Monitors Table */}
      <div className="bg-surface dark:bg-dark-surface rounded-2xl border border-surface-border dark:border-dark-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle dark:bg-dark-elevated border-b border-surface-border dark:border-dark-border text-ink-subtle dark:text-dark-muted uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Monitor</th>
                <th className="px-6 py-3.5">New Activity</th>
                <th className="px-6 py-3.5">Total Mentions</th>
                <th className="px-6 py-3.5">Frequency</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60 dark:divide-dark-border/60">
              {filteredMonitors.map((mon) => (
                <tr 
                  key={mon.id} 
                  className="hover:bg-surface-subtle dark:hover:bg-dark-elevated transition-colors group cursor-pointer"
                  onClick={() => onSelectMonitor(mon.name)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-xl font-display font-bold text-xs text-white flex items-center justify-center shadow-2xs shrink-0"
                        style={{ backgroundColor: mon.color || '#237a55' }}
                      >
                        {mon.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-ink dark:text-dark-text group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                          {mon.name}
                        </div>
                        <div className="text-[11px] text-ink-subtle dark:text-dark-muted">
                          {mon.category} · Updated {mon.updatedAt}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-100 dark:bg-brand-900/50 text-brand-800 dark:text-brand-300">
                      {mon.newActivity} new
                    </span>
                  </td>

                  <td className="px-6 py-4 font-semibold text-ink-heading dark:text-dark-text">
                    {mon.totalMentions.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-ink-muted dark:text-dark-muted">
                    {mon.frequency}
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{mon.status}</span>
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDeleteMonitor && onDeleteMonitor(mon.id)}
                        className="p-1.5 text-ink-subtle dark:text-dark-muted hover:text-signal-critical hover:bg-surface dark:hover:bg-dark-surface rounded-lg transition-colors"
                        title="Remove monitor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelectMonitor(mon.name)}
                        className="p-1.5 text-brand-600 dark:text-brand-400 hover:text-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                        title="Inspect intelligence"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
