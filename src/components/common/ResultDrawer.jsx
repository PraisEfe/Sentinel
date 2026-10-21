import React from 'react';
import { 
  X, 
  ExternalLink, 
  Radio, 
  TrendingUp, 
  Share2, 
  Calendar, 
  User, 
  Layers, 
  CheckCircle2, 
  Globe 
} from 'lucide-react';

export default function ResultDrawer({ 
  item, 
  onClose, 
  onAddMonitor 
}) {
  if (!item) return null;

  const isStoryCluster = !!item.clusterType;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-ink-heading/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-lg bg-surface dark:bg-dark-surface h-full shadow-2xl flex flex-col z-10 border-l border-surface-border dark:border-dark-border animate-in slide-in-from-right duration-300 ease-out">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-surface-border dark:border-dark-border flex items-center justify-between bg-surface-subtle dark:bg-dark-elevated">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-md uppercase bg-brand-100 dark:bg-brand-900/70 text-brand-700 dark:text-brand-300">
              {isStoryCluster ? 'Story Cluster' : `${item.channel || 'Public'} Result`}
            </span>
            <span className="text-xs text-ink-subtle dark:text-dark-muted">
              {item.updatedAt || item.date}
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface dark:hover:bg-dark-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Metadata */}
          <div>
            <h2 className="font-display font-bold text-xl text-ink-heading dark:text-dark-text leading-snug">
              {item.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted dark:text-dark-muted">
              {item.source && (
                <div className="flex items-center gap-1.5 font-medium text-ink dark:text-dark-text">
                  <Globe className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span>{item.source}</span>
                </div>
              )}
              {item.author && (
                <div className="flex items-center gap-1 text-ink-subtle dark:text-dark-subtle">
                  <User className="w-3.5 h-3.5" />
                  <span>{item.author}</span>
                </div>
              )}
              {item.reach && (
                <div className="px-2 py-0.5 rounded bg-surface-muted dark:bg-dark-elevated text-ink-darker dark:text-dark-muted text-[11px] font-medium border border-surface-border dark:border-dark-border">
                  {item.reach}
                </div>
              )}
            </div>
          </div>

          {/* Metrics if Story Cluster */}
          {isStoryCluster && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-brand-50/60 dark:bg-dark-elevated border border-brand-100 dark:border-dark-border rounded-xl">
              <div>
                <div className="text-xs text-ink-subtle dark:text-dark-muted font-medium">Mentions</div>
                <div className="text-lg font-bold text-brand-800 dark:text-brand-300">{item.mentions}</div>
              </div>
              <div>
                <div className="text-xs text-ink-subtle dark:text-dark-muted font-medium">Sources</div>
                <div className="text-lg font-bold text-ink-heading dark:text-dark-text">{item.sourcesCount}</div>
              </div>
              <div>
                <div className="text-xs text-ink-subtle dark:text-dark-muted font-medium">Velocity</div>
                <div className="text-lg font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{item.velocity}</span>
                </div>
              </div>
            </div>
          )}

          {/* Excerpt / Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-dark-subtle">
              {isStoryCluster ? 'Cluster Synthesis' : 'Summary'}
            </h4>
            <p className="text-sm text-ink-darker dark:text-dark-muted leading-relaxed">
              {item.summary || item.excerpt}
            </p>
          </div>

          {/* Grouped Articles if Story Cluster */}
          {isStoryCluster && item.articles && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-dark-subtle flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Combined Reports ({item.articles.length})</span>
              </h4>
              <div className="space-y-2.5">
                {item.articles.map((art, idx) => (
                  <div key={idx} className="p-3 bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-ink-subtle dark:text-dark-subtle text-[11px]">
                      <span className="font-semibold text-brand-700 dark:text-brand-400">{art.source}</span>
                      <span>{art.time}</span>
                    </div>
                    <div className="text-ink dark:text-dark-text font-medium">{art.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {item.tags && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-dark-subtle">
                Key Entities & Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(t => (
                  <span key={t} className="px-2.5 py-1 text-xs rounded-md bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border text-ink-darker dark:text-dark-muted font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Action Bar */}
        <div className="p-4 border-t border-surface-border dark:border-dark-border bg-surface-subtle dark:bg-dark-elevated flex items-center gap-3">
          <button
            onClick={() => {
              onAddMonitor({
                name: item.title,
                keywords: item.tags || [item.title]
              });
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-medium text-xs sm:text-sm rounded-lg shadow-sm transition-colors"
          >
            <Radio className="w-4 h-4" />
            <span>Monitor this topic</span>
          </button>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-surface-border dark:border-dark-border hover:border-surface-borderDark dark:hover:border-brand-500 bg-surface dark:bg-dark-surface text-ink dark:text-dark-text text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              <span>Original link</span>
              <ExternalLink className="w-3.5 h-3.5 text-ink-subtle dark:text-dark-muted" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
