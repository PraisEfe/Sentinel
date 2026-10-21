import  { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Flame, 
  Layers, 
  Compass,
  Info
} from 'lucide-react';
import { STORY_CLUSTERS } from '../../data/mockData';

export default function IntelligenceView({ 
  onSelectCluster 
}) {
  const [activeTab, setActiveTab] = useState('Latest');

  const tabs = [
    { id: 'Latest', label: 'Latest', icon: Sparkles },
    { id: 'Trending', label: 'Trending', icon: Flame },
    { id: 'Most Mentioned', label: 'Most Mentioned', icon: Layers },
    { id: 'Emerging', label: 'Emerging', icon: Compass },
  ];

  const filteredClusters = STORY_CLUSTERS.filter(c => {
    if (activeTab === 'Latest') return true;
    return c.category === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink-heading dark:text-dark-text">
          Intelligence
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted dark:text-dark-muted mt-1">
          Explore the latest information discovered across your monitored topics.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border dark:border-dark-border pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all
                ${isActive 
                  ? 'bg-brand-600 text-white shadow-2xs' 
                  : 'text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface-muted dark:hover:bg-dark-elevated'}
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Info Callout Banner */}
      <div className="p-4 bg-brand-50/70 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800 rounded-2xl flex items-start gap-3 shadow-2xs">
        <div className="p-1.5 rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="text-xs sm:text-sm font-bold text-brand-900 dark:text-brand-200">
            Stories are grouped automatically
          </div>
          <p className="text-xs text-brand-800/80 dark:text-brand-300/80 leading-relaxed">
            Similar reports are combined so you can understand a story without reading the same information repeatedly.
          </p>
        </div>
      </div>

      {/* Active Tab Subhead Description */}
      <div className="flex items-center justify-between text-xs text-ink-subtle dark:text-dark-muted px-1">
        <span>
          {activeTab === 'Trending' && 'Stories with the fastest-growing mention velocity right now.'}
          {activeTab === 'Most Mentioned' && 'The largest conversations by total public mention volume.'}
          {activeTab === 'Emerging' && 'Early signals gaining momentum before they become widely discussed.'}
          {activeTab === 'Latest' && 'Chronological synthesis of newly verified story clusters.'}
        </span>
        <span className="font-semibold text-brand-700 dark:text-brand-400">
          {filteredClusters.length} story clusters
        </span>
      </div>

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredClusters.map((cluster) => (
          <div
            key={cluster.id}
            onClick={() => onSelectCluster(cluster)}
            className="group bg-surface dark:bg-dark-surface hover:bg-surface-subtle dark:hover:bg-dark-elevated p-6 rounded-2xl border border-surface-border dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-500/50 cursor-pointer transition-all shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-md uppercase bg-brand-100 dark:bg-brand-900/60 text-brand-800 dark:text-brand-300">
                  {cluster.clusterType}
                </span>
                <span className="text-xs text-ink-subtle dark:text-dark-subtle font-medium">
                  Updated {cluster.updatedAt}
                </span>
              </div>

              <h2 className="font-display font-bold text-lg sm:text-xl text-ink-heading dark:text-dark-text group-hover:text-brand-800 dark:group-hover:text-brand-300 transition-colors leading-snug">
                {cluster.title}
              </h2>

              <p className="text-xs sm:text-sm text-ink-muted dark:text-dark-muted leading-relaxed line-clamp-3">
                {cluster.summary}
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t border-surface-border/60 dark:border-dark-border/60">
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {cluster.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 text-[11px] rounded bg-surface-muted dark:bg-dark-elevated text-ink-darker dark:text-dark-muted font-medium">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Metrics */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-4 text-ink-subtle dark:text-dark-subtle">
                  <span><strong className="text-ink dark:text-dark-text font-semibold">{cluster.mentions}</strong> mentions</span>
                  <span><strong className="text-ink dark:text-dark-text font-semibold">{cluster.sourcesCount}</strong> sources</span>
                </div>

                <div className="flex items-center gap-1 font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-md border border-brand-200/50 dark:border-brand-800/40">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{cluster.velocity}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
