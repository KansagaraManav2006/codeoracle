import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { navigateTo } from '../../utils/navigation';
import { AuthVisualPanel } from './AuthVisualPanel';
import { GoogleAuthButton } from './GoogleAuthButton';

export const SignInPage: React.FC = () => {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localErrors, setLocalErrors] = useState<{ email?: string; password?: string }>({});
  const [oauthErrorMsg, setOauthErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      if (err === 'google_access_denied') {
        setOauthErrorMsg('Google Sign-In was cancelled.');
      } else if (err === 'unconfigured') {
        setOauthErrorMsg('Google Sign-In is not configured on this server.');
      } else if (err === 'unverified_email') {
        setOauthErrorMsg('The email address associated with your Google account is unverified.');
      } else if (err === 'invalid_state') {
        setOauthErrorMsg('Invalid authorization session. Please try again.');
      } else {
        setOauthErrorMsg(`Google Sign-In failed: ${err.replace(/_/g, ' ')}`);
      }
    }
  }, []);

  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};
    const emailClean = email.trim();
    if (!emailClean) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    }

    setLocalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const ok = await login(email.trim(), password);
      if (ok) {
        navigateTo('/workspace');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F5F1E9] text-[#181715]">
      {/* Visual Panel: ~55% on desktop */}
      <div className="hidden lg:block lg:w-[55%] min-h-screen sticky top-0 h-screen">
        <AuthVisualPanel
          headline="Pick up where your code left off."
          subheadline="Return to your projects, insights, and modernization plans."
          activeMode="signin"
        />
      </div>

      {/* Mobile brand illustration banner */}
      <div className="lg:hidden bg-[#181715] text-[#FFFDFC] p-6 pb-8 border-b border-[#3B3733]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2.5 font-display font-bold text-base text-[#FFFDFC]"
          >
            <div className="w-8 h-8 rounded-lg bg-[#23211E] border border-[#3B3733] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <path d="M16 6L25 11.2V20.8L16 26L7 20.8V11.2L16 6Z" stroke="#4C4FD6" strokeWidth="2.2" strokeLinejoin="round"/>
                <circle cx="16" cy="16" r="3.5" fill="#4C4FD6"/>
              </svg>
            </div>
            <span>CodeOracle</span>
          </button>
          <button
            onClick={() => navigateTo('/')}
            className="text-xs text-[#C8BEB0] hover:text-[#FFFDFC]"
          >
            ← Home
          </button>
        </div>
        <h2 className="font-display text-xl font-bold text-[#FFFDFC] mb-1">
          Pick up where your code left off.
        </h2>
        <p className="text-xs text-[#C8BEB0]">
          Return to your projects, insights, and modernization plans.
        </p>
      </div>

      {/* Form Panel: ~45% on desktop */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 min-h-[calc(100vh-140px)] lg:min-h-screen">
        <div className="w-full max-w-[420px]">
          {/* Header navigation back on desktop */}
          <div className="hidden lg:flex items-center justify-between mb-8">
            <button
              onClick={() => navigateTo('/')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#5C554D] hover:text-[#181715] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to overview
            </button>
            <span className="text-xs text-[#5C554D]">
              New to CodeOracle?{' '}
              <button
                onClick={() => navigateTo('/register')}
                className="font-semibold text-[#4C4FD6] hover:text-[#3E41B8] underline underline-offset-4"
              >
                Create account
              </button>
            </span>
          </div>

          <div className="mb-6">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181715] tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-[#5C554D] mt-1.5">
              Enter your credentials to access your private codebases.
            </p>
          </div>

          {/* Server / OAuth Error Alert */}
          {(error || oauthErrorMsg) && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-[#FDF0F0] border border-[#F5B8B9] text-[#B52628] text-xs flex items-start gap-2.5 animate-fade-in"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="flex-1">{error || oauthErrorMsg}</span>
            </div>
          )}

          {/* Social Sign-in Options */}
          <div className="mb-5">
            <GoogleAuthButton mode="signin" />
          </div>

          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-[#C8BEB0]" />
            <span className="absolute bg-[#F5F1E9] px-3 text-[11px] font-mono uppercase tracking-wider text-[#877D70]">
              or with email
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="signin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#3B3733] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (localErrors.email) setLocalErrors((prev) => ({ ...prev, email: undefined }));
                }}
                disabled={isSubmitting}
                placeholder="developer@company.com"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDFC] border text-sm text-[#181715] placeholder:text-[#A39888] focus:outline-none focus:ring-2 focus:ring-[#4C4FD6] transition-all shadow-sm ${
                  localErrors.email ? 'border-[#D9383A] bg-[#FDF0F0]/30' : 'border-[#C8BEB0] hover:border-[#A39888]'
                }`}
                aria-invalid={!!localErrors.email}
                aria-describedby={localErrors.email ? 'signin-email-error' : undefined}
              />
              {localErrors.email && (
                <p id="signin-email-error" className="text-xs text-[#D9383A] mt-1 font-medium">
                  {localErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="signin-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#3B3733]"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="signin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localErrors.password) setLocalErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                  className={`w-full pl-3.5 pr-11 py-2.5 rounded-xl bg-[#FFFDFC] border text-sm text-[#181715] placeholder:text-[#A39888] focus:outline-none focus:ring-2 focus:ring-[#4C4FD6] transition-all shadow-sm ${
                    localErrors.password ? 'border-[#D9383A] bg-[#FDF0F0]/30' : 'border-[#C8BEB0] hover:border-[#A39888]'
                  }`}
                  aria-invalid={!!localErrors.password}
                  aria-describedby={localErrors.password ? 'signin-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5C554D] hover:text-[#181715] rounded-md transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {localErrors.password && (
                <p id="signin-password-error" className="text-xs text-[#D9383A] mt-1 font-medium">
                  {localErrors.password}
                </p>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-white font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4C4FD6]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Secondary helper info */}
          <div className="mt-8 pt-6 border-t border-[#C8BEB0]/60 text-center">
            <p className="text-xs text-[#5C554D]">
              Want to inspect a codebase without an account?{' '}
              <button
                onClick={() => navigateTo('/workspace')}
                className="font-semibold text-[#181715] hover:text-[#4C4FD6] underline underline-offset-4"
              >
                Explore the public demo
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
