import React, { useState, useEffect } from 'react';
import {
  Flame,
  FileCode,
} from 'lucide-react';
import { useInView, useSectionScrollProgress, useReducedMotion } from '../../hooks/useScrollAnimation';

export const RiskSection: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'anomaly' | 'demand' | 'auth'>('anomaly');
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const [scrollRef, sectionProgress] = useSectionScrollProgress();
  const prefersReduced = useReducedMotion();
  const [displayScore, setDisplayScore] = useState(0);
  const [barsAnimated, setBarsAnimated] = useState(false);

  // Combine both refs into a single callback ref
  const setCombinedRef = (el: HTMLDivElement | null) => {
    (sectionRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const moduleData = {
    anomaly: {
      name: 'AnomalyExplainPanel.tsx',
      path: 'frontend/src/components/AnomalyExplainPanel.tsx',
      overallScore: 63,
      riskLevel: 'HIGH',
      factors: [
        { name: 'Cyclomatic Complexity (CC)', value: '21', weight: '35%', desc: 'Heavily nested branching conditions & multi-state reducers', pct: 35 },
        { name: 'Static Lint Warnings', value: '6', weight: '20%', desc: 'Unchecked null assertions and missing prop validations', pct: 20 },
        { name: 'Caller Influx (Fan-In)', value: '4 modules', weight: '25%', desc: 'Rendered directly by Dashboard, Inspection, and Summary views', pct: 25 },
        { name: 'Downstream Blast Radius', value: '1 module', weight: '20%', desc: 'Breaks parent view contract if exported interface changes', pct: 20 },
      ],
    },
    demand: {
      name: 'demand_service.py',
      path: 'backend/app/services/demand_service.py',
      overallScore: 58,
      riskLevel: 'MEDIUM',
      factors: [
        { name: 'Cyclomatic Complexity (CC)', value: '18', weight: '35%', desc: 'Data transformation loops across inconsistent date formats', pct: 35 },
        { name: 'Static Lint Warnings', value: '3', weight: '20%', desc: 'Unused type hints and deprecated parameter names', pct: 20 },
        { name: 'Caller Influx (Fan-In)', value: '7 modules', weight: '25%', desc: 'Central orchestration for forecasts, reports, and billing', pct: 25 },
        { name: 'Downstream Blast Radius', value: '3 modules', weight: '20%', desc: 'Direct database mutation impacts invoice generation', pct: 20 },
      ],
    },
    auth: {
      name: 'auth_middleware.js',
      path: 'backend/middleware/auth_middleware.js',
      overallScore: 71,
      riskLevel: 'HIGH',
      factors: [
        { name: 'Cyclomatic Complexity (CC)', value: '24', weight: '35%', desc: 'Token parsing, cookie fallback, and RBAC matrix logic', pct: 35 },
        { name: 'Static Lint Warnings', value: '8', weight: '20%', desc: 'Legacy var declarations and loose equality checks', pct: 20 },
        { name: 'Caller Influx (Fan-In)', value: '12 routes', weight: '25%', desc: 'Pre-flight interceptor for all secure endpoints', pct: 25 },
        { name: 'Downstream Blast Radius', value: '12 endpoints', weight: '20%', desc: 'High blast radius affects every protected client call', pct: 20 },
      ],
    },
  };

  const current = moduleData[activeModule];

  // Animate score counter
  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) {
      setDisplayScore(current.overallScore);
      return;
    }
    let start = 0;
    const target = current.overallScore;
    const duration = 900;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (target - start) * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [inView, current.overallScore, prefersReduced]);

  // Trigger bar animation
  useEffect(() => {
    if (inView && !barsAnimated) {
      const t = setTimeout(() => setBarsAnimated(true), 200);
      return () => clearTimeout(t);
    }
  }, [inView]);

  // Reset bars on module change for re-animation
  useEffect(() => {
    if (inView) {
      setBarsAnimated(false);
      const t = setTimeout(() => setBarsAnimated(true), 60);
      return () => clearTimeout(t);
    }
  }, [activeModule]);

  // Secondary scale for right panel — as section scrolls through viewport, right panel becomes focal point
  const rightPanelSecondaryScale = prefersReduced
    ? 1
    : 1 + Math.min(Math.max((sectionProgress - 0.3) * 0.06, 0), 0.04);

  const enterLeft = prefersReduced || inView ? 'none' : 'translate3d(-52px, 0, 0)';
  const enterRight = prefersReduced || inView
    ? `scale(${rightPanelSecondaryScale}) translate3d(0, 0, 0)`
    : 'translate3d(52px, 0, 0) scale(0.92)';

  return (
    <section
      id="risk-section"
      ref={setCombinedRef}
      className="min-h-[100svh] w-full flex flex-col justify-center py-10 lg:py-14 pt-20 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden"
    >
      <div className="max-w-[1140px] w-full mx-auto my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column — slides in from left */}
          <div
            className="lg:col-span-5 space-y-4"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: enterLeft,
              transition: 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'opacity, transform',
            }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFF1F0] text-[#D7261C] text-[11px] font-semibold uppercase tracking-wider font-geist-mono">
              <Flame className="w-3 h-3" />
              <span>Hotspot Explainability</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-[#1D1D1F] leading-[1.08] font-geist">
              Complexity is not the same as risk.
            </h2>

            <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed font-sans">
              A 500-line utility with pure functions and zero callers is harmless. A 60-line authentication middleware with high fan-in and missing tests can bring down an entire service.
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center font-bold text-[11px] text-[#007AFF] shrink-0 mt-0.5 shadow-xs">1</div>
                <p className="text-xs text-[#424245] leading-relaxed">
                  <strong className="text-[#1D1D1F]">Multi-Factor Decomposition:</strong> CodeOracle factors cyclomatic complexity, AST warnings, fan-in callers, and blast radius into an explainable 0–100 score.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center font-bold text-[11px] text-[#007AFF] shrink-0 mt-0.5 shadow-xs">2</div>
                <p className="text-xs text-[#424245] leading-relaxed">
                  <strong className="text-[#1D1D1F]">Zero Black Boxes:</strong> Every score directly shows contributing variables so engineering leads can audit why a file was ranked #1.
                </p>
              </div>
            </div>

            {/* Quick Module Switcher */}
            <div className="pt-1 flex items-center gap-2">
              <span className="text-xs text-[#86868B] font-semibold font-geist-mono">Target:</span>
              <div className="inline-flex rounded-full bg-white p-1 border border-[#E5E5EA] shadow-xs">
                {(['anomaly', 'demand', 'auth'] as const).map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setActiveModule(mod)}
                    className={`px-3 py-1 text-xs rounded-full font-mono transition-all ${
                      activeModule === mod ? 'bg-[#1D1D1F] text-white font-bold shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {mod === 'anomaly' ? 'AnomalyExplain' : mod === 'demand' ? 'demand_service' : 'auth_middleware'}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight Formula Card */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E5E5EA] shadow-apple space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#1D1D1F] uppercase tracking-wider text-[11px]">Explainable Weight Formula</span>
                <span className="text-[#007AFF] font-bold">100% Deterministic</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { weight: '35% WEIGHT', label: 'Cyclomatic CC' },
                  { weight: '20% WEIGHT', label: 'AST Debt Warnings' },
                  { weight: '25% WEIGHT', label: 'Caller Fan-In' },
                  { weight: '20% WEIGHT', label: 'Blast Radius' },
                ].map((f) => (
                  <div key={f.label} className="p-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]/70">
                    <span className="text-[#86868B] block text-[10px]">{f.weight}</span>
                    <span className="font-bold text-[#1D1D1F]">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column — slides in from right + secondary scale focus */}
          <div
            className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-[#E5E5EA] shadow-apple-md p-5 sm:p-6"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: enterRight,
              transition: 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.08s, transform 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.08s',
              willChange: 'opacity, transform',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-[#E5E5EA]">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FileCode className="w-3.5 h-3.5 text-[#007AFF]" />
                  <h3 className="font-mono text-sm sm:text-base font-bold text-[#1D1D1F]">{current.name}</h3>
                </div>
                <p className="text-[11px] text-[#86868B] font-mono">{current.path}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-[#86868B] uppercase font-bold">Hotspot Score</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[#D7261C] tracking-tight">
                    {displayScore} <span className="text-[10px] text-[#86868B]">/ 100</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                  current.riskLevel === 'HIGH'
                    ? 'bg-[#FFF1F0] text-[#D7261C] border border-[#FFC5C2]'
                    : 'bg-[#FFF7EA] text-[#B26A00] border border-[#FFE1B0]'
                }`}>
                  {current.riskLevel}
                </span>
              </div>
            </div>

            {/* Factor Breakdown with staggered bar animation */}
            <div className="space-y-2.5 pt-4">
              {current.factors.map((f, i) => (
                <div
                  key={f.name}
                  className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] hover:border-[#D2D2D7] transition-all"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'none' : 'translate3d(0, 12px, 0)',
                    transition: `opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${100 + i * 120}ms, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${100 + i * 120}ms`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-bold text-[#1D1D1F]">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#86868B]">Weight: {f.weight}</span>
                      <span className="font-mono text-xs font-bold text-[#007AFF] bg-white px-1.5 py-0.5 rounded border border-[#E5E5EA]">{f.value}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6E6E73] leading-relaxed mb-1.5">{f.desc}</p>
                  <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#007AFF] rounded-full"
                      style={{
                        width: barsAnimated ? `${f.pct}%` : '0%',
                        transition: `width 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 160}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Formula Footnote */}
            <div className="mt-4 pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-[10px] text-[#86868B] font-mono">
              <span>Risk = 0.35(CC) + 0.20(Warnings) + 0.25(FanIn) + 0.20(BlastRadius)</span>
              <span className="text-[#34C759] font-bold">100% Explainable</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RiskSection;
