import React, { useState, useEffect } from 'react';
import {
  Flame,
  FileCode,
} from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const RiskSection: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'anomaly' | 'demand' | 'auth'>('anomaly');
  const [sectionRef, inView] = useInView({ threshold: 0.2 });
  const prefersReduced = useReducedMotion();
  const [displayScore, setDisplayScore] = useState(0);

  const moduleData = {
    anomaly: {
      name: 'AnomalyExplainPanel.tsx',
      path: 'frontend/src/components/AnomalyExplainPanel.tsx',
      overallScore: 63,
      riskLevel: 'HIGH',
      factors: [
        { name: 'Cyclomatic Complexity (CC)', value: '21', weight: '35%', desc: 'Heavily nested branching conditions & multi-state reducers' },
        { name: 'Static Lint Warnings', value: '6', weight: '20%', desc: 'Unchecked null assertions and missing prop validations' },
        { name: 'Caller Influx (Fan-In)', value: '4 modules', weight: '25%', desc: 'Rendered directly by Dashboard, Inspection, and Summary views' },
        { name: 'Downstream Blast Radius', value: '1 module', weight: '20%', desc: 'Breaks parent view contract if exported interface changes' },
      ],
    },
    demand: {
      name: 'demand_service.py',
      path: 'backend/app/services/demand_service.py',
      overallScore: 58,
      riskLevel: 'MEDIUM',
      factors: [
        { name: 'Cyclomatic Complexity (CC)', value: '18', weight: '35%', desc: 'Data transformation loops across inconsistent date formats' },
        { name: 'Static Lint Warnings', value: '3', weight: '20%', desc: 'Unused type hints and deprecated parameter names' },
        { name: 'Caller Influx (Fan-In)', value: '7 modules', weight: '25%', desc: 'Central orchestration for forecasts, reports, and billing' },
        { name: 'Downstream Blast Radius', value: '3 modules', weight: '20%', desc: 'Direct database mutation impacts invoice generation' },
      ],
    },
    auth: {
      name: 'auth_middleware.js',
      path: 'backend/middleware/auth_middleware.js',
      overallScore: 71,
      riskLevel: 'HIGH',
      factors: [
        { name: 'Cyclomatic Complexity (CC)', value: '24', weight: '35%', desc: 'Token parsing, cookie fallback, and RBAC matrix logic' },
        { name: 'Static Lint Warnings', value: '8', weight: '20%', desc: 'Legacy var declarations and loose equality checks' },
        { name: 'Caller Influx (Fan-In)', value: '12 routes', weight: '25%', desc: 'Pre-flight interceptor for all secure endpoints' },
        { name: 'Downstream Blast Radius', value: '12 endpoints', weight: '20%', desc: 'High blast radius affects every protected client call' },
      ],
    },
  };

  const current = moduleData[activeModule];

  // Animate score counter when in view or module changes
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
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(start + (target - start) * ease);
      setDisplayScore(val);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [inView, current.overallScore, prefersReduced]);

  return (
    <section id="risk-section" ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden">
      <div className="max-w-[1140px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Text & Editorial Explanation (5 cols) */}
          <div
            className="lg:col-span-5 space-y-6 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(-36px, 0, 0)',
            }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1F0] text-[#D7261C] text-xs font-semibold uppercase tracking-wider font-geist-mono">
              <Flame className="w-3.5 h-3.5" />
              <span>Hotspot Explainability</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-[1.06] font-geist">
              Complexity is not the same as risk.
            </h2>

            <p className="text-base text-[#6E6E73] leading-relaxed font-sans">
              A 500-line utility with pure functions and zero callers is harmless. A 60-line authentication middleware with high fan-in and missing tests can bring down an entire service.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center font-bold text-xs text-[#007AFF] shrink-0 mt-0.5 shadow-sm">
                  1
                </div>
                <p className="text-xs sm:text-sm text-[#424245]">
                  <strong className="text-[#1D1D1F]">Multi-Factor Decomposition:</strong> CodeOracle factors cyclomatic complexity, AST warnings, fan-in callers, and blast radius into an explainable 0–100 score.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center font-bold text-xs text-[#007AFF] shrink-0 mt-0.5 shadow-sm">
                  2
                </div>
                <p className="text-xs sm:text-sm text-[#424245]">
                  <strong className="text-[#1D1D1F]">Zero Black Boxes:</strong> Every score directly shows the contributing variables and weights so engineering leads can audit why a file was ranked #1.
                </p>
              </div>
            </div>

            {/* Quick Module Switcher */}
            <div className="pt-4 flex items-center gap-2">
              <span className="text-xs text-[#86868B] font-semibold">Inspect Target:</span>
              <div className="inline-flex rounded-full bg-white p-1 border border-[#E5E5EA] shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveModule('anomaly')}
                  className={`px-3 py-1 text-xs rounded-full font-mono transition-all ${
                    activeModule === 'anomaly'
                      ? 'bg-[#1D1D1F] text-white font-bold shadow-sm'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  AnomalyExplain
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('demand')}
                  className={`px-3 py-1 text-xs rounded-full font-mono transition-all ${
                    activeModule === 'demand'
                      ? 'bg-[#1D1D1F] text-white font-bold shadow-sm'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  demand_service
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('auth')}
                  className={`px-3 py-1 text-xs rounded-full font-mono transition-all ${
                    activeModule === 'auth'
                      ? 'bg-[#1D1D1F] text-white font-bold shadow-sm'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  auth_middleware
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Score Breakdown Card (7 cols) */}
          <div
            className="lg:col-span-7 bg-white rounded-[32px] border border-[#E5E5EA] shadow-apple-md p-6 sm:p-8 transition-all duration-700 delay-100 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(36px, 0, 0)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-[#E5E5EA]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileCode className="w-4 h-4 text-[#007AFF]" />
                  <h3 className="font-mono text-sm sm:text-base font-bold text-[#1D1D1F]">
                    {current.name}
                  </h3>
                </div>
                <p className="text-xs text-[#86868B] font-mono">{current.path}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-[#86868B] uppercase font-bold">Hotspot Score</div>
                  <div className="text-3xl font-bold font-mono text-[#D7261C] tracking-tight">
                    {displayScore} <span className="text-xs text-[#86868B]">/ 100</span>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    current.riskLevel === 'HIGH'
                      ? 'bg-[#FFF1F0] text-[#D7261C] border border-[#FFC5C2]'
                      : 'bg-[#FFF7EA] text-[#B26A00] border border-[#FFE1B0]'
                  }`}
                >
                  {current.riskLevel}
                </span>
              </div>
            </div>

            {/* Score Factor Breakdown Rows */}
            <div className="space-y-4 pt-6">
              {current.factors.map((f, i) => (
                <div
                  key={f.name}
                  className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] hover:border-[#D2D2D7] transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs sm:text-sm font-bold text-[#1D1D1F]">
                      {f.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#86868B]">Weight: {f.weight}</span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#007AFF] bg-white px-2 py-0.5 rounded-md border border-[#E5E5EA]">
                        {f.value}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#6E6E73] leading-relaxed mb-2">{f.desc}</p>
                  
                  {/* Subtle Factor Bar Indicator */}
                  <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#007AFF] rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: inView ? f.weight : '0%',
                        transitionDelay: `${i * 120}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Formula Footnote */}
            <div className="mt-6 pt-4 border-t border-[#E5E5EA] flex items-center justify-between text-[11px] text-[#86868B] font-mono">
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
