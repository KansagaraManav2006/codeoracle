import React from 'react';
import { Github } from 'lucide-react';
import { navigateTo } from '../../utils/navigation';

export const LandingFooter: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="py-14 px-4 sm:px-6 lg:px-8 bg-[#181715] text-[#C8BEB0] border-t border-[#3B3733] text-xs">
      <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex flex-col gap-2 max-w-[360px]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#23211E] border border-[#3B3733] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M16 6L25 11.2V20.8L16 26L7 20.8V11.2L16 6Z" stroke="#4C4FD6" strokeWidth="2.2" strokeLinejoin="round"/>
                <circle cx="16" cy="16" r="3.5" fill="#4C4FD6"/>
              </svg>
            </div>
            <span className="font-display font-bold text-sm text-[#FFFDFC]">CodeOracle</span>
          </div>
          <p className="text-xs text-[#A39888] leading-relaxed">
            Deterministic AST analysis, dependency graph visualization, and reviewable modernization plans.
          </p>
        </div>

        {/* Navigation columns */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 font-medium">
          <button
            onClick={() => scrollTo('product-story')}
            className="hover:text-[#FFFDFC] transition-colors focus:outline-none"
          >
            Story
          </button>
          <button
            onClick={() => scrollTo('risk-section')}
            className="hover:text-[#FFFDFC] transition-colors focus:outline-none"
          >
            Risk Hotspots
          </button>
          <button
            onClick={() => scrollTo('protection-section')}
            className="hover:text-[#FFFDFC] transition-colors focus:outline-none"
          >
            Safety Tests
          </button>
          <button
            onClick={() => scrollTo('modernization-section')}
            className="hover:text-[#FFFDFC] transition-colors focus:outline-none"
          >
            Modernization
          </button>
          <button
            onClick={() => navigateTo('/signin')}
            className="hover:text-[#FFFDFC] transition-colors focus:outline-none"
          >
            Sign In
          </button>
          <button
            onClick={() => navigateTo('/register')}
            className="hover:text-[#FFFDFC] transition-colors focus:outline-none"
          >
            Register
          </button>
          <button
            onClick={() => navigateTo('/workspace')}
            className="text-[#4C4FD6] hover:text-[#7A7DF7] font-semibold transition-colors focus:outline-none"
          >
            Workspace
          </button>
          <a
            href="https://github.com/KansagaraManav2006/codeoracle"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#FFFDFC] transition-colors flex items-center gap-1.5 focus:outline-none"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>

        <div className="text-xs text-[#5C554D] font-mono">
          <span>&copy; {new Date().getFullYear()} CodeOracle. Architecture &amp; Modernization.</span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
