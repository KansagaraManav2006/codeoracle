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
  {
    id: 'understand',
    number: '01',
    title: 'Understand',
    tagline: 'System Pulse & Codebase Health',
    message: 'Understand the health of the entire repository before drilling into files.',
    icon: Activity,
  },
  {
    id: 'map',
    number: '02',
    title: 'Map',
    tagline: 'Dependency Map & Architecture',
    message: 'See how modules connect, where entry points live, and which relationships remain uncertain.',
    icon: Network,
  },
  {
    id: 'prioritize',
    number: '03',
    title: 'Prioritize',
    tagline: 'Risk Hotspots & Static Evidence',
    message: 'Rank refactoring targets using explainable static evidence.',
    icon: Flame,
  },
  {
    id: 'protect',
    number: '04',
    title: 'Protect',
    tagline: 'Deterministic Safety Tests',
    message: 'Create behavioral guardrails before changing legacy code.',
    icon: ShieldCheck,
  },
  {
    id: 'modernize',
    number: '05',
    title: 'Modernize',
    tagline: 'Transparent Transformation Funnel',
    message: 'Separate modernization opportunities from safe automated transformations.',
    icon: Sparkles,
  },
  {
    id: 'simulate',
    number: '06',
    title: 'Simulate',
    tagline: 'Blast Radius & Downstream Ripple',
    message: 'Understand what may break before making the change.',
    icon: Radio,
  },
  {
    id: 'plan',
    number: '07',
    title: 'Plan',
    tagline: 'Prioritized Migration Roadmap',
    message: 'Turn analysis into an ordered modernization roadmap.',
    icon: Milestone,
  },
];

export const MainProductStory: React.FC = () => {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);
  const [containerRef, scrollProgress] = useScrollProgress();
  const [headerRef, headerInView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();
  const overrideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance stage based on scroll progress through this pinned container
  useEffect(() => {
    if (manualOverride || prefersReduced) return;
    if (scrollProgress > 0 && scrollProgress < 1) {
      const targetIndex = Math.min(6, Math.floor(scrollProgress * 7));
      setActiveStageIndex(targetIndex);
    }
  }, [scrollProgress, manualOverride, prefersReduced]);

  const handleStageClick = (idx: number) => {
    setActiveStageIndex(idx);
    setManualOverride(true);
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    overrideTimerRef.current = setTimeout(() => {
      setManualOverride(false);
    }, 4000);
  };

  const currentStage = STAGES[activeStageIndex];

  return (
    <section
      id="product-story"
      ref={containerRef}
      className="relative bg-[#FFFFFF] min-h-[140vh] md:min-h-[160vh]"
    >
      {/* Sticky presentation viewport */}
      <div className="sticky top-16 md:top-20 py-10 md:py-14 px-4 sm:px-6">
        <div className="max-w-[1180px] mx-auto">
          {/* Header with Reveal */}
          <div
            ref={headerRef}
            className="max-w-[760px] mb-8 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || headerInView ? 1 : 0,
              transform: prefersReduced || headerInView ? 'none' : 'translate3d(0, 24px, 0)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-[#007AFF] tracking-wider uppercase font-geist-mono">
                The 7-Stage Intelligence Story
              </span>
              <span className="text-xs text-[#86868B]">•</span>
              <span className="text-xs font-mono text-[#86868B]">
                Stage {activeStageIndex + 1} of 7 (Scroll or Click)
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-[1.06] mb-3 font-geist">
              How CodeOracle sequences safe modernization.
            </h2>
            <p className="text-base sm:text-lg text-[#6E6E73] leading-relaxed">
              From the initial ingestion pulse to an executable migration wave, every stage provides evidence-backed guardrails for engineers.
            </p>
          </div>

          {/* Two-Column Layout: Left Stage List, Right Dynamic Product Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Navigation (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-2">
              {STAGES.map((stg, idx) => {
                const isActive = idx === activeStageIndex;
                const Icon = stg.icon;
                return (
                  <button
                    key={stg.id}
                    onClick={() => handleStageClick(idx)}
                    className={`text-left p-3.5 sm:p-4 rounded-2xl transition-all duration-300 border flex items-start gap-4 ${
                      isActive
                        ? 'bg-[#F5F5F7] border-[#007AFF]/40 shadow-apple scale-[1.02]'
                        : 'bg-transparent border-transparent hover:bg-[#F5F5F7]/60 text-[#6E6E73] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <span
                      className={`font-mono text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                        isActive ? 'bg-[#007AFF] text-white shadow-sm' : 'bg-[#E5E5EA] text-[#6E6E73]'
                      }`}
                    >
                      <span>{stg.number}</span>
                    </span>
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${isActive ? 'text-[#007AFF]' : 'text-[#86868B]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-bold transition-colors ${
                            isActive ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
                          }`}
                        >
                          {stg.title}
                        </span>
                        {isActive && <ChevronRight className="w-4 h-4 text-[#007AFF] animate-pulse" />}
                      </div>
                      <p className="text-xs text-[#86868B] truncate mt-0.5">{stg.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Product Canvas (8 cols) */}
            <div className="lg:col-span-8 bg-[#F5F5F7] rounded-[32px] border border-[#E5E5EA] p-6 sm:p-8 shadow-apple-md min-h-[540px] flex flex-col justify-between transition-all duration-300">
            {/* Stage Header Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5EA]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-[#007AFF]">
                    STAGE {currentStage.number}
                  </span>
                  <span className="text-xs text-[#86868B]">•</span>
                  <span className="text-xs text-[#86868B] font-semibold">{currentStage.title}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#1D1D1F]">
                  {currentStage.tagline}
                </h3>
              </div>
              <div className="p-2.5 rounded-2xl bg-white border border-[#E5E5EA] shadow-sm text-[#007AFF]">
                <currentStage.icon className="w-6 h-6" />
              </div>
            </div>

            {/* Dynamic Interactive Stage Body */}
            <div className="py-6 flex-1 flex flex-col justify-center">
              {/* STAGE 01: UNDERSTAND */}
              {activeStageIndex === 0 && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                          Codebase Health Overall
                        </span>
                        <div className="text-4xl font-bold font-mono text-[#1D1D1F] mt-1">
                          74 <span className="text-base text-[#86868B] font-normal">/ 100</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F9ED] text-[#248A3D]">
                        Modernization Ready
                      </span>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-[#E5E5EA]">
                      {[
                        { name: 'Parsing & AST Grounding', score: 80, max: 100, color: '#007AFF' },
                        { name: 'Dependency Resolution', score: 83, max: 100, color: '#34C759' },
                        { name: 'Cyclomatic Complexity', score: 72, max: 100, color: '#FF9500' },
                        { name: 'Behavioral Protection Tests', score: 40, max: 100, color: '#D7261C' },
                        { name: 'Modernization Candidate Purity', score: 97, max: 100, color: '#007AFF' },
                      ].map((dim) => (
                        <div key={dim.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-[#1D1D1F]">{dim.name}</span>
                            <span className="font-mono font-bold text-[#424245]">{dim.score} / 100</span>
                          </div>
                          <div className="w-full bg-[#EAEAED] h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${dim.score}%`, backgroundColor: dim.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 02: MAP */}
              {activeStageIndex === 1 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                        Dependency Architecture Transition
                      </span>
                      <span className="text-xs font-mono text-[#007AFF]">145 Modules • 292 Edges</span>
                    </div>

                    {/* Visual flow: folders -> modules -> edges -> architecture layers */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-[11px] text-[#86868B] uppercase font-bold">1. Folders</div>
                        <div className="text-sm font-mono font-bold text-[#1D1D1F] mt-1">18 Paths</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-[11px] text-[#86868B] uppercase font-bold">2. Modules</div>
                        <div className="text-sm font-mono font-bold text-[#007AFF] mt-1">145 Nodes</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-[11px] text-[#86868B] uppercase font-bold">3. Call Edges</div>
                        <div className="text-sm font-mono font-bold text-[#1D1D1F] mt-1">292 Edges</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-[11px] text-[#86868B] uppercase font-bold">4. Layers</div>
                        <div className="text-sm font-mono font-bold text-[#34C759] mt-1">5 Subsystems</div>
                      </div>
                    </div>

                    <div className="mt-5 p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-between text-xs">
                      <span className="text-[#6E6E73]">Detected Entry Points:</span>
                      <span className="font-mono font-bold text-[#1D1D1F]">
                        main.py, server.py, index.tsx, App.tsx
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 03: PRIORITIZE */}
              {activeStageIndex === 2 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                        Ranked Risk Hotspot (#1 Target)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF1F0] text-[#D7261C]">
                        HIGH RISK
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FFF8F8] border border-[#FFC5C2] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-[#1D1D1F]">
                          AnomalyExplainPanel.tsx
                        </span>
                        <span className="font-mono text-xs font-bold text-[#D7261C]">
                          Score: 63 / 100
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#FFC5C2]/60 text-xs font-mono">
                        <div><span className="text-[#86868B] block text-[10px]">COMPLEXITY</span><strong>CC: 21</strong></div>
                        <div><span className="text-[#86868B] block text-[10px]">WARNINGS</span><strong>6 Warnings</strong></div>
                        <div><span className="text-[#86868B] block text-[10px]">FAN-IN</span><strong>4 Callers</strong></div>
                        <div><span className="text-[#86868B] block text-[10px]">BLAST RADIUS</span><strong>1 Downstream</strong></div>
                      </div>
                    </div>

                    <p className="text-xs text-[#6E6E73] leading-relaxed">
                      Static evidence ranks refactoring targets mathematically rather than by gut feeling.
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE 04: PROTECT */}
              {activeStageIndex === 3 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                        Generated Characterization Suites
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F9ED] text-[#248A3D]">
                        133 / 133 Syntax Valid
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <span className="text-[10px] font-bold text-[#86868B] uppercase">Test Cases</span>
                        <div className="text-2xl font-bold font-mono text-[#1D1D1F] mt-1">1,172</div>
                      </div>
                      <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <span className="text-[10px] font-bold text-[#86868B] uppercase">Protected</span>
                        <div className="text-2xl font-bold font-mono text-[#007AFF] mt-1">116 / 145</div>
                      </div>
                      <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <span className="text-[10px] font-bold text-[#86868B] uppercase">Coverage Floor</span>
                        <div className="text-2xl font-bold font-mono text-[#34C759] mt-1">73.8%</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs text-[#6E6E73]">
                      <strong className="text-[#1D1D1F]">Verification Boundary:</strong> Generated test files are statically validated through AST parser checkers before being offered as downloadable archives.
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 05: MODERNIZE */}
              {activeStageIndex === 4 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                        Modernization Pipeline Transparency
                      </span>
                      <span className="text-xs font-mono text-[#86868B]">Strict Separation</span>
                    </div>

                    {/* Funnel: 136 findings -> 37 candidates -> 0 autofix -> 0 diffs -> 0 verified */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
                      <div className="w-full p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-xl font-bold font-mono text-[#1D1D1F]">136</div>
                        <div className="text-[10px] text-[#86868B] uppercase font-bold">Findings</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#86868B] shrink-0 hidden sm:block" />
                      <div className="w-full p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-xl font-bold font-mono text-[#007AFF]">37</div>
                        <div className="text-[10px] text-[#86868B] uppercase font-bold">Candidates</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#86868B] shrink-0 hidden sm:block" />
                      <div className="w-full p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-xl font-bold font-mono text-[#86868B]">0</div>
                        <div className="text-[10px] text-[#86868B] uppercase font-bold">Autofix</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#86868B] shrink-0 hidden sm:block" />
                      <div className="w-full p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-xl font-bold font-mono text-[#86868B]">0</div>
                        <div className="text-[10px] text-[#86868B] uppercase font-bold">Diffs</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#86868B] shrink-0 hidden sm:block" />
                      <div className="w-full p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                        <div className="text-xl font-bold font-mono text-[#86868B]">0</div>
                        <div className="text-[10px] text-[#86868B] uppercase font-bold">Verified</div>
                      </div>
                    </div>

                    <p className="text-xs text-[#6E6E73] leading-relaxed">
                      CodeOracle never pretends every modernization finding is safe to autofix without human approval.
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE 06: SIMULATE */}
              {activeStageIndex === 5 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                        Downstream Blast Radius Ripple
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#EAF4FF] text-[#007AFF]">
                        Simulation Active
                      </span>
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

                    <p className="text-xs text-[#6E6E73] leading-relaxed">
                      Know exactly which entry points will be perturbed before writing a single line of refactored code.
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE 07: PLAN */}
              {activeStageIndex === 6 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                        Migration Waves Sequence
                      </span>
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

            {/* Stage Bottom Footer */}
            <div className="pt-6 border-t border-[#E5E5EA] flex items-center justify-between">
              <p className="text-xs sm:text-sm text-[#1D1D1F] font-medium max-w-[500px]">
                {currentStage.message}
              </p>
              <button
                type="button"
                onClick={() =>
                  setActiveStageIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : 0))
                }
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
