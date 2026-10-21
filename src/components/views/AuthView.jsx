import React, { useState } from 'react';
import { 
  Shield, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  Database,
  Globe
} from 'lucide-react';

export default function AuthView({ onAuthenticate }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('Ada Okafor');
  const [email, setEmail] = useState('ada@sentinel.africa');
  const [password, setPassword] = useState('••••••••••••');
  const [confirmPassword, setConfirmPassword] = useState('••••••••••••');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [agreedTerms, setAgreedTerms] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuthenticate({ name: name || 'Ada Okafor', email });
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f7f5] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
      <div className="w-full max-w-6xl bg-surface rounded-3xl border border-surface-border shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[720px]">
        
        {/* Left Column: Brand & Context Preview (7 cols) */}
        <div className="lg:col-span-7 bg-brand-900 text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-700/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md">
              <Shield className="w-5 h-5 fill-current text-white/95" />
            </div>
            <div>
              <div className="font-display font-extrabold text-base tracking-wider">
                SENTINEL
              </div>
              <div className="text-[11px] text-brand-200 font-medium">
                Web Intelligence
              </div>
            </div>
          </div>

          {/* Middle Pitch & Live Preview Cards */}
          <div className="relative z-10 my-10 space-y-6">
            <div className="space-y-3">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-brand-800 text-brand-200 border border-brand-700">
                Continuous public-web discovery
              </span>
              <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-white tracking-tight leading-tight">
                Know what's being said. Understand what matters.
              </h1>
              <p className="text-sm text-brand-100/80 leading-relaxed max-w-lg">
                Search, organize and monitor relevant public information across news, websites, social discussions, blogs and forums.
              </p>
            </div>

            {/* Figma Mock Cards Preview */}
            <div className="space-y-2.5 max-w-md pt-2">
              <div className="p-3.5 rounded-xl bg-brand-800/80 border border-brand-700/60 backdrop-blur-md flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">MTN Nigeria</div>
                  <div className="text-[11px] text-brand-200">Network performance</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1 justify-end">
                    <TrendingUp className="w-3 h-3" />
                    <span>+18%</span>
                  </div>
                  <div className="text-[10px] text-brand-300">342 mentions</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-brand-800/60 border border-brand-700/40 backdrop-blur-md flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">New service initiative</div>
                  <div className="text-[11px] text-brand-200">127 mentions across 18 sources</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-400">+52%</div>
                  <div className="text-[10px] text-brand-300">Infrastructure</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-brand-300 px-1 pt-1 font-medium">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-brand-400" />
                  328 sources indexed
                </span>
                <span>Updated just now</span>
              </div>
            </div>
          </div>

          {/* Bottom Trust Badges */}
          <div className="relative z-10 pt-4 border-t border-brand-800/80 flex flex-wrap items-center gap-4 text-xs font-semibold text-brand-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Public-web intelligence
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Human-centered research
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Secure workspace
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Sign In / Sign Up Form (5 cols) */}
        <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between bg-surface">
          <div>
            {/* Header */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                {mode === 'signin' ? 'WELCOME BACK' : 'CREATE WORKSPACE'}
              </div>
              <h2 className="font-display font-extrabold text-2xl text-ink-heading">
                {mode === 'signin' ? 'Sign in to your workspace' : 'Start discovering what matters'}
              </h2>
              <p className="text-xs text-ink-muted">
                {mode === 'signin' 
                  ? 'Continue discovering and monitoring what matters online.' 
                  : 'Create your research workspace in less than a minute.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-darker mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Okafor"
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-muted border border-surface-border focus:border-brand-600 focus:bg-surface focus:outline-none rounded-xl text-ink"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink-darker mb-1.5">
                  Work email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ada@sentinel.africa"
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-muted border border-surface-border focus:border-brand-600 focus:bg-surface focus:outline-none rounded-xl text-ink"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink-darker">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[11px] text-brand-700 hover:underline font-medium">
                      Forgot password?
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Use at least 8 characters"
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-muted border border-surface-border focus:border-brand-600 focus:bg-surface focus:outline-none rounded-xl text-ink"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-darker mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Use at least 8 characters"
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-muted border border-surface-border focus:border-brand-600 focus:bg-surface focus:outline-none rounded-xl text-ink"
                  />
                </div>
              )}

              {mode === 'signin' ? (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-ink-muted">Keep me signed in on this device</span>
                </label>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-[11px] text-ink-muted">I agree to the Terms of Service and Privacy Policy</span>
                </label>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm rounded-xl shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {mode === 'signin' ? 'Sign in' : 'Create workspace'}
              </button>
            </form>

            {/* Social Continue */}
            <div className="mt-6 space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-surface-border w-full" />
                <span className="bg-surface px-3 text-[11px] text-ink-subtle uppercase font-semibold">
                  or continue with
                </span>
              </div>

              <button
                onClick={() => onAuthenticate({ name: 'Ada Okafor', email: 'ada@sentinel.africa' })}
                className="w-full py-2.5 px-4 bg-surface hover:bg-surface-muted border border-surface-border text-ink text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-2xs"
              >
                <span className="font-bold text-red-500">G</span>
                <span>Google</span>
              </button>
            </div>
          </div>

          {/* Bottom Switcher */}
          <div className="mt-8 text-center text-xs text-ink-muted pt-4 border-t border-surface-border">
            {mode === 'signin' ? (
              <span>
                Don't have a workspace?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-brand-700 hover:underline"
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have a workspace?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-bold text-brand-700 hover:underline"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
