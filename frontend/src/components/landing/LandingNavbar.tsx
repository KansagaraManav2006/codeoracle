import React, { useState, useEffect } from 'react';
import { ArrowRight, Github, Sparkles, Menu, X } from 'lucide-react';

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
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const navLinks = [
    { label: 'Overview', id: 'what-is-codeoracle' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Capabilities', id: 'capabilities' },
    { label: 'Risk Hotspots', id: 'risk-section' },
    { label: 'Safety Tests', id: 'protection-section' },
    { label: 'Roadmap', id: 'migration-roadmap' },
    { label: 'FAQ', id: 'faq-section' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Detect active section
      const scrollPos = window.scrollY + 140;
      for (let i = navLinks.length - 1; i >= 0; i--) {
        const el = document.getElementById(navLinks[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(navLinks[i].id);
          return;
        }
      }
      if (window.scrollY < 200) {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 70;
      const elementPos = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPos - offset,
        behavior: 'smooth',
      });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 sm:px-6 pt-3 sm:pt-4 pointer-events-none">
      <nav
        className={`pointer-events-auto flex flex-col transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-apple border border-black/[0.08]'
            : 'bg-white/75 backdrop-blur-md shadow-sm border border-black/[0.05]'
        } max-w-[1100px] w-full rounded-2xl sm:rounded-full px-3.5 sm:px-6 py-2 sm:py-2.5`}
        aria-label="Main Navigation"
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Brand */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveSection('home');
            }}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1D1D1F] flex items-center justify-center text-white font-semibold text-sm shadow-sm transition-transform duration-200 group-hover:scale-105">
              <span className="text-[#007AFF] font-bold">O</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs sm:text-sm tracking-tight text-[#1D1D1F]">CodeOracle</span>
              <span className="text-[9px] text-[#86868B] -mt-0.5 hidden xs:inline">Intelligence Engine</span>
            </div>
          </button>

          {/* Navigation Links — Desktop */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-5 text-[12.5px] font-medium text-[#6E6E73]">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`transition-colors py-1 px-1.5 rounded-md hover:text-[#1D1D1F] focus:outline-none ${
                  activeSection === link.id
                    ? 'text-[#007AFF] font-semibold'
                    : 'text-[#6E6E73]'
                }`}
              >
                {link.label}
              </button>
            ))}
            <a
              href="https://github.com/pallets/flask"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1D1D1F] transition-colors flex items-center gap-1 focus:outline-none py-1 px-1.5"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>

          {/* CTA Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onTryDemoClick}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-black/[0.04] transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
              <span className="hidden sm:inline">Try Demo</span>
              <span className="sm:hidden">Demo</span>
            </button>
            <button
              onClick={onAnalyzeClick}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] shadow-sm transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <span>Analyze Repo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] rounded-lg transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden flex flex-col gap-1 pt-3 pb-2 mt-2 border-t border-[#E5E5EA] text-sm animate-fade-up">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`text-left px-3 py-2 rounded-xl transition-colors ${
                  activeSection === link.id
                    ? 'bg-[#EAF4FF] text-[#007AFF] font-semibold'
                    : 'text-[#424245] hover:bg-[#F5F5F7]'
                }`}
              >
                {link.label}
              </button>
            ))}
            <a
              href="https://github.com/pallets/flask"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-[#424245] hover:bg-[#F5F5F7] rounded-xl transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>Reference Repositories (GitHub)</span>
            </a>
          </div>
        )}
      </nav>
    </header>
  );
};

export default LandingNavbar;
