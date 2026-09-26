import React, { useState, useEffect } from 'react';
import { Milestone, CheckCircle2, ArrowRight } from 'lucide-react';
import { useScrollProgress, useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const MigrationRoadmapSection: React.FC = () => {
  const [selectedWaveIndex, setSelectedWaveIndex] = useState(0);
  const [displayedWaveIndex, setDisplayedWaveIndex] = useState(0);
  const [sectionRef, inView] = useInView({ threshold: 0.12 });
  const [scrollContainerRef, scrollProgress] = useScrollProgress();
  const prefersReduced = useReducedMotion();
  const [manualOverride, setManualOverride] = useState(false);

  const waves = [
    {
      id: 'w0', label: 'Wave 0', title: 'Protect Baseline', subtitle: 'Safety Guardrails First',
      fileCount: '133 suites', riskReduction: 'Freezes existing behavior before editing',
      strategy: 'Generate deterministic pytest and Vitest characterization suites for all identified high-risk modules. Download the ZIP or run in CI to establish your test baseline.',
      keyActions: ['Generate characterization suites for 116 legacy modules', 'Verify syntax correctness (133 / 133 valid)', 'Check coverage against benchmark baseline (73.8% floor)'],
    },
    {
      id: 'w1', label: 'Wave 1', title: 'Leaf Utilities', subtitle: 'Zero Downstream Risk',
      fileCount: '24 files', riskReduction: 'Zero caller impact',
      strategy: 'Refactor pure leaf functions, formatters, and mathematical utilities first. Since no other modules depend on their internal side effects, changes cannot cause ripple defects.',
      keyActions: ['Modernize string formatting and type annotations', 'Convert legacy CommonJS require() to ES Modules in leaf helpers', 'Verify with Wave 0 unit tests before merging'],
    },
    {
      id: 'w2', label: 'Wave 2', title: 'Cycle Decoupling', subtitle: 'Untangle Graph Loops',
      fileCount: '2 cycles', riskReduction: 'Eliminates architectural deadlock',
      strategy: 'Isolate circular dependency pairs. Extract shared interface definitions into dedicated contract files to break circular imports between modules.',
      keyActions: ['Extract shared domain types to decouple cyclical imports', 'Refactor circular callbacks into dependency-injected handlers', 'Verify graph cycle count drops to 0'],
    },
    {
      id: 'w3', label: 'Wave 3', title: 'Core Services', subtitle: 'Domain Logic & Persistence',
      fileCount: '18 files', riskReduction: 'Modernizes business value safely',
      strategy: 'Modernize core database models, business logic services, and API clients once leaf utilities and cycle loops have been stabilized.',
      keyActions: ['Update legacy ORM queries to SQLAlchemy 2.0 / Prisma', 'Upgrade async/await patterns and error handlers', 'Validate integration with Wave 0 regression tests'],
    },
    {
      id: 'w4', label: 'Wave 4', title: 'Entry Points', subtitle: 'Edge Gateways & UI Shell',
      fileCount: '4 files', riskReduction: 'Completes end-to-end modernization',
      strategy: 'Finally modernize root HTTP routers, FastAPI endpoints, and React entry point shells once underlying dependencies are hardened.',
      keyActions: ['Update route handlers and middleware contracts', 'Deploy refactored application with verified behavioral equivalence', 'Deliver downloadable executive Markdown audit report'],
    },
  ];

  // Scroll-driven wave auto-advancement
  useEffect(() => {
    if (manualOverride || prefersReduced || scrollProgress <= 0 || scrollProgress >= 1) return;
    const waveIdx = Math.min(waves.length - 1, Math.floor(scrollProgress * waves.length));
    if (waveIdx !== selectedWaveIndex) {
      setSelectedWaveIndex(waveIdx);
      setDisplayedWaveIndex(waveIdx);
    }
  }, [scrollProgress, manualOverride, prefersReduced]);

  const handleWaveClick = (idx: number) => {
    setSelectedWaveIndex(idx);
    setDisplayedWaveIndex(idx);
    setManualOverride(true);
    setTimeout(() => setManualOverride(false), 5000);
  };

  const currentWave = waves[displayedWaveIndex];

  // Progress bar: tied to selectedWaveIndex
  const progressPct = ((selectedWaveIndex) / (waves.length - 1)) * 100;

  return (
    <div
      ref={scrollContainerRef}
      className={`relative w-full ${prefersReduced ? '' : 'min-h-[280vh]'}`}
    >
      <section
        id="migration-roadmap"
        ref={sectionRef}
        className={`${prefersReduced ? 'relative py-8' : 'sticky top-12 md:top-14 h-[calc(100svh-3.5rem)] flex flex-col justify-center'}
          py-8 lg:py-12 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden`}
      >
        <div className="max-w-[1140px] w-full mx-auto my-auto">
          {/* Section Header */}
          <div
            className="text-center max-w-[760px] mx-auto mb-3.5 sm:mb-5"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 20px, 0)',
              transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAF4FF] text-[#007AFF] text-[11px] font-semibold uppercase tracking-wider mb-2 font-geist-mono">
              <Milestone className="w-3 h-3" />
              <span>Phased Modernization Waves</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-1.5 font-geist">
              Phased Migration Roadmap: Turn analysis into an ordered execution plan.
            </h2>
            <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed max-w-[660px] mx-auto font-sans">
              Never modernize in arbitrary order. CodeOracle sequences work into dependency waves — protecting baselines first and advancing from zero-risk leaves to core entry points.
            </p>
          </div>

          {/* Panoramic Apple Canvas */}
          <div
            className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5E5EA] shadow-apple-md p-4 sm:p-6"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
              transition: 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.1s, transform 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            }}
          >
            {/* Progressive Timeline Line — scroll-driven fill */}
            <div className="mb-3.5 px-1 sm:px-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#86868B] mb-1.5 font-geist-mono">
                <span className="text-[#007AFF] font-bold">Wave 0: Safety Baseline</span>
                <span>Topological Dependency Order</span>
                <span className="text-[#34C759] font-bold">Wave 4: Root Shell</span>
              </div>
              <div className="relative h-1.5 bg-[#F5F5F7] rounded-full overflow-hidden border border-[#E5E5EA]">
                <div
                  className="h-full bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#34C759] rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
                {/* Wave marker dots */}
                {waves.map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{
                      left: `calc(${(idx / (waves.length - 1)) * 100}% - 5px)`,
                      backgroundColor: idx <= selectedWaveIndex ? '#007AFF' : '#D2D2D7',
                      transition: 'background-color 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Wave Selector Tabs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#E5E5EA] pb-3.5 mb-4 overflow-x-auto">
              {waves.map((w, idx) => {
                const isSelected = idx === selectedWaveIndex;
                return (
                  <button
                    key={w.id}
                    onClick={() => handleWaveClick(idx)}
                    className={`flex-1 min-w-[150px] p-3 rounded-2xl text-left border ${
                      isSelected
                        ? 'bg-white border-[#007AFF] shadow-apple-md border-t-2 border-t-[#007AFF]'
                        : 'bg-white/70 border-[#E5E5EA] hover:bg-white text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                    style={{
                      opacity: prefersReduced || inView ? 1 : 0,
                      transform:
                        isSelected && !prefersReduced
                          ? 'scale(1.03) translateY(-1px)'
                          : prefersReduced || inView
                          ? 'scale(1)'
                          : 'translate3d(0, 16px, 0)',
                      transition: isSelected
                        ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease, border-color 0.2s, box-shadow 0.2s'
                        : `opacity 0.5s ease ${idx * 60}ms, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 60}ms`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors ${
                          isSelected ? 'bg-[#007AFF] text-white shadow-xs' : 'bg-[#E5E5EA] text-[#6E6E73]'
                        }`}
                      >
                        {w.label}
                      </span>
                      <span className="text-[11px] font-mono text-[#86868B]">{w.fileCount}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1D1D1F] truncate font-geist">{w.title}</h4>
                    <p className="text-[11px] text-[#86868B] truncate mt-0.5">{w.subtitle}</p>
                  </button>
                );
              })}
            </div>

            {/* Wave Detail Panel — crossfades on change */}
            <div
              key={currentWave.id}
              className="bg-[#F5F5F7] rounded-2xl p-5 sm:p-6 border border-[#E5E5EA]"
              style={{
                animation: prefersReduced ? 'none' : 'waveSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3.5 border-b border-[#E5E5EA]">
                <div>
                  <span className="text-xs font-mono font-bold text-[#007AFF] uppercase">{currentWave.label} Execution Blueprint</span>
                  <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] mt-0.5 font-geist">
                    {currentWave.title} — {currentWave.subtitle}
                  </h3>
                </div>
                <div className="px-3.5 py-1 rounded-full bg-white border border-[#E5E5EA] text-xs font-mono font-bold text-[#248A3D] shadow-xs">
                  Target: {currentWave.riskReduction}
                </div>
              </div>

              <div className="py-3.5 space-y-3">
                <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">{currentWave.strategy}</p>
                <div className="pt-1 space-y-2">
                  <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider block font-geist-mono">Prescribed Actions:</span>
                  {currentWave.keyActions.map((action, i) => (
                    <div
                      key={action}
                      className="flex items-center gap-2.5 text-xs text-[#1D1D1F]"
                      style={{
                        opacity: 1,
                        transform: 'none',
                        animation: prefersReduced ? 'none' : `fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms both`,
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-[#E8F9ED] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-[#34C759]" />
                      </div>
                      <span className="font-medium">{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-xs text-[#86868B] font-mono">
                <span>Wave {selectedWaveIndex + 1} of 5 in sequence</span>
                <button
                  type="button"
                  onClick={() => handleWaveClick(selectedWaveIndex < waves.length - 1 ? selectedWaveIndex + 1 : 0)}
                  className="text-[#007AFF] hover:underline font-semibold flex items-center gap-1.5 text-xs"
                >
                  <span>Inspect Next Wave</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Keyframe definitions */}
      <style>{`
        @keyframes waveSlideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0px) scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};

export default MigrationRoadmapSection;
