import React, { useEffect, useState } from 'react';

interface GoogleAuthButtonProps {
  mode: 'signin' | 'register';
  redirectUrl?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ mode, redirectUrl = '/workspace' }) => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showSetupNotice, setShowSetupNotice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/google/status')
      .then((res) => {
        if (!res.ok) throw new Error('Status check failed');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setIsConfigured(Boolean(data.configured));
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsConfigured(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isConfigured === false) {
      setShowSetupNotice(true);
      return;
    }

    if (isConfigured === true) {
      setIsLoading(true);
      window.location.href = `/api/auth/google/login?redirect_url=${encodeURIComponent(redirectUrl)}`;
    }
  };

  const label = mode === 'signin' ? 'Continue with Google' : 'Sign up with Google';

  return (
    <div className="w-full space-y-2.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl bg-[#FFFDFC] hover:bg-[#F5F1E9] text-[#181715] font-medium text-sm border border-[#C8BEB0] hover:border-[#A39888] transition-all shadow-sm flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4C4FD6]"
        aria-label={label}
      >
        {/* Google 'G' Logo SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{label}</span>
      </button>

      {showSetupNotice && (
        <div
          role="status"
          className="p-3 rounded-xl bg-[#F4F1EA] border border-[#D5CEBF] text-[#3B3733] text-xs space-y-1.5 animate-fade-in"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#181715]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Google Sign-In Pending Configuration</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSetupNotice(false)}
              className="text-[#877D70] hover:text-[#181715] text-sm leading-none"
              aria-label="Dismiss setup notice"
            >
              ×
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-[#5C554D]">
            Google OAuth is not configured on this environment yet. To enable it, provide{' '}
            <code className="bg-[#EAE4D7] px-1 py-0.5 rounded text-[10px] text-[#181715]">GOOGLE_CLIENT_ID</code> and{' '}
            <code className="bg-[#EAE4D7] px-1 py-0.5 rounded text-[10px] text-[#181715]">GOOGLE_CLIENT_SECRET</code> in{' '}
            <code className="bg-[#EAE4D7] px-1 py-0.5 rounded text-[10px] text-[#181715]">backend/.env</code>.
          </p>
          <p className="text-[11px] text-[#5C554D]">
            In the meantime, please use the email and password form below.
          </p>
        </div>
      )}
    </div>
  );
};
