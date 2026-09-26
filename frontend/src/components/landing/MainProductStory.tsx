import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Network,
  Flame,
  ShieldCheck,
  Sparkles,
  Radio,
  Milestone,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useScrollProgress, useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

interface StageData {
  id: string;
  number: string;
  title: string;
  tagline: string;
  message: string;
  icon: React.ElementType;
}

const STAGES: StageData[] = [
  { id: 'understand', number: '01', title: 'Understand', tagline: 'System Pulse & Codebase Health', message: 'Understand the health of the entire repository before drilling into files.', icon: Activity },
  { id: 'map', number: '02', title: 'Map', tagline: 'Dependency Map & Architecture', message: 'See how modules connect, where entry points live, and which relationships remain uncertain.', icon: Network },
  { id: 'prioritize', number: '03', title: 'Prioritize', tagline: 'Risk Hotspots & Static Evidence', message: 'Rank refactoring targets using explainable static evidence.', icon: Flame },
  { id: 'protect', number: '04', title: 'Protect', tagline: 'Deterministic Safety Tests', message: 'Create behavioral guardrails before changing legacy code.', icon: ShieldCheck },
  { id: 'modernize', number: '05', title: 'Modernize', tagline: 'Transparent Transformation Funnel', message: 'Separate modernization opportunities from safe automated transformations.', icon: Sparkles },
  { id: 'simulate', number: '06', title: 'Simulate', tagline: 'Blast Radius & Downstream Ripple', message: 'Understand what may break before making the change.', icon: Radio },
  { id: 'plan', number: '07', title: 'Plan', tagline: 'Prioritized Migration Roadmap', message: 'Turn analysis into an ordered modernization roadmap.', icon: Milestone },
];

// Per-stage content transition state
type TransitionState = 'idle' | 'exiting' | 'entering';

export const MainProductStory: React.FC = () => {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [displayedStageIndex, setDisplayedStageIndex] = useState(0);
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const [manualOverride, setManualOverride] = useState(false);
  const [containerRef, scrollProgress] = useScrollProgress();
  const [headerRef, headerInView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();
  const overrideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Progress bar width: maps stage index to fill %
  const progressPct = ((activeStageIndex) / (STAGES.length - 1)) * 100;

  // Auto-advance stage based on scroll
  useEffect(() => {
    if (manualOverride || prefersReduced) return;
    if (scrollProgress > 0 && scrollProgress < 1) {
      const targetIndex = Math.min(6, Math.floor(scrollProgress * 7));
      if (targetIndex !== activeStageIndex) {
        triggerTransition(targetIndex);
      }
    }
  }, [scrollProgress, manualOverride, prefersReduced]);

  const triggerTransition = (nextIndex: number) => {
    if (prefersReduced) {
      setActiveStageIndex(nextIndex);
      setDisplayedStageIndex(nextIndex);
      return;
    }
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setTransitionState('exiting');
    transitionTimerRef.current = setTimeout(() => {
      setDisplayedStageIndex(nextIndex);
      setActiveStageIndex(nextIndex);
      setTransitionState('entering');
      transitionTimerRef.current = setTimeout(() => {
        setTransitionState('idle');
      }, 320);
    }, 180);
  };

  const handleStageClick = (idx: number) => {
    triggerTransition(idx);
    setManualOverride(true);
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    overrideTimerRef.current = setTimeout(() => setManualOverride(false), 4000);
  };

  const currentStage = STAGES[displayedStageIndex];

  // Content panel animation based on transition state
  const panelStyle = prefersReduced
    ? {}
    : {
        opacity: transitionState === 'exiting' ? 0 : 1,
        transform:
          transitionState === 'exiting'
            ? 'scale(0.97) translateY(6px)'
            : transitionState === 'entering'
            ? 'scale(1.015) translateY(-4px)'
            : 'scale(1) translateY(0px)',
        transition:
          transitionState === 'exiting'
            ? 'opacity 0.18s ease-in, transform 0.18s ease-in'
            : 'opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
      };

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className={`relative bg-[#FFFFFF] ${prefersReduced ? 'py-16' : 'min-h-[280vh] md:min-h-[320vh]'}`}
    >
      <div id="product-story" className="sr-only" />
      {/* Sticky presentation viewport */}
      <div className={`${
        prefersReduced
          ? 'relative py-8'
          : 'sticky top-12 md:top-14 h-[calc(100svh-3.5rem)] flex flex-col justify-center'
      } py-2 sm:py-3 px-4 sm:px-6 overflow-hidden`}>
        <div className="max-w-[1180px] w-full mx-auto my-auto flex flex-col">
          {/* Header with Reveal */}
          <div
            ref={headerRef}
            className="max-w-[760px] mb-3 sm:mb-4 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || headerInView ? 1 : 0,
              transform: prefersReduced || headerInView ? 'none' : 'translate3d(0, 20px, 0)',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-[#007AFF] tracking-wider uppercase font-geist-mono">
                The 7-Stage Intelligence Pipeline
              </span>
              <span className="text-xs text-[#86868B]">•</span>
              <span className="text-xs font-mono text-[#86868B]">
                Stage {activeStageIndex + 1} of 7 (Scroll or Click)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1D1D1F] leading-[1.08] mb-1 font-geist">
              How CodeOracle sequences safe modernization.
            </h2>
            <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed max-w-[660px]">
              From raw repository AST parsing to an executable migration wave, every stage provides evidence-backed guardrails for engineers.
            </p>

            {/* Stage Progress Bar */}
            {!prefersReduced && (
              <div className="mt-2.5 h-0.5 bg-[#E5E5EA] rounded-full overflow-hidden w-full max-w-[480px]">
                <div
                  className="h-full bg-[#007AFF] rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
            {/* Left Navigation (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-1.5 justify-center">
              {STAGES.map((stg, idx) => {
                const isActive = idx === activeStageIndex;
                const Icon = stg.icon;
                return (
                  <button
                    key={stg.id}
                    onClick={() => handleStageClick(idx)}
                    className={`text-left p-2.5 sm:p-3 rounded-2xl transition-all duration-300 border flex items-center gap-3 relative ${
                      isActive
                        ? 'bg-white border-[#007AFF] shadow-apple-md scale-[1.02] border-l-4 border-l-[#007AFF]'
                        : 'bg-transparent border-transparent hover:bg-black/[0.03] text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                    style={{
                      transform: isActive && !prefersReduced ? 'translateX(4px) scale(1.02)' : undefined,
                    }}
                  >
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md transition-colors ${
                        isActive ? 'bg-[#007AFF] text-white shadow-xs' : 'bg-[#E5E5EA] text-[#6E6E73]'
                      }`}
                    >
                      {stg.number}
                    </span>
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#007AFF]' : 'text-[#86868B]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs sm:text-sm font-bold transition-colors font-geist ${
                            isActive ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
                          }`}
                        >
                          {stg.title}
                        </span>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#007AFF]" />}
                      </div>
                      <p className={`text-[11px] truncate leading-tight mt-0.5 ${isActive ? 'text-[#424245]' : 'text-[#86868B]'}`}>
                        {stg.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Product Canvas (8 cols) — animates on stage change */}
            <div
              className="lg:col-span-8 bg-white rounded-3xl border border-[#E5E5EA] p-5 sm:p-6 shadow-apple-md flex flex-col justify-between"
              style={panelStyle}
            >
              {/* Stage Header Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3.5 border-b border-[#E5E5EA]">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 font-mono text-xs">
                    <span className="font-bold text-[#007AFF] bg-[#EAF4FF] px-2 py-0.5 rounded-full">
                      STAGE {currentStage.number}
                    </span>
                    <span className="text-[#86868B]">•</span>
                    <span className="text-[#86868B] font-semibold">{currentStage.title}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#1D1D1F] font-geist">
                    {currentStage.tagline}
                  </h3>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] shadow-xs text-[#007AFF]">
                  <currentStage.icon className="w-4 h-4" />
                </div>
              </div>

              {/* Dynamic Stage Body */}
              <div className="py-3 flex-1 flex flex-col justify-center min-h-[200px]">
                {/* STAGE 01: UNDERSTAND */}
                {displayedStageIndex === 0 && (
                  <div className="space-y-3">
                    <div className="bg-white rounded-xl p-4 border border-[#E5E5EA] shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Codebase Health Overall</span>
                          <div className="text-4xl font-bold font-mono text-[#1D1D1F] mt-1">
                            74 <span className="text-base text-[#86868B] font-normal">/ 100</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F9ED] text-[#248A3D]">Modernization Ready</span>
                      </div>
                      <div className="space-y-3 pt-3 border-t border-[#E5E5EA]">
                        {[
                          { name: 'Parsing & AST Grounding', score: 80, color: '#007AFF' },
                          { name: 'Dependency Resolution', score: 83, color: '#34C759' },
                          { name: 'Cyclomatic Complexity', score: 72, color: '#FF9500' },
                          { name: 'Behavioral Protection Tests', score: 40, color: '#D7261C' },
                          { name: 'Modernization Candidate Purity', score: 97, color: '#007AFF' },
                        ].map((dim, i) => (
                          <div key={dim.name} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-[#1D1D1F]">{dim.name}</span>
                              <span className="font-mono font-bold text-[#424245]">{dim.score} / 100</span>
                            </div>
                            <div className="w-full bg-[#EAEAED] h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${dim.score}%`,
                                  backgroundColor: dim.color,
                                  transition: `width 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STAGE 02: MAP */}
                {displayedStageIndex === 1 && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">Dependency Architecture Transition</span>
                        <span className="text-xs font-mono text-[#007AFF]">145 Modules • 292 Edges</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        {[
                          { step: '1. Folders', val: '18 Paths', color: '#1D1D1F' },
                          { step: '2. Modules', val: '145 Nodes', color: '#007AFF' },
                          { step: '3. Call Edges', val: '292 Edges', color: '#1D1D1F' },
                          { step: '4. Layers', val: '5 Subsystems', color: '#34C759' },
                        ].map((item, i) => (
                          <div
                            key={item.step}
                            className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]"
                            style={{
                              opacity: 1,
                              transform: 'none',
                              animation: prefersReduced ? 'none' : `fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms both`,
                            }}
                          >
                            <div className="text-[11px] text-[#86868B] uppercase font-bold">{item.step}</div>
                            <div className="text-sm font-mono font-bold mt-1" style={{ color: item.color }}>{item.val}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-between text-xs">
                        <span className="text-[#6E6E73]">Detected Entry Points:</span>
                        <span className="font-mono font-bold text-[#1D1D1F]">main.py, server.py, index.tsx, App.tsx</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAGE 03: PRIORITIZE */}
                {displayedStageIndex === 2 && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">Ranked Risk Hotspot (#1 Target)</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF1F0] text-[#D7261C]">HIGH RISK</span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#FFF8F8] border border-[#FFC5C2] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-[#1D1D1F]">AnomalyExplainPanel.tsx</span>
                          <span className="font-mono text-xs font-bold text-[#D7261C]">Score: 63 / 100</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#FFC5C2]/60 text-xs font-mono">
                          <div><span className="text-[#86868B] block text-[10px]">COMPLEXITY</span><strong>CC: 21</strong></div>
                          <div><span className="text-[#86868B] block text-[10px]">WARNINGS</span><strong>6 Warnings</strong></div>
                          <div><span className="text-[#86868B] block text-[10px]">FAN-IN</span><strong>4 Callers</strong></div>
                          <div><span className="text-[#86868B] block text-[10px]">BLAST RADIUS</span><strong>1 Downstream</strong></div>
                        </div>
                      </div>
                      <p className="text-xs text-[#6E6E73] leading-relaxed">Static evidence ranks refactoring targets mathematically rather than by gut feeling.</p>
                    </div>
                  </div>
                )}

                {/* STAGE 04: PROTECT */}
                {displayedStageIndex === 3 && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">Generated Characterization Suites</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F9ED] text-[#248A3D]">133 / 133 Syntax Valid</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Test Cases', val: '1,172', color: '#1D1D1F' },
                          { label: 'Protected', val: '116 / 145', color: '#007AFF' },
                          { label: 'Coverage Floor', val: '73.8%', color: '#34C759' },
                        ].map((m) => (
                          <div key={m.label} className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                            <span className="text-[10px] font-bold text-[#86868B] uppercase">{m.label}</span>
                            <div className="text-2xl font-bold font-mono mt-1" style={{ color: m.color }}>{m.val}</div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs text-[#6E6E73]">
                        <strong className="text-[#1D1D1F]">Verification Boundary:</strong> Generated test files are statically validated through AST parser checkers before being offered as downloadable archives.
                      </div>
                    </div>
                  </div>
                )}

                {/* STAGE 05: MODERNIZE */}
                {displayedStageIndex === 4 && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">Modernization Pipeline Transparency</span>
                        <span className="text-xs font-mono text-[#86868B]">Strict Separation</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
                        {[
                          { val: '136', label: 'Findings', color: '#1D1D1F' },
                          { val: '37', label: 'Candidates', color: '#007AFF' },
                          { val: '0', label: 'Autofix', color: '#86868B' },
                          { val: '0', label: 'Diffs', color: '#86868B' },
                          { val: '0', label: 'Verified', color: '#86868B' },
                        ].map((item, i) => (
                          <React.Fragment key={item.label}>
                            <div className="w-full p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                              <div className="text-xl font-bold font-mono" style={{ color: item.color }}>{item.val}</div>
                              <div className="text-[10px] text-[#86868B] uppercase font-bold">{item.label}</div>
                            </div>
                            {i < 4 && <ChevronRight className="w-4 h-4 text-[#86868B] shrink-0 hidden sm:block" />}
                          </React.Fragment>
                        ))}
                      </div>
                      <p className="text-xs text-[#6E6E73] leading-relaxed">CodeOracle never pretends every modernization finding is safe to autofix without human approval.</p>
                    </div>
                  </div>
                )}

                {/* STAGE 06: SIMULATE */}
                {displayedStageIndex === 5 && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">Downstream Blast Radius Ripple</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#EAF4FF] text-[#007AFF]">Simulation Active</span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-[#007AFF]">AnomalyExplainPanel.tsx (Source)</span>
                          <span className="text-[#86868B]">Depth: 2</span>
                        </div>
                        <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#007AFF] h-full w-2/3 animate-pulse" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 font-mono">
                          <div>Direct: <strong>1 module</strong></div>
                          <div>Transitive: <strong>2 modules</strong></div>
                          <div>Affected Entry: <strong>App.tsx</strong></div>
                        </div>
                      </div>
                      <p className="text-xs text-[#6E6E73] leading-relaxed">Know exactly which entry points will be perturbed before writing a single line of refactored code.</p>
                    </div>
                  </div>
                )}

                {/* STAGE 07: PLAN */}
                {displayedStageIndex === 6 && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">Migration Waves Sequence</span>
                        <span className="text-xs font-mono text-[#34C759] font-bold">5 Waves</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { wave: 'W0 Protect', role: 'Safety test generation & baseline pin', count: '133 test suites' },
                          { wave: 'W1 Leaves', role: 'Pure leaf utilities without downstream callers', count: '24 files' },
                          { wave: 'W2 Cycles', role: 'Circular dependency decoupling', count: '2 cycles' },
                          { wave: 'W3 Core Services', role: 'Domain services and API clients', count: '18 files' },
                          { wave: 'W4 Entry Points', role: 'FastAPI routes & React root entry points', count: '4 files' },
                        ].map((w) => (
                          <div
                            key={w.wave}
                            className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs"
                            style={{
                              opacity: 1,
                              transform: 'none',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#007AFF]">{w.wave}</span>
                              <span className="text-[#6E6E73]">{w.role}</span>
                            </div>
                            <span className="font-mono text-[#86868B]">{w.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stage Footer */}
              <div className="pt-3 mt-1 border-t border-[#E5E5EA] flex items-center justify-between">
                <p className="text-xs text-[#1D1D1F] font-medium max-w-[500px]">
                  {currentStage.message}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const next = activeStageIndex < STAGES.length - 1 ? activeStageIndex + 1 : 0;
                    handleStageClick(next);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#007AFF] bg-[#EAF4FF] hover:bg-[#D5E9FF] transition-all"
                >
                  <span>{activeStageIndex === STAGES.length - 1 ? 'Restart Story' : 'Next Stage'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MainProductStory;
