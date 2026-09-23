import React, { useState } from 'react';
import { Milestone, CheckCircle2, ArrowRight } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const MigrationRoadmapSection: React.FC = () => {
  const [selectedWaveIndex, setSelectedWaveIndex] = useState(0);
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();

  const waves = [
    {
      id: 'w0',
      label: 'Wave 0',
      title: 'Protect Baseline',
      subtitle: 'Safety Guardrails First',
      fileCount: '133 suites',
      riskReduction: 'Freezes existing behavior before editing',
      strategy: 'Generate deterministic pytest and Vitest characterization suites for all identified high-risk modules. Download the ZIP or run in CI to establish your test baseline.',
      keyActions: [
        'Generate characterization suites for 116 legacy modules',
        'Verify syntax correctness (133 / 133 valid)',
        'Check coverage against benchmark baseline (73.8% floor)',
      ],
    },
    {
      id: 'w1',
      label: 'Wave 1',
      title: 'Leaf Utilities',
      subtitle: 'Zero Downstream Risk',
      fileCount: '24 files',
      riskReduction: 'Zero caller impact',
      strategy: 'Refactor pure leaf functions, formatters, and mathematical utilities first. Since no other modules depend on their internal side effects, changes cannot cause ripple defects.',
      keyActions: [
        'Modernize string formatting and type annotations',
        'Convert legacy CommonJS require() to ES Modules in leaf helpers',
        'Verify with Wave 0 unit tests before merging',
      ],
    },
    {
      id: 'w2',
      label: 'Wave 2',
      title: 'Cycle Decoupling',
      subtitle: 'Untangle Graph Loops',
      fileCount: '2 cycles',
      riskReduction: 'Eliminates architectural deadlock',
      strategy: 'Isolate circular dependency pairs. Extract shared interface definitions into dedicated contract files to break circular imports between modules.',
      keyActions: [
        'Extract shared domain types to decouple cyclical imports',
        'Refactor circular callbacks into dependency-injected handlers',
        'Verify graph cycle count drops to 0',
      ],
    },
    {
      id: 'w3',
      label: 'Wave 3',
      title: 'Core Services',
      subtitle: 'Domain Logic & Persistence',
      fileCount: '18 files',
      riskReduction: 'Modernizes business value safely',
      strategy: 'Modernize core database models, business logic services, and API clients once leaf utilities and cycle loops have been stabilized.',
      keyActions: [
        'Update legacy ORM queries to SQLAlchemy 2.0 / Prisma',
        'Upgrade async/await patterns and error handlers',
        'Validate integration with Wave 0 regression tests',
      ],
    },
    {
      id: 'w4',
      label: 'Wave 4',
      title: 'Entry Points',
      subtitle: 'Edge Gateways & UI Shell',
      fileCount: '4 files',
      riskReduction: 'Completes end-to-end modernization',
      strategy: 'Finally modernize root HTTP routers, FastAPI endpoints, and React entry point shells once underlying dependencies are hardened.',
      keyActions: [
        'Update route handlers and middleware contracts',
        'Deploy refactored application with verified behavioral equivalence',
        'Deliver downloadable executive Markdown audit report',
      ],
    },
  ];

  const currentWave = waves[selectedWaveIndex];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden">
      <div className="max-w-[1140px] mx-auto">
        <div
          className="text-center max-w-[760px] mx-auto mb-16 transition-all duration-700 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-4 font-geist-mono">
            <Milestone className="w-3.5 h-3.5" />
            <span>Ordered Execution Plan</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-4 font-geist">
            Turn analysis into an ordered modernization roadmap.
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73] leading-relaxed font-sans">
            Never modernize in arbitrary order. CodeOracle sequences work into dependency waves — protecting baselines first and advancing from zero-risk leaves to core entry points.
          </p>
        </div>

        {/* Panoramic Apple Canvas */}
        <div
          className="bg-white rounded-[32px] border border-[#E5E5EA] shadow-apple-md p-6 sm:p-10 transition-all duration-700 delay-100 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 32px, 0)',
          }}
        >
          {/* Animated Progressive Timeline Line */}
          <div className="mb-6 px-2 sm:px-6">
            <div className="flex items-center justify-between text-xs font-mono text-[#86868B] mb-2 font-geist-mono">
              <span className="text-[#007AFF] font-bold">Wave 0: Safety Baseline</span>
              <span>Dependency Order</span>
              <span className="text-[#34C759] font-bold">Wave 4: Root Shell</span>
            </div>
            <div className="relative h-2 bg-[#F5F5F7] rounded-full overflow-hidden border border-[#E5E5EA]">
              <div
                className="h-full bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#34C759] transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${((selectedWaveIndex + 1) / waves.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Horizontal Wave Selector Progression Ribbon */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#E5E5EA] pb-6 mb-8 overflow-x-auto">
            {waves.map((w, idx) => {
              const isSelected = idx === selectedWaveIndex;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWaveIndex(idx)}
                  className={`flex-1 min-w-[180px] p-4 rounded-2xl text-left transition-all duration-300 border ${
                    isSelected
                      ? 'bg-[#F5F5F7] border-[#007AFF] shadow-apple scale-[1.02]'
                      : 'bg-white border-transparent hover:bg-[#F5F5F7]/60 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    opacity: prefersReduced || inView ? 1 : 0,
                    transform: prefersReduced || inView ? 'none' : 'translate3d(0, 16px, 0)',
                    transitionDelay: prefersReduced ? '0ms' : `${idx * 80}ms`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md transition-colors ${
                        isSelected ? 'bg-[#007AFF] text-white shadow-sm' : 'bg-[#E5E5EA] text-[#6E6E73]'
                      }`}
                    >
                      {w.label}
                    </span>
                    <span className="text-[11px] font-mono text-[#86868B]">{w.fileCount}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1D1D1F] truncate">{w.title}</h4>
                  <p className="text-xs text-[#86868B] truncate mt-0.5">{w.subtitle}</p>
                </button>
              );
            })}
          </div>

          {/* Panoramic Wave Detail Panel with unroll */}
          <div
            key={currentWave.id}
            className="bg-[#F5F5F7] rounded-2xl p-6 sm:p-8 border border-[#E5E5EA] transition-all duration-400 ease-out animate-in fade-in slide-in-from-bottom-2"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5EA]">
              <div>
                <span className="text-xs font-mono font-bold text-[#007AFF] uppercase">
                  {currentWave.label} Detailed Execution Guide
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] mt-1">
                  {currentWave.title} — {currentWave.subtitle}
                </h3>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-white border border-[#E5E5EA] text-xs font-mono font-bold text-[#248A3D] shadow-sm">
                Target: {currentWave.riskReduction}
              </div>
            </div>

            <div className="py-6 space-y-4">
              <p className="text-sm sm:text-base text-[#424245] leading-relaxed">
                {currentWave.strategy}
              </p>

              <div className="pt-2 space-y-2">
                <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider block">
                  Prescribed Actions:
                </span>
                {currentWave.keyActions.map((action) => (
                  <div key={action} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#1D1D1F]">
                    <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E5EA] flex items-center justify-between text-xs text-[#86868B]">
              <span>Wave {selectedWaveIndex + 1} of 5 in sequence</span>
              <button
                type="button"
                onClick={() =>
                  setSelectedWaveIndex((prev) => (prev < waves.length - 1 ? prev + 1 : 0))
                }
                className="text-[#007AFF] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Inspect Next Wave</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MigrationRoadmapSection;
