import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navigateTo } from '../../utils/navigation';

interface LandingNavbarProps {
  onAnalyzeClick: () => void;
  onTryDemoClick: () => void;
  isLoading?: boolean;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onAnalyzeClick,
  onTryDemoClick,
  isLoading = false,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pt-3 pointer-events-none">
      <nav
        className={`pointer-events-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 rounded-2xl transition-all duration-300 ${
          scrolled
            ? 'bg-[#FFFDFC]/95 backdrop-blur-md shadow-md border border-[#C8BEB0]'
            : 'bg-[#FFFDFC]/80 backdrop-blur-sm shadow-xs border border-[#C8BEB0]/60'
        } max-w-[1140px] w-full`}
        aria-label="Main Navigation"
      >
        {/* Brand */}
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            navigateTo('/');
          }}
          className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4C4FD6] rounded-xl px-1 py-0.5"
        >
          <div className="w-8 h-8 rounded-xl bg-[#181715] flex items-center justify-center text-white shadow-xs transition-transform duration-200 group-hover:scale-105 border border-[#3B3733]">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <path d="M16 6L25 11.2V20.8L16 26L7 20.8V11.2L16 6Z" stroke="#4C4FD6" strokeWidth="2.2" strokeLinejoin="round"/>
              <circle cx="16" cy="16" r="3.5" fill="#4C4FD6"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm tracking-tight text-[#181715]">CodeOracle</span>
            <span className="text-[10px] text-[#5C554D] -mt-1 hidden sm:inline font-mono">Architecture Engine</span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#3B3733]">
          <button
            onClick={() => scrollToSection('features')}
            className="hover:text-[#4C4FD6] transition-colors focus:outline-none"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-[#4C4FD6] transition-colors focus:outline-none"
          >
            How it works
          </button>
          <button
            onClick={() => scrollToSection('preview')}
            className="hover:text-[#4C4FD6] transition-colors focus:outline-none"
          >
            Preview
          </button>
        </div>

        {/* CTA & Auth Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateTo('/workspace')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#181715] bg-[#ECE5DA] hover:bg-[#E7DFD3] border border-[#C8BEB0]/60 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#4C4FD6]" />
                <span className="max-w-[120px] truncate">{user?.email}</span>
              </button>
              <button
                onClick={() => logout()}
                title="Sign out"
                className="p-1.5 rounded-xl text-[#5C554D] hover:text-[#D9383A] hover:bg-[#FDF0F0] border border-transparent hover:border-[#F5B8B9] transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateTo('/signin')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#3B3733] hover:text-[#181715] transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => navigateTo('/register')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#4C4FD6] bg-[#EAE9FB] hover:bg-[#DFDCFA] border border-[#4C4FD6]/30 transition-all shadow-2xs"
              >
                Get started
              </button>
            </div>
          )}

          <div className="h-4 w-px bg-[#C8BEB0]" />

          <button
            onClick={onAnalyzeClick}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#181715] bg-[#ECE5DA] hover:bg-[#E7DFD3] border border-[#C8BEB0]/60 transition-all disabled:opacity-50"
          >
            <span>Analyze</span>
          </button>

          <button
            onClick={onTryDemoClick}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#181715] bg-[#FFFDFC] hover:bg-[#ECE5DA] border border-[#C8BEB0] transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B88228]" />
            <span>Demo</span>
          </button>

          <button
            onClick={() => navigateTo('/workspace')}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#FFFDFC] bg-[#4C4FD6] hover:bg-[#3E41B8] shadow-sm transition-all hover:shadow active:scale-[0.98] disabled:opacity-50"
          >
            <span>Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-[#181715] hover:bg-[#ECE5DA] border border-[#C8BEB0]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4C4FD6]"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-[#181715]" />}
          </button>
        </div>
      </nav>

      {/* Accessible Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto absolute top-16 left-4 right-4 bg-[#FFFDFC] rounded-2xl border border-[#C8BEB0] shadow-xl p-5 md:hidden space-y-4 animate-fade-in">
          <div className="space-y-2 border-b border-[#ECE5DA] pb-3 text-sm font-semibold text-[#181715]">
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-1.5 hover:text-[#4C4FD6]"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-1.5 hover:text-[#4C4FD6]"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="block w-full text-left py-1.5 hover:text-[#4C4FD6]"
            >
              Preview
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="text-xs text-[#5C554D] font-mono truncate">
                  Signed in as: {user?.email}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('/workspace');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#4C4FD6] text-[#FFFDFC] text-xs font-semibold text-center"
                >
                  Open Workspace
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-xl border border-[#D9383A]/30 text-[#D9383A] text-xs font-semibold text-center hover:bg-[#FDF0F0]"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('/signin');
                  }}
                  className="w-full py-2 rounded-xl border border-[#C8BEB0] text-[#181715] text-xs font-semibold text-center hover:bg-[#ECE5DA]"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('/register');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#4C4FD6] text-[#FFFDFC] text-xs font-semibold text-center shadow-sm"
                >
                  Create Account (Get Started)
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onTryDemoClick();
              }}
              className="w-full py-2 rounded-xl bg-[#ECE5DA] text-[#181715] text-xs font-medium text-center"
            >
              Try Demo Benchmark
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingNavbar;
