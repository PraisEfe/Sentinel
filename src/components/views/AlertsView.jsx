import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Settings, 
  Check, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ALERTS_DATA } from '../../data/mockData';

export default function AlertsView({ 
  onNavigateSettings, 
  onInspectTopic 
}) {
  const [alerts, setAlerts] = useState(ALERTS_DATA);
  const [priorityFilter, setPriorityFilter] = useState('All');

  const filterTabs = ['All', 'Critical', 'High', 'Normal'];

  const filteredAlerts = alerts.filter(a => {
    if (priorityFilter === 'All') return true;
    return a.priority === priorityFilter;
  });

  const unreadCount = alerts.filter(a => a.isUnread).length;

  const handleMarkAllRead = () => {
    setAlerts(alerts.map(a => ({ ...a, isUnread: false })));
  };

  const handleToggleRead = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, isUnread: !a.isUnread } : a));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink-heading dark:text-dark-text">
            Alerts
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-dark-muted mt-1">
            Updates generated from the searches and topics you monitor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-brand-700 dark:text-brand-300 hover:text-brand-800 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-dark-surface hover:bg-surface-muted dark:hover:bg-dark-elevated border border-surface-border dark:border-dark-border transition-colors shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-800 dark:text-brand-200 rounded-full text-xs font-semibold">
            <span>Unread</span>
            <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]">
              {unreadCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border dark:border-dark-border pb-2">
        {filterTabs.map(tab => {
          const isActive = priorityFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setPriorityFilter(tab)}
              className={`
                px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all
                ${isActive 
                  ? 'bg-brand-600 text-white shadow-2xs' 
                  : 'text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface-muted dark:hover:bg-dark-elevated'}
              `}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Alerts list + Notification Digest Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Alerts Feed */}
        <div className="lg:col-span-2 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center bg-surface dark:bg-dark-surface rounded-2xl border border-surface-border dark:border-dark-border text-xs text-ink-subtle dark:text-dark-muted">
              No alerts matching priority "{priorityFilter}".
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => onInspectTopic && onInspectTopic(alert.topic)}
                className={`
                  p-5 rounded-2xl border transition-all cursor-pointer shadow-xs group flex items-start justify-between gap-4
                  ${alert.isUnread 
                    ? 'bg-surface dark:bg-dark-surface border-surface-border dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-500/50' 
                    : 'bg-surface-subtle/80 dark:bg-dark-surface/50 border-surface-border/60 dark:border-dark-border/40 opacity-75'}
                `}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    {/* Priority Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      alert.priority === 'Critical' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40' :
                      alert.priority === 'High' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40' :
                      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                    }`}>
                      {alert.priority}
                    </span>

                    <span className="text-xs text-ink-subtle dark:text-dark-subtle flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{alert.timeAgo}</span>
                    </span>

                    {alert.isUnread && (
                      <span className="w-2 h-2 rounded-full bg-brand-500" />
                    )}
                  </div>

                  <h3 className="font-display font-bold text-sm sm:text-base text-ink-heading dark:text-dark-text group-hover:text-brand-800 dark:group-hover:text-brand-300 transition-colors leading-snug">
                    {alert.title}
                  </h3>

                  <p className="text-xs text-ink-muted dark:text-dark-muted leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="pt-1 text-[11px] text-brand-700 dark:text-brand-400 font-semibold group-hover:underline">
                    Topic: {alert.topic} →
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleRead(alert.id);
                  }}
                  className="p-1 text-ink-subtle dark:text-dark-muted hover:text-ink dark:hover:text-dark-text shrink-0"
                  title={alert.isUnread ? 'Mark read' : 'Mark unread'}
                >
                  <CheckCircle2 className={`w-4 h-4 ${alert.isUnread ? 'text-surface-border dark:text-dark-border hover:text-brand-600' : 'text-brand-600 dark:text-brand-400'}`} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right 1 Col: Notification Settings & Digest Status */}
        <div className="space-y-4">
          <div className="bg-surface dark:bg-dark-surface rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-heading dark:text-dark-text">
              <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Notification Digest</span>
            </div>

            <div className="p-3.5 bg-brand-50/70 dark:bg-brand-950/60 rounded-xl border border-brand-100 dark:border-brand-800 text-xs space-y-1">
              <div className="font-bold text-brand-900 dark:text-brand-200">
                Notification digest: every 20 minutes
              </div>
              <p className="text-brand-800/80 dark:text-brand-300/80 leading-relaxed text-[11px]">
                You can change the frequency for individual monitors from their settings.
              </p>
            </div>

            <div className="text-xs text-ink-muted dark:text-dark-muted leading-relaxed">
              Alerts summarize public mentions matching your keyword thresholds and high-velocity spikes across West Africa and international sources.
            </div>

            <button
              onClick={onNavigateSettings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-muted dark:bg-dark-elevated hover:bg-surface-hover dark:hover:bg-dark-border border border-surface-border dark:border-dark-border text-ink dark:text-dark-text text-xs font-semibold rounded-xl transition-colors shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Notification settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
