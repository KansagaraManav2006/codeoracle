import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileCode2,
  GitCompare,
  Milestone,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { useScrollProgress, useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

interface ModernizationStep {
  id: string;
  stepNum: string;
  title: string;
  shortLabel: string;
  badge: string;
  summary: string;
  metric: string;
  metricLabel: string;
  visualType: 'ast' | 'candidates' | 'guardrails' | 'diff' | 'verify' | 'waves';
  detail: {
    heading: string;
    subheading: string;
    codeSnippet?: string;
    items?: string[];
  };
}

const MODERNIZATION_STEPS: ModernizationStep[] = [
  {
    id: 'step-1',
    stepNum: '01',
    title: 'AST Pattern Discovery',
    shortLabel: '1. Discovery',
    badge: 'Static AST Parser',
    summary: 'Tree-sitter and AST parsers traverse all repository source files to uncover deprecated syntax, obsolete framework calls, and legacy idioms without executing runtime code.',
    metric: '136',
    metricLabel: 'Legacy Findings Found',
    visualType: 'ast',
    detail: {
      heading: 'Pattern Detection & Classification',
      subheading: 'Identified 136 legacy patterns across Python, TypeScript, and JavaScript',
      codeSnippet: `// Detected in backend/middleware/auth_middleware.js:42
- var token = req.headers['authorization'];
- if (token == null) return res.send(401);
+ const authHeader = req.headers['authorization'];
+ const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;`,
      items: [
        'Python 2 print statements and unicode literals mapped',
        'CommonJS require() and module.exports cataloged',
        'Unchecked null assertions in React props identified',
      ],
    },
  },
  {
    id: 'step-2',
    stepNum: '02',
    title: 'Candidate Triage & Blast Radius',
    shortLabel: '2. Triage',
    badge: 'Risk Analysis',
    summary: 'Not every finding should be touched. CodeOracle calculates caller fan-in and downstream blast radius to triage high-value candidates from high-risk core anchors.',
    metric: '37',
    metricLabel: 'Actionable Candidates',
    visualType: 'candidates',
    detail: {
      heading: 'Risk vs Value Priority Matrix',
      subheading: '37 high-value refactoring opportunities prioritized by lowest ripple risk',
      items: [
        '24 Leaf utilities flagged for immediate zero-risk upgrade',
        '9 Service modules isolated for subsequent wave refactoring',
        '4 Root entry routers quarantined pending characterization suites',
      ],
    },
  },
  {
    id: 'step-3',
    stepNum: '03',
    title: 'Characterization Guardrails',
    shortLabel: '3. Guardrails',
    badge: 'Baseline Freeze',
    summary: 'Before modifying a single line of legacy code, CodeOracle generates deterministic characterization tests to freeze current input-output contracts in place.',
    metric: '133',
    metricLabel: 'Test Suites Generated',
    visualType: 'guardrails',
    detail: {
      heading: 'Automated Behavioral Pinning',
      subheading: 'Deterministic pytest and Vitest suites ready for export into CI',
      codeSnippet: `def test_characterization_legacy_forecast_router():
    # Behavioral boundary frozen prior to modernization
    response = client.get("/api/v1/forecast/summary?store_id=14")
    assert response.status_code == 200
    assert "demand_variance" in response.json()
    assert response.json()["model_version"] == "v1.2.0-legacy"`,
      items: [
        '100% Syntax validated (133 / 133 valid AST)',
        'Edge case assertions generated from parameter types',
        'Isolated mock contracts for external third-party calls',
      ],
    },
  },
  {
    id: 'step-4',
    stepNum: '04',
    title: 'Semantic Unified Diffs',
    shortLabel: '4. Diffs',
    badge: 'Non-Destructive',
    summary: 'Modernization suggestions are generated strictly as transparent unified diffs. Source files on disk or remote branches are never mutated automatically.',
    metric: 'Unified',
    metricLabel: 'Non-Destructive Diffs',
    visualType: 'diff',
    detail: {
      heading: 'Side-by-Side Semantic Transformation Preview',
      subheading: 'Review every diff before applying — zero hallucinated rewrites',
      codeSnippet: `@@ -18,7 +18,9 @@
- from typing import List, Dict, Optional
+ from typing import Sequence
+ from pydantic import BaseModel, Field
 
- def calculate_variance(records: List[Dict]) -> float:
-     return sum([r['val'] for r in records]) / len(records)
+ def calculate_variance(records: Sequence[RecordSchema]) -> float:
+     if not records:
+         return 0.0
+     return sum(r.val for r in records) / len(records)`,
      items: [
        'Pydantic v2 validation upgrade with type safety',
        'List comprehension optimized to lazy generator evaluation',
        'Zero-division guardrail added for empty dataset resilience',
      ],
    },
  },
  {
    id: 'step-5',
    stepNum: '05',
    title: 'Behavioral Parity Verification',
    shortLabel: '5. Verification',
    badge: 'Strict Parity',
    summary: 'Proposed modernizations are validated against the characterization suites to prove zero behavioral regressions. Changes that fail parity are rejected immediately.',
    metric: '100%',
    metricLabel: 'Behavioral Parity Check',
    visualType: 'verify',
    detail: {
      heading: 'Automated Parity Verification Check',
      subheading: 'Verification ladder ensures no functional regressions occurred',
      items: [
        'Syntax check: PASS (0 AST syntax errors)',
        'Typecheck parity: PASS (TypeScript 5.4 / MyPy strict)',
        'Characterization assertions: PASS (42 of 42 assertions hold)',
        'Downstream contract validation: ZERO breaking changes',
      ],
    },
  },
  {
    id: 'step-6',
    stepNum: '06',
    title: 'Dependency Wave Orchestration',
    shortLabel: '6. Wave Rollout',
    badge: 'Dependency Order',
    summary: 'Verified changes are organized into ordered dependency waves — deploying pure leaf utilities first and advancing to core domain services only when baselines are proven.',
    metric: '5 Waves',
    metricLabel: 'Topological Sequence',
    visualType: 'waves',
    detail: {
      heading: 'Topological Modernization Roadmap',
      subheading: 'Step-by-step rollout eliminates circular deadlock and cascade bugs',
      items: [
        'Wave 0: Characterization test baseline & CI freeze',
        'Wave 1: Pure leaf utilities (zero caller side-effects)',
        'Wave 2: Circular dependency pair decoupling',
        'Wave 3: Core domain persistence & ORM services',
        'Wave 4: Root HTTP routers and gateway shell',
      ],
    },
  },
];

export const ModernizationSection: React.FC = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);
  const [containerRef, scrollProgress] = useScrollProgress();
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync scroll progress with active step
  useEffect(() => {
    if (manualOverride || prefersReduced) return;
    if (scrollProgress > 0 && scrollProgress < 1) {
      const step = Math.min(
        MODERNIZATION_STEPS.length - 1,
        Math.floor(scrollProgress * MODERNIZATION_STEPS.length)
      );
      setActiveStepIndex(step);
    }
  }, [scrollProgress, manualOverride, prefersReduced]);

  const handleStepClick = (idx: number) => {
    setActiveStepIndex(idx);
    setManualOverride(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setManualOverride(false), 4500);
  };

  const currentStep = MODERNIZATION_STEPS[activeStepIndex];

  return (
    <div
      ref={containerRef}
      id="modernization-section"
      className={`relative w-full ${prefersReduced ? 'py-16' : 'min-h-[160vh] md:min-h-[190vh]'}`}
    >
      {/* Sticky Scrollytelling Viewport */}
      <section
        ref={sectionRef}
        className={`${
          prefersReduced
            ? 'relative'
            : 'sticky top-12 md:top-16 min-h-[calc(100vh-3.5rem)] flex flex-col justify-center'
        } py-10 md:py-16 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden`}
      >
        <div className="max-w-[1140px] mx-auto w-full">
          {/* Section Header: Remains Pinned and Visible */}
          <div
            className="text-center max-w-[760px] mx-auto mb-8 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
            }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-3 font-geist-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pinned Modernization Sequence</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-3 font-geist">
              A suggestion is not the same as a safe change.
            </h2>
            <p className="text-sm sm:text-base text-[#6E6E73] leading-relaxed font-sans">
              CodeOracle enforces a rigorous 6-step transformation sequence — proving behavioral parity before any proposal touches your repository.
            </p>
          </div>

          {/* Persistent Step Navigation Tabs */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
            {MODERNIZATION_STEPS.map((s, idx) => {
              const isActive = idx === activeStepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStepClick(idx)}
                  className={`flex-1 min-w-[130px] p-2.5 sm:p-3 rounded-2xl text-left transition-all duration-300 border ${
                    isActive
                      ? 'bg-white border-[#007AFF] shadow-apple scale-[1.02]'
                      : 'bg-white/60 border-[#E5E5EA] hover:bg-white text-[#6E6E73] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#E5E5EA] text-[#6E6E73]'
                      }`}
                    >
                      {s.stepNum}
                    </span>
                    <span className="text-[10px] font-mono text-[#86868B]">
                      {s.badge}
                    </span>
                  </div>
                  <div
                    className={`text-xs font-bold truncate ${
                      isActive ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
                    }`}
                  >
                    {s.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Product Visualization Canvas for Current Step */}
          <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-[#E5E5EA] shadow-apple-lg p-6 sm:p-8 transition-all duration-500 ease-out">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Step Description & Metrics (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#EAF4FF] text-[#007AFF]">
                    Step {currentStep.stepNum} of 06
                  </span>
                  <span className="text-xs text-[#86868B] font-mono">•</span>
                  <span className="text-xs text-[#86868B] font-mono">{currentStep.badge}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] font-geist leading-snug">
                  {currentStep.title}
                </h3>

                <p className="text-sm text-[#6E6E73] leading-relaxed font-sans">
                  {currentStep.summary}
                </p>

                {/* Key Metric Card */}
                <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block">
                      {currentStep.metricLabel}
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-[#1D1D1F]">
                      {currentStep.metric}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#007AFF] shadow-sm">
                    {activeStepIndex === 0 && <FileCode2 className="w-5 h-5" />}
                    {activeStepIndex === 1 && <Sparkles className="w-5 h-5" />}
                    {activeStepIndex === 2 && <ShieldCheck className="w-5 h-5 text-[#34C759]" />}
                    {activeStepIndex === 3 && <GitCompare className="w-5 h-5" />}
                    {activeStepIndex === 4 && <CheckCircle2 className="w-5 h-5 text-[#34C759]" />}
                    {activeStepIndex === 5 && <Milestone className="w-5 h-5" />}
                  </div>
                </div>

                {/* Next Step Hint */}
                <div className="pt-2 flex items-center justify-between text-xs text-[#86868B] font-mono">
                  <span>Scroll or click tabs to progress</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleStepClick(
                        activeStepIndex < MODERNIZATION_STEPS.length - 1
                          ? activeStepIndex + 1
                          : 0
                      )
                    }
                    className="inline-flex items-center gap-1 text-[#007AFF] hover:underline font-semibold"
                  >
                    <span>
                      {activeStepIndex < MODERNIZATION_STEPS.length - 1
                        ? 'Next Step'
                        : 'Restart Flow'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Interactive Product State Visualization (7 cols) */}
              <div className="lg:col-span-7 bg-[#F5F5F7] rounded-2xl p-5 sm:p-6 border border-[#E5E5EA] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] animate-pulse" />
                    <span className="font-bold text-[#1D1D1F] font-mono">
                      {currentStep.detail.heading}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#86868B] font-mono">
                    Phase // {currentStep.id}
                  </span>
                </div>

                <p className="text-xs text-[#6E6E73] font-medium">
                  {currentStep.detail.subheading}
                </p>

                {/* Live Code / Unified Diff View */}
                {currentStep.detail.codeSnippet && (
                  <div className="bg-[#1D1D1F] rounded-xl p-4 text-xs font-mono text-white/90 overflow-x-auto shadow-sm">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-white/50">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3 h-3 text-[#007AFF]" />
                        <span>transformation_preview.diff</span>
                      </span>
                      <span className="text-[#34C759]">AST Verified</span>
                    </div>
                    <pre className="text-[11px] leading-relaxed text-[#34C759]">
                      {currentStep.detail.codeSnippet}
                    </pre>
                  </div>
                )}

                {/* Checklist of Verification Points */}
                {currentStep.detail.items && (
                  <div className="space-y-2 pt-1">
                    {currentStep.detail.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2.5 text-xs text-[#1D1D1F] bg-white p-2.5 rounded-xl border border-[#E5E5EA]/80"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
                        <span className="font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ModernizationSection;
