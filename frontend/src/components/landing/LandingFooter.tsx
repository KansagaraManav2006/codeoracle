import React from 'react';
import { Github } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const LandingFooter: React.FC = () => {
  const [footerRef, inView] = useInView({ threshold: 0.1 });
  const prefersReduced = useReducedMotion();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer
      ref={footerRef}
      className="py-12 px-4 sm:px-6 bg-[#FFFFFF] border-t border-[#E5E5EA] text-xs text-[#86868B] transition-opacity duration-700 ease-out"
      style={{
        opacity: prefersReduced || inView ? 1 : 0,
      }}
    >
      <div className="max-w-[1120px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center font-bold text-xs">
            <span className="text-[#007AFF]">O</span>
          </div>
          <span className="font-semibold text-[#1D1D1F]">CodeOracle</span>
          <span className="text-[#D2D2D7]">•</span>
          <span>Legacy Codebase Intelligence &amp; Modernization Engine</span>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <button
            onClick={() => scrollTo('product-story')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Product
          </button>
          <button
            onClick={() => scrollTo('product-story')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Architecture
          </button>
          <button
            onClick={() => scrollTo('protection-section')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Safety
          </button>
          <button
            onClick={() => scrollTo('modernization-section')}
            className="hover:text-[#1D1D1F] transition-colors focus:outline-none"
          >
            Modernization
          </button>
          <a
            href="https://github.com/pallets/flask"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#1D1D1F] transition-colors flex items-center gap-1"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>

        <div>
          <span>&copy; 2026 CodeOracle. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
