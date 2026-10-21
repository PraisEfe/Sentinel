import  { useState } from 'react';
import { 


  Globe, 
  Share2, 
  Newspaper,
  ArrowUpRight
} from 'lucide-react';
import { ANALYTICS_DATA } from '../../data/mockData';

export default function AnalyticsView() {
  const [timeframe, setTimeframe] = useState('24 hours');
  const data = ANALYTICS_DATA[timeframe] || ANALYTICS_DATA['24 hours'];

  const timeframes = ['24 hours', '7 days', '30 days', '90 days'];

  // Normalize volume values for bar chart heights
  const maxVolume = Math.max(...data.volumeValues);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink-heading dark:text-dark-text">
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-dark-muted mt-1">
            Understand patterns across information collected from your searches and monitors.
          </p>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1 bg-surface dark:bg-dark-surface p-1.5 rounded-xl border border-surface-border dark:border-dark-border shadow-2xs self-start sm:self-auto">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${timeframe === tf 
                  ? 'bg-brand-600 text-white shadow-2xs' 
                  : 'text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface-muted dark:hover:bg-dark-elevated'}
              `}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Subhead */}
      <div className="text-xs text-ink-subtle dark:text-dark-muted px-1">
        All monitored topics · <span className="font-medium text-ink-darker dark:text-dark-text">{data.comparisonText}</span>
      </div>

      {/* Main Grid: Mention Volume Chart & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mention Volume Chart */}
        <div className="lg:col-span-2 bg-surface dark:bg-dark-surface rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle dark:text-dark-muted">
                Mention Volume · {timeframe}
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-ink-heading dark:text-dark-text">
                  {data.mentionVolume}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-md border border-brand-200/50 dark:border-brand-800/40">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {data.growth}
                </span>
              </div>
              <p className="text-xs text-ink-muted dark:text-dark-muted">
                Public mentions across {data.activeSources} sources
              </p>
            </div>
          </div>

          {/* Interactive Bar Chart */}
          <div className="pt-6 space-y-3">
            <div className="h-48 flex items-end gap-2 sm:gap-4 justify-between border-b border-surface-border dark:border-dark-border pb-2">
              {data.volumeValues.map((val, idx) => {
                const heightPercent = Math.round((val / maxVolume) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-ink-heading dark:bg-dark-elevated text-white dark:text-dark-text text-[10px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap shadow border border-transparent dark:border-dark-border">
                      {val.toLocaleString()} mentions
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-full bg-brand-100 dark:bg-brand-900/40 group-hover:bg-brand-600 dark:group-hover:bg-brand-500 rounded-t-md transition-all duration-300"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Labels */}
            <div className="flex items-center justify-between text-[11px] text-ink-subtle dark:text-dark-muted font-medium">
              {data.timeLabels.map((lbl, idx) => (
                <span key={idx} className="text-center flex-1">{lbl}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Distribution & Tone */}
        <div className="space-y-6">
          {/* Source Distribution */}
          <div className="bg-surface dark:bg-dark-surface rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-xs space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle dark:text-dark-muted">
                Source Distribution
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display font-extrabold text-2xl text-ink-heading dark:text-dark-text">
                  {data.activeSources}
                </span>
                <span className="text-xs text-ink-muted dark:text-dark-muted">Active sources</span>
              </div>
            </div>

            {/* Source percentage bars */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-ink-darker dark:text-dark-text">
                  <span className="flex items-center gap-1.5">
                    <Newspaper className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    <span>News</span>
                  </span>
                  <span>{data.sources.news}%</span>
                </div>
                <div className="h-2 w-full bg-surface-muted dark:bg-dark-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-brand-600 dark:bg-brand-500 rounded-full" style={{ width: `${data.sources.news}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-ink-darker dark:text-dark-text">
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Social</span>
                  </span>
                  <span>{data.sources.social}%</span>
                </div>
                <div className="h-2 w-full bg-surface-muted dark:bg-dark-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.sources.social}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-ink-darker dark:text-dark-text">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-500" />
                    <span>Web & Blogs</span>
                  </span>
                  <span>{data.sources.web}%</span>
                </div>
                <div className="h-2 w-full bg-surface-muted dark:bg-dark-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${data.sources.web}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Discussion Tone */}
          <div className="bg-surface dark:bg-dark-surface rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-xs space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle dark:text-dark-muted">
                Discussion Tone
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display font-extrabold text-2xl text-ink-heading dark:text-dark-text">
                  {data.tone.positive}%
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Mostly positive</span>
              </div>
            </div>

            {/* Tone visual bar */}
            <div className="space-y-2 pt-2">
              <div className="h-2.5 w-full bg-surface-muted dark:bg-dark-elevated rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${data.tone.positive}%` }} />
                <div className="bg-slate-300 dark:bg-dark-border h-full" style={{ width: `${data.tone.neutral}%` }} />
                <div className="bg-rose-500 h-full" style={{ width: `${data.tone.negative}%` }} />
              </div>

              <div className="flex items-center justify-between text-[11px] text-ink-subtle dark:text-dark-muted pt-1 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Positive {data.tone.positive}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Neutral {data.tone.neutral}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Critical {data.tone.negative}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
