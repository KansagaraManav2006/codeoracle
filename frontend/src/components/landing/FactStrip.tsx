import React, { useState, useEffect } from 'react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const FactStrip: React.FC = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.2 });
  const prefersReduced = useReducedMotion();
  const [counts, setCounts] = useState([0, 0, 0, 0, 0]);

  const facts = [
    { target: 9, suffix: '', label: 'Intelligence Views', sub: 'Details, Pulse, Graph, Neural, Tests, Refactor, Plan' },
    { target: 5, suffix: '', label: 'Readiness Dimensions', sub: 'Parsing, dependencies, complexity, protection, candidates' },
    { target: 7, suffix: '', label: 'Modernization Stages', sub: 'Understand, Map, Prioritize, Protect, Modernize, Simulate, Plan' },
    { target: 3, suffix: '', label: 'Supported Languages', sub: 'Python 3.10+, JavaScript ESM/CJS, TypeScript' },
    { target: 100, suffix: '%', label: 'Static-First Safety', sub: 'Uploaded repository code is never run without explicit isolation' },
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
    <section ref={sectionRef} className="py-16 px-4 sm:px-6 bg-[#FFFFFF] border-y border-[#E5E5EA] overflow-hidden">
      <div className="max-w-[1140px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          {facts.map((f, idx) => (
            <div
              key={f.label}
              className={`space-y-1 transition-all duration-600 ease-out ${idx === 4 ? 'col-span-2 md:col-span-1' : ''}`}
              style={{
                opacity: prefersReduced || inView ? 1 : 0,
                transform: prefersReduced || inView ? 'none' : 'scale(0.88) translate3d(0, 16px, 0)',
                transitionDelay: prefersReduced ? '0ms' : `${idx * 90}ms`,
              }}
            >
              <div className="text-3xl sm:text-4xl font-bold font-mono text-[#1D1D1F] tracking-tight">
                {counts[idx]}
                {f.suffix}
              </div>
              <div className="text-xs font-bold text-[#1D1D1F]">{f.label}</div>
              <p className="text-[11px] text-[#86868B] leading-tight max-w-[180px] mx-auto">
                {f.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FactStrip;
