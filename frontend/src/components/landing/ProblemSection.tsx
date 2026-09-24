import React, { useRef, useState, useEffect } from 'react';
import {
  AlertTriangle,
  Network,
  Radio,
  ShieldOff,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

// Individual card visibility hook — each card has its own IntersectionObserver
// with a threshold that triggers slightly as the card enters, not just the section.
function useCardInView(delay: number): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timerRef.current = setTimeout(() => setVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.18 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delay]);

  return [ref, visible];
}

export const ProblemSection: React.FC = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.08 });
  const reducedMotion = useReducedMotion();

  // Individual card refs — each triggers independently
  const [card0Ref, card0Visible] = useCardInView(0);
  const [card1Ref, card1Visible] = useCardInView(0);
  const [card2Ref, card2Visible] = useCardInView(0);
  const [card3Ref, card3Visible] = useCardInView(0);

  // Warning strip only after all four cards are individually in view
  const [strip0Ref, strip0Visible] = useCardInView(120);

  const cardVisibles = [card0Visible, card1Visible, card2Visible, card3Visible];
  const cardRefs = [card0Ref, card1Ref, card2Ref, card3Ref];

  const problemSignals = [
    {
      num: '01',
      title: 'Unknown dependencies',
      tag: 'Hidden Influx',
      desc: 'Subtle imports, dynamic re-exports, and undocumented callers make it impossible to see where data or errors propagate.',
      icon: Network,
      accentColor: '#007AFF',
      badgeBg: 'bg-[#EAF4FF] text-[#007AFF] border-[#007AFF]/20',
      iconBg: 'bg-[#EAF4FF] text-[#007AFF]',
      enterFrom: 'translate3d(-28px, 32px, 0) scale(0.95)',
    },
    {
      num: '02',
      title: 'Hidden blast radius',
      tag: 'Cascade Risk',
      desc: 'A one-line signature refactoring in a shared utility quietly breaks three distant consumers in production.',
      icon: Radio,
      accentColor: '#FF9500',
      badgeBg: 'bg-[#FFF8E6] text-[#B26A00] border-[#FF9500]/25',
      iconBg: 'bg-[#FFF8E6] text-[#B26A00]',
      enterFrom: 'translate3d(-12px, 32px, 0) scale(0.95)',
    },
    {
      num: '03',
      title: 'Missing behavioral protection',
      tag: 'Unwritten Contracts',
      desc: 'Legacy code lacks characterization tests. Teams are afraid to touch critical loops because existing contracts are unwritten.',
      icon: ShieldOff,
      accentColor: '#D7261C',
      badgeBg: 'bg-[#FFF1F0] text-[#D7261C] border-[#FFC5C2]',
      iconBg: 'bg-[#FFF1F0] text-[#D7261C]',
      enterFrom: 'translate3d(12px, 32px, 0) scale(0.95)',
    },
    {
      num: '04',
      title: 'Modernization without context',
      tag: 'Semantic Drift',
      desc: 'AI coding tools rewrite syntax into modern idioms without verifying semantic parity, breaking legacy edge-case assumptions.',
      icon: Compass,
      accentColor: '#5856D6',
      badgeBg: 'bg-[#F2F1FD] text-[#5856D6] border-[#5856D6]/20',
      iconBg: 'bg-[#F2F1FD] text-[#5856D6]',
      enterFrom: 'translate3d(28px, 32px, 0) scale(0.95)',
    },
  ];

  return (
    <section
      id="problem-section"
      ref={sectionRef}
      className="min-h-[100svh] w-full flex flex-col justify-center py-10 lg:py-14 pt-20 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden"
    >
      <div className="max-w-[1140px] w-full mx-auto my-auto">
        {/* Editorial Heading */}
        <div
          style={{
            opacity: inView || reducedMotion ? 1 : 0,
            transform: inView || reducedMotion ? 'none' : 'translate3d(0, 24px, 0)',
            transition: 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="max-w-[780px] mb-5 sm:mb-7"
        >
          <p className="text-xs font-semibold text-[#007AFF] tracking-widest uppercase mb-2 font-geist-mono">
            Why Codebase Intelligence Matters
          </p>
          <h2 className="text-2xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-[#1D1D1F] leading-[1.08] mb-2 font-geist">
            Old code rarely fails because one file is old.
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-[#6E6E73] leading-relaxed font-normal font-sans">
            The real difficulty is understanding what depends on what, where behavior is fragile, and what a seemingly small change can affect.
          </p>
        </div>

        {/* 4 Signal Cards — each independently scroll-gated */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 relative">
          {problemSignals.map((sig, idx) => {
            const Icon = sig.icon;
            const isVisible = reducedMotion ? true : cardVisibles[idx];
            return (
              <div
                key={sig.num}
                ref={cardRefs[idx] as React.RefObject<HTMLDivElement>}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'none' : sig.enterFrom,
                  filter: isVisible ? 'blur(0px)' : 'blur(3px)',
                  transition: reducedMotion
                    ? 'none'
                    : 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                  willChange: 'opacity, transform, filter',
                }}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E5EA] shadow-apple flex flex-col justify-between group hover:-translate-y-1 hover:shadow-apple-md hover:border-[#D2D2D7] transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-[#86868B] tracking-wider">
                      SIGNAL {sig.num}
                    </span>
                    <div className={`w-8 h-8 rounded-xl ${sig.iconBg} flex items-center justify-center transition-transform group-hover:scale-110 duration-200`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1D1D1F] mb-1.5 leading-snug font-geist">
                    {sig.title}
                  </h3>
                  <p className="text-xs text-[#6E6E73] leading-relaxed">
                    {sig.desc}
                  </p>
                </div>

                <div className="pt-3 mt-4 border-t border-[#E5E5EA] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#86868B]">Risk Vector {idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sig.badgeBg}`}>
                    {sig.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Warning strip — reveals after all 4 cards, with a ref-triggered delay */}
        <div
          ref={strip0Ref as React.RefObject<HTMLDivElement>}
          style={{
            opacity: reducedMotion || strip0Visible ? 1 : 0,
            transform: reducedMotion || strip0Visible ? 'none' : 'translate3d(0, 20px, 0) scale(0.98)',
            transition: reducedMotion
              ? 'none'
              : 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'opacity, transform',
          }}
          className="mt-5 bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E5E5EA] shadow-apple flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FFF1F0] border border-[#FFC5C2] flex items-center justify-center text-[#D7261C] shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#D7261C] uppercase tracking-wider block font-geist-mono">
                The Core Bottleneck: Unbounded Change Risk
              </span>
              <p className="text-xs text-[#6E6E73]">
                Without architecture grounding, every refactor is a bet against hidden side effects.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-mono font-semibold text-[#1D1D1F]">
            <span>CodeOracle flips the model:</span>
            <span className="text-[#007AFF] font-bold flex items-center gap-1">
              Understand → Pin → Refactor
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
