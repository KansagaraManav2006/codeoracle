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
    <section
      id="final-cta-section"
      ref={sectionRef}
      className="w-full min-h-[100svh] flex flex-col justify-center py-8 lg:py-12 pt-20 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden"
    >
      <div className="max-w-[1040px] mx-auto w-full">
        <div
          className="bg-white rounded-[32px] sm:rounded-[40px] border border-[#E5E5EA] shadow-apple-lg p-6 sm:p-10 lg:p-14 text-center relative overflow-hidden transition-all duration-700 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'scale(0.96) translate3d(0, 32px, 0)',
          }}
        >
          {/* Subtle Apple blue diffusion focus point with animated pulse */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#007AFF]/[0.10] via-[#5856D6]/[0.08] to-[#007AFF]/[0.10] rounded-full blur-3xl pointer-events-none -z-10 transition-opacity duration-1000 ${
              inView ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-4 transition-all duration-600 delay-100 font-geist-mono"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 16px, 0)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready When You Are</span>
          </div>

          <h2
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1D1D1F] leading-[1.06] max-w-[760px] mx-auto mb-4 transition-all duration-700 delay-150 font-geist"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
            }}
          >
            Know the system.<br />
            <span className="text-[#007AFF]">Then change it with confidence.</span>
          </h2>

          <p
            className="text-xs sm:text-base lg:text-lg text-[#6E6E73] max-w-[620px] mx-auto leading-relaxed mb-8 transition-all duration-700 delay-200"
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] shadow-apple-md hover:shadow-apple-lg hover:brightness-105 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            >
              <span>Analyze Repository</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onTryDemoClick}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-[#1D1D1F] bg-white hover:bg-[#F5F5F7] border border-[#E5E5EA] shadow-apple hover:shadow-apple-md hover:border-[#D2D2D7] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#007AFF]" />
              <span>Try Built-in Demo</span>
            </button>
          </div>

          <div
            className="mt-8 pt-6 border-t border-[#E5E5EA] flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#86868B] font-geist-mono transition-all duration-700 delay-400"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
            }}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#34C759]" />
              <span className="text-[#1D1D1F] font-medium">Read-Only Ingestion</span>
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
