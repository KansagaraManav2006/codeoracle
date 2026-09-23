import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

interface FinalCtaSectionProps {
  onAnalyzeClick: () => void;
  onTryDemoClick: () => void;
  isLoading?: boolean;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({
  onAnalyzeClick,
  onTryDemoClick,
  isLoading = false,
}) => {
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden">
      <div className="max-w-[1040px] mx-auto">
        <div
          className="bg-white rounded-[36px] sm:rounded-[44px] border border-[#E5E5EA] shadow-apple-lg p-8 sm:p-16 text-center relative overflow-hidden transition-all duration-800 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'scale(0.96) translate3d(0, 36px, 0)',
          }}
        >
          {/* Subtle Apple blue diffusion focus point with animated pulse */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-[#007AFF]/[0.10] via-[#5856D6]/[0.08] to-[#007AFF]/[0.10] rounded-full blur-3xl pointer-events-none -z-10 transition-opacity duration-1000 ${
              inView ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <div
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-6 transition-all duration-600 delay-100 font-geist-mono"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 16px, 0)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready When You Are</span>
          </div>

          <h2
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#1D1D1F] leading-[1.04] max-w-[760px] mx-auto mb-6 transition-all duration-700 delay-150 font-geist"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
            }}
          >
            Know the system.<br />
            <span className="text-[#007AFF]">Then change it with confidence.</span>
          </h2>

          <p
            className="text-base sm:text-lg md:text-xl text-[#6E6E73] max-w-[640px] mx-auto leading-relaxed mb-10 transition-all duration-700 delay-200"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 20px, 0)',
            }}
          >
            Start with a public GitHub repository or upload a project archive. CodeOracle maps the architecture, surfaces risk, generates protection, and builds a modernization plan.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-[440px] mx-auto transition-all duration-700 delay-300"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 16px, 0)',
            }}
          >
            <button
              onClick={onAnalyzeClick}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] shadow-sm transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <span>Analyze Repository</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onTryDemoClick}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#007AFF]" />
              <span>Try Built-in Demo</span>
            </button>
          </div>

          <div
            className="mt-12 pt-8 border-t border-[#E5E5EA] flex flex-wrap items-center justify-center gap-6 text-xs text-[#86868B] transition-all duration-700 delay-400"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
            }}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#34C759]" />
              <span>Read-Only Ingestion</span>
            </div>
            <span>•</span>
            <span>No Code Execution Without Sandbox</span>
            <span>•</span>
            <span>100% Client Privacy</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
