import  { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Radio } from 'lucide-react';

export default function AddMonitorModal({ 
  isOpen, 
  onClose, 
  onCreated,
  initialTopic = '' 
}) {
  const [step, setStep] = useState(1);
  const [topicName, setTopicName] = useState(initialTopic || 'MTN Nigeria');
  const [keywords, setKeywords] = useState('MTN, 5G, broadband, telecom infrastructure');
  const [excludeKeywords, setExcludeKeywords] = useState('job vacancies, customer service complaints');
  
  const [sources, setSources] = useState({
    news: true,
    social: true,
    blogs: true,
    french: false
  });

  const [frequency, setFrequency] = useState('20 minutes');
  const [highVelocityAlert, setHighVelocityAlert] = useState(true);
  const [majorSourceAlert, setMajorSourceAlert] = useState(true);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Complete creation
      const initials = topicName
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'MO';

      const newMonitor = {
        id: `mon-${Date.now()}`,
        name: topicName,
        initials,
        category: 'Organisation',
        updatedAt: 'Just now',
        newActivity: 12,
        totalMentions: 12,
        frequency,
        status: 'Active',
        color: '#237a55',
        keywords: keywords.split(',').map(k => k.trim()),
        sentiment: 'Positive (100%)'
      };

      onCreated(newMonitor);
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-ink-heading/40 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl border border-surface-border dark:border-dark-border overflow-hidden z-10 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-border dark:border-dark-border flex items-start justify-between bg-surface-subtle dark:bg-dark-elevated">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                <Radio className="w-4 h-4" />
              </span>
              <h3 className="font-display font-bold text-lg text-ink-heading dark:text-dark-text">
                Create a monitor
              </h3>
            </div>
            <p className="mt-1 text-xs text-ink-muted dark:text-dark-muted">
              Track topics and receive updates as new public-web information appears.
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-ink-subtle dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface dark:hover:bg-dark-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-surface-border/60 dark:border-dark-border/60 bg-surface dark:bg-dark-surface flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-brand-600 text-white' : 'bg-surface-muted dark:bg-dark-elevated text-ink-subtle dark:text-dark-subtle'}`}>
              1
            </span>
            <span className={step === 1 ? 'text-brand-700 dark:text-brand-400 font-bold' : 'text-ink-subtle dark:text-dark-subtle'}>Topic</span>
          </div>
          <div className="h-0.5 w-12 bg-surface-border dark:bg-dark-border" />
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-brand-600 text-white' : 'bg-surface-muted dark:bg-dark-elevated text-ink-subtle dark:text-dark-subtle'}`}>
              2
            </span>
            <span className={step === 2 ? 'text-brand-700 dark:text-brand-400 font-bold' : 'text-ink-subtle dark:text-dark-subtle'}>Sources</span>
          </div>
          <div className="h-0.5 w-12 bg-surface-border dark:bg-dark-border" />
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 3 ? 'bg-brand-600 text-white' : 'bg-surface-muted dark:bg-dark-elevated text-ink-subtle dark:text-dark-subtle'}`}>
              3
            </span>
            <span className={step === 3 ? 'text-brand-700 dark:text-brand-400 font-bold' : 'text-ink-subtle dark:text-dark-subtle'}>Schedule</span>
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-5 flex-1">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-ink-darker dark:text-dark-text mb-1.5">
                  Topic name or entity
                </label>
                <input
                  type="text"
                  value={topicName}
                  onChange={e => setTopicName(e.target.value)}
                  placeholder="e.g. MTN Nigeria or Central Bank Policy"
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border focus:border-brand-600 dark:focus:border-brand-500 focus:bg-surface dark:focus:bg-dark-surface focus:outline-none rounded-lg text-ink dark:text-dark-text placeholder:text-ink-subtle dark:placeholder:text-dark-subtle"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-darker dark:text-dark-text mb-1.5">
                  Keywords to match (comma separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="e.g. 5G, fiber, infrastructure, broadband"
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border focus:border-brand-600 dark:focus:border-brand-500 focus:bg-surface dark:focus:bg-dark-surface focus:outline-none rounded-lg text-ink dark:text-dark-text placeholder:text-ink-subtle dark:placeholder:text-dark-subtle"
                />
                <p className="mt-1 text-[11px] text-ink-subtle dark:text-dark-subtle">
                  We will automatically include related synonyms and name variations.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-darker dark:text-dark-text mb-1.5">
                  Exclude terms (optional)
                </label>
                <input
                  type="text"
                  value={excludeKeywords}
                  onChange={e => setExcludeKeywords(e.target.value)}
                  placeholder="e.g. jobs, support tickets, spam"
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-muted dark:bg-dark-elevated border border-surface-border dark:border-dark-border focus:border-brand-600 dark:focus:border-brand-500 focus:bg-surface dark:focus:bg-dark-surface focus:outline-none rounded-lg text-ink dark:text-dark-text placeholder:text-ink-subtle dark:placeholder:text-dark-subtle"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="text-xs text-ink-subtle dark:text-dark-muted mb-2">
                Choose the public channels to include in continuous scanning:
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted/50 dark:bg-dark-elevated hover:bg-surface-muted dark:hover:bg-dark-border cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sources.news}
                  onChange={e => setSources({ ...sources, news: e.target.checked })}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <div className="text-xs font-semibold text-ink-heading dark:text-dark-text">News and media</div>
                  <div className="text-[11px] text-ink-muted dark:text-dark-muted">Public articles from national, regional and global media publications.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted/50 dark:bg-dark-elevated hover:bg-surface-muted dark:hover:bg-dark-border cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sources.social}
                  onChange={e => setSources({ ...sources, social: e.target.checked })}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <div className="text-xs font-semibold text-ink-heading dark:text-dark-text">Public social content</div>
                  <div className="text-[11px] text-ink-muted dark:text-dark-muted">Publicly accessible posts, discussions and viral mentions across X/Twitter and LinkedIn.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted/50 dark:bg-dark-elevated hover:bg-surface-muted dark:hover:bg-dark-border cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sources.blogs}
                  onChange={e => setSources({ ...sources, blogs: e.target.checked })}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <div className="text-xs font-semibold text-ink-heading dark:text-dark-text">Blogs and community forums</div>
                  <div className="text-[11px] text-ink-muted dark:text-dark-muted">Technical blogs, industry roundups, Nairaland, Reddit and public discourse boards.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted/50 dark:bg-dark-elevated hover:bg-surface-muted dark:hover:bg-dark-border cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sources.french}
                  onChange={e => setSources({ ...sources, french: e.target.checked })}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <div className="text-xs font-semibold text-ink-heading dark:text-dark-text">French-language West African results</div>
                  <div className="text-[11px] text-ink-muted dark:text-dark-muted">Include regional Francophone sources across Senegal, Côte d'Ivoire and Cameroon.</div>
                </div>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-ink-darker dark:text-dark-text mb-2">
                  Discovery scan interval
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {['20 minutes', '1 hour', 'Daily'].map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFrequency(freq)}
                      className={`
                        p-2.5 text-xs font-semibold rounded-lg border text-center transition-all
                        ${frequency === freq
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 shadow-2xs'
                          : 'border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-elevated text-ink-muted dark:text-dark-muted hover:border-surface-borderDark dark:hover:border-brand-500'}
                      `}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <div className="text-xs font-semibold text-ink-darker dark:text-dark-text">
                  Notification triggers
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted/50 dark:bg-dark-elevated cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-ink-heading dark:text-dark-text">High-velocity topic alerts</div>
                    <div className="text-[11px] text-ink-subtle dark:text-dark-muted">Alert when mentions grow more than 40% above baseline.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={highVelocityAlert}
                    onChange={e => setHighVelocityAlert(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted/50 dark:bg-dark-elevated cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-ink-heading dark:text-dark-text">Major publisher reports</div>
                    <div className="text-[11px] text-ink-subtle dark:text-dark-muted">Alert immediately when Tier-1 media publishes a story.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={majorSourceAlert}
                    onChange={e => setMajorSourceAlert(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-surface-border dark:border-dark-border bg-surface-subtle dark:bg-dark-elevated flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface dark:hover:bg-dark-surface rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text hover:bg-surface dark:hover:bg-dark-surface rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span>{step === 3 ? 'Start monitoring' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
