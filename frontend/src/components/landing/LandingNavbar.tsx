import React, { useState, useEffect } from 'react';
import { ArrowRight, Github, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pt-4 pointer-events-none">
      <nav
        className={`pointer-events-auto flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-2.5 rounded-full transition-all duration-300 ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl shadow-apple border border-black/[0.08]'
            : 'bg-white/70 backdrop-blur-md shadow-sm border border-black/[0.05]'
        } max-w-[980px] w-full`}
        aria-label="Main Navigation"
      >
        {/* Brand */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-[#1D1D1F] flex items-center justify-center text-white font-semibold text-sm shadow-sm transition-transform duration-200 group-hover:scale-105">
            <span className="text-[#007AFF] font-bold">O</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-[#1D1D1F]">CodeOracle</span>
            <span className="text-[10px] text-[#86868B] -mt-1 hidden sm:inline">Intelligence Engine</span>
          </div>
        </button>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#6E6E73]">
          <button
            onClick={() => scrollToSection('product-story')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Product
          </button>
          <button
            onClick={() => scrollToSection('product-story')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Architecture
          </button>
          <button
            onClick={() => scrollToSection('risk-section')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Risk
          </button>
          <button
            onClick={() => scrollToSection('protection-section')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Protection
          </button>
          <button
            onClick={() => scrollToSection('modernization-section')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Modernization
          </button>
          <a
            href="https://github.com/pallets/flask"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#1D1D1F] transition-colors flex items-center gap-1.5 focus:outline-none"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>

        {/* CTA Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTryDemoClick}
            disabled={isLoading}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-black/[0.04] transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>Try Demo</span>
          </button>
          <button
            onClick={onAnalyzeClick}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] shadow-sm transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            <span>Analyze Repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    </header>
  );
};

export default LandingNavbar;
