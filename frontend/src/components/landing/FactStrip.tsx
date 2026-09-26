import React, { useState, useEffect } from 'react';
import { Gauge, CheckCircle2, Shield, Layers, Code2 } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const FactStrip: React.FC = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.2 });
  const prefersReduced = useReducedMotion();
  const [counts, setCounts] = useState([0, 0, 0, 0, 0]);

  const facts = [
    { target: 9, suffix: '', label: 'Intelligence Views', sub: 'Details, Pulse, Graph, Neural, Tests, Refactor, Plan', icon: Layers },
    { target: 5, suffix: '', label: 'Readiness Dimensions', sub: 'Parsing, dependencies, complexity, protection, candidates', icon: Gauge },
    { target: 7, suffix: '', label: 'Modernization Stages', sub: 'Understand, Map, Prioritize, Protect, Modernize, Simulate, Plan', icon: Code2 },
    { target: 3, suffix: '', label: 'Supported Languages', sub: 'Python 3.10+, JavaScript ESM/CJS, TypeScript', icon: CheckCircle2 },
    { target: 100, suffix: '%', label: 'Static-First Safety', sub: 'Uploaded repository code is never run without explicit isolation', icon: Shield },
  ];

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) {
      setCounts(facts.map((f) => f.target));
      return;
    }

    const duration = 1100;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounts(facts.map((f) => Math.round(f.target * ease)));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [inView, prefersReduced]);

  return (
    <section
      id="fact-strip"
      ref={sectionRef}
      className="w-full min-h-[100svh] flex flex-col justify-center py-10 lg:py-14 pt-20 px-4 sm:px-6 bg-[#FFFFFF] border-y border-[#E5E5EA] overflow-hidden"
    >
      <div className="max-w-[1140px] mx-auto w-full">
        {/* Header */}
        <div
          className="text-center max-w-[760px] mx-auto mb-8 sm:mb-12 transition-all duration-500 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-3 font-geist-mono">
            <Gauge className="w-3.5 h-3.5" />
            <span>Scale &amp; Verifiability Metrics</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-3 font-geist">
            Platform Metrics: Engineered for enterprise scale, grounded in AST facts.
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-[#6E6E73] leading-relaxed font-sans max-w-[620px] mx-auto">
            Proven static analysis pipelines delivering deterministic, reproducible codebase intelligence without runtime surprises.
          </p>
        </div>

        {/* 5 Stats Cards Grid (Cards with Zoom-In Scroll Reveal) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 mb-8">
          {facts.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className={`bg-[#F5F5F7] rounded-2xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between hover:-translate-y-1 hover:shadow-apple-md hover:border-[#007AFF]/30 transition-all duration-500 ease-out transform-gpu ${
                  idx === 4 ? 'col-span-2 md:col-span-1' : ''
                }`}
                style={{
                  opacity: prefersReduced || inView ? 1 : 0,
                  transform: prefersReduced || inView ? 'scale(1) translate3d(0, 0, 0)' : 'scale(0.92) translate3d(0, 20px, 0)',
                  transitionDelay: prefersReduced ? '0ms' : `${idx * 60}ms`,
                  willChange: 'opacity, transform',
                }}
              >
                <div>
                  <div className="w-8 h-8 rounded-xl bg-white text-[#007AFF] flex items-center justify-center mb-3 shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-geist-mono text-[#1D1D1F] tracking-tight mb-1.5">
                    {counts[idx]}
                    {f.suffix}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#1D1D1F] mb-1 font-geist">
                    {f.label}
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs text-[#86868B] leading-relaxed pt-2 border-t border-[#E5E5EA]/70 mt-2">
                  {f.sub}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner (10-15% breathing room) */}
        <div className="flex items-center justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-5 py-2 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-geist-mono text-[#6E6E73]">
            <span className="flex items-center gap-1.5 text-[#248A3D] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              Zero Runtime Overhead
            </span>
            <span>•</span>
            <span>100% Tree-sitter AST Coverage</span>
            <span>•</span>
            <span>Deterministic Reproduction</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FactStrip;
