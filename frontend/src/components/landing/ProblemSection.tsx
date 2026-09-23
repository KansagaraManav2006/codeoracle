import React from 'react';
import {
  AlertTriangle,
  Network,
  Radio,
  ShieldOff,
  Compass,
  ChevronRight,
} from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const ProblemSection: React.FC = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const reducedMotion = useReducedMotion();

  const problemSignals = [
    {
      num: '01',
      title: 'Unknown dependencies',
      desc: 'Subtle imports, dynamic re-exports, and undocumented callers make it impossible to see where data or errors propagate.',
      icon: Network,
      direction: 'translate3d(-24px, 32px, 0)',
      delay: '0ms',
    },
    {
      num: '02',
      title: 'Hidden blast radius',
      desc: 'A one-line signature refactoring in a shared utility quietly breaks three distant consumers in production.',
      icon: Radio,
      direction: 'translate3d(-12px, 32px, 0)',
      delay: '120ms',
    },
    {
      num: '03',
      title: 'Missing behavioral protection',
      desc: 'Legacy code lacks characterization tests. Teams are afraid to touch critical loops because existing contracts are unwritten.',
      icon: ShieldOff,
      direction: 'translate3d(12px, 32px, 0)',
      delay: '240ms',
    },
    {
      num: '04',
      title: 'Modernization without context',
      desc: 'AI coding tools rewrite syntax into modern idioms without verifying semantic parity, breaking legacy edge-case assumptions.',
      icon: Compass,
      direction: 'translate3d(24px, 32px, 0)',
      delay: '360ms',
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden">
      <div className="max-w-[1120px] mx-auto">
        {/* Editorial Heading Header with smooth mask reveal */}
        <div
          style={{
            opacity: inView || reducedMotion ? 1 : 0,
            transform: inView || reducedMotion ? 'none' : 'translate3d(0, 24px, 0)',
            transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="max-w-[820px] mb-16"
        >
          <p className="text-xs font-semibold text-[#007AFF] tracking-widest uppercase mb-4 font-geist-mono">
            Why Codebase Intelligence Matters
          </p>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#1D1D1F] leading-[1.06] mb-6 font-geist">
            Old code rarely fails because one file is old.
          </h2>
          <p className="text-lg sm:text-xl text-[#6E6E73] leading-relaxed font-normal font-sans">
            The real difficulty is understanding what depends on what, where behavior is fragile, and what a seemingly small change can affect.
          </p>
        </div>

        {/* 4 Signals Editorial Layout with Staggered Directional Slide */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {problemSignals.map((sig, idx) => {
            const Icon = sig.icon;
            const isVisible = inView || reducedMotion;
            return (
              <div
                key={sig.num}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'none' : sig.direction,
                  transition: `opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${sig.delay}, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${sig.delay}`,
                }}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E5EA] shadow-apple flex flex-col justify-between group hover:-translate-y-1.5 hover:shadow-apple-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-xs font-semibold text-[#86868B] tracking-wider">
                      {sig.num}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#6E6E73] group-hover:text-[#007AFF] group-hover:bg-[#EAF4FF] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] mb-3 leading-snug">
                    {sig.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed">
                    {sig.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#E5E5EA] flex items-center justify-between text-[11px] font-semibold text-[#86868B]">
                  <span>Signal {idx + 1}</span>
                  <span className="text-[#D7261C] flex items-center gap-1">
                    Compound Risk <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Convergence Bar: Connected into CHANGE RISK with smooth reveal */}
        <div
          style={{
            opacity: inView || reducedMotion ? 1 : 0,
            transform: inView || reducedMotion ? 'none' : 'translate3d(0, 20px, 0) scale(0.98)',
            transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) 480ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) 480ms',
          }}
          className="mt-8 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5EA] shadow-apple flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF1F0] border border-[#FFC5C2] flex items-center justify-center text-[#D7261C] shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#D7261C] uppercase tracking-wider block">
                The Core Bottleneck: Unbounded Change Risk
              </span>
              <p className="text-xs text-[#6E6E73]">
                Without architecture grounding, every refactor is a bet against hidden side effects.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-mono font-semibold text-[#1D1D1F]">
            <span>CodeOracle flips the model:</span>
            <span className="text-[#007AFF]">Understand → Pin → Refactor</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
