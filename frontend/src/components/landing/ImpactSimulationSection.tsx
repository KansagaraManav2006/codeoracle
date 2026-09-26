import React, { useState, useEffect } from 'react';
import { Radio, Play } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const ImpactSimulationSection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('AnomalyExplainPanel.tsx');
  const [isSimulating, setIsSimulating] = useState(false);
  const [sectionRef, inView] = useInView({ threshold: 0.2 });
  const prefersReduced = useReducedMotion();

  const fileSimulations: Record<string, any> = {
    'AnomalyExplainPanel.tsx': {
      path: 'frontend/src/components/AnomalyExplainPanel.tsx',
      blastRadius: 1,
      depth: 2,
      affectedEntryPoints: ['frontend/src/App.tsx'],
      directCallers: ['InspectionView.tsx'],
      transitiveCallers: ['DashboardTab.tsx', 'App.tsx'],
      protectionTests: 6,
      confidence: 'HIGH (AST Graph)',
    },
    'demand_service.py': {
      path: 'backend/app/services/demand_service.py',
      blastRadius: 3,
      depth: 3,
      affectedEntryPoints: ['backend/app/main.py'],
      directCallers: ['forecast_router.py', 'inventory_router.py', 'batch_job.py'],
      transitiveCallers: ['main.py', 'server.py'],
      protectionTests: 18,
      confidence: 'HIGH (Tree-sitter)',
    },
    'auth_middleware.js': {
      path: 'backend/middleware/auth_middleware.js',
      blastRadius: 12,
      depth: 4,
      affectedEntryPoints: ['backend/app/main.py', 'backend/api/index.js'],
      directCallers: ['12 route handlers'],
      transitiveCallers: ['All public & private gateways'],
      protectionTests: 24,
      confidence: 'HIGH (AST)',
    },
  };

  const sim = fileSimulations[selectedFile];

  const triggerSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 900);
  };

  // Trigger radar ripple on first scroll into view
  useEffect(() => {
    if (inView && !prefersReduced) {
      triggerSimulation();
    }
  }, [inView, prefersReduced]);

  return (
    <section
      id="impact-simulation"
      ref={sectionRef}
      className="min-h-[100svh] w-full flex flex-col justify-center py-8 lg:py-12 pt-20 px-4 sm:px-6 bg-[#FFFFFF] overflow-hidden"
    >
      <div className="max-w-[1140px] w-full mx-auto my-auto">
        <div
          className="text-center max-w-[760px] mx-auto mb-4 sm:mb-6 transition-all duration-700 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 20px, 0)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAF4FF] text-[#007AFF] text-[11px] font-semibold uppercase tracking-wider mb-2 font-geist-mono">
            <Radio className="w-3 h-3" />
            <span>Downstream Impact Simulator</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-1.5 font-geist">
            Blast Radius Simulation: Understand what may break before making the change.
          </h2>
          <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed max-w-[660px] mx-auto font-sans">
            Select any file to trace immediate callers, transitive propagation ripples, and critical application entry points before touching production code.
          </p>
        </div>

        {/* Interactive Simulator Shell */}
        <div
          className="bg-[#F5F5F7] rounded-2xl sm:rounded-3xl border border-[#E5E5EA] shadow-apple-md p-4 sm:p-6 transition-all duration-700 delay-100 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
          }}
        >
          {/* Target File Selector Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-[#E5E5EA]">
            <div>
              <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider block mb-1.5 font-geist-mono">
                Select Modification Target
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {Object.keys(fileSimulations).map((fileName) => (
                  <button
                    key={fileName}
                    type="button"
                    onClick={() => {
                      setSelectedFile(fileName);
                      triggerSimulation();
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
                      selectedFile === fileName
                        ? 'bg-[#007AFF] text-white shadow-xs font-bold'
                        : 'bg-white text-[#424245] hover:bg-white hover:text-[#1D1D1F] border border-[#E5E5EA]'
                    }`}
                  >
                    {fileName}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={triggerSimulation}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#1D1D1F] bg-white border border-[#E5E5EA] hover:bg-[#F5F5F7] shadow-xs transition-all active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#007AFF]" />
              <span>Re-Simulate Ripple</span>
            </button>
          </div>

          {/* Ripple Visualization Stage with Clear Depth Hierarchy */}
          <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 relative">
            {/* Step 1: Selected Node */}
            <div
              className={`p-4 rounded-2xl bg-white border border-[#E5E5EA] shadow-apple space-y-2.5 ${isSimulating ? 'ring-2 ring-[#007AFF] scale-[1.01]' : ''}`}
              style={{
                opacity: prefersReduced || inView ? 1 : 0,
                transform: prefersReduced || inView ? (isSimulating ? 'scale(1.01)' : 'none') : 'translate3d(-36px, 0, 0) scale(0.96)',
                filter: prefersReduced || inView ? 'blur(0px)' : 'blur(3px)',
                transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s, filter 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b border-[#E5E5EA]">
                <span className="text-xs font-bold text-[#007AFF] font-mono">01 // TARGET NODE</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] animate-ping" />
              </div>
              <p className="font-mono text-sm font-bold text-[#1D1D1F] truncate">{selectedFile}</p>
              <p className="text-xs text-[#6E6E73] leading-relaxed">Initial mutation point for proposed modernization or refactoring.</p>
            </div>

            {/* Step 2: Direct Dependents */}
            <div
              className={`p-4 rounded-2xl bg-[#FFFDF5] border border-[#FFE8A3] shadow-apple space-y-2.5 ${isSimulating ? 'ring-2 ring-[#FF9500] scale-[1.01]' : ''}`}
              style={{
                opacity: prefersReduced || inView ? 1 : 0,
                transform: prefersReduced || inView ? (isSimulating ? 'scale(1.01)' : 'none') : 'translate3d(0, 36px, 0) scale(0.96)',
                filter: prefersReduced || inView ? 'blur(0px)' : 'blur(3px)',
                transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.22s, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.22s, filter 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.22s',
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b border-[#FFE8A3]/70">
                <span className="text-xs font-bold text-[#FF9500] font-mono">02 // DIRECT CALLERS</span>
                <span className="text-xs font-mono font-bold text-[#FF9500] bg-white px-2 py-0.5 rounded-full border border-[#FFE8A3]">
                  {sim.directCallers.length} module(s)
                </span>
              </div>
              <div className="space-y-1">
                {sim.directCallers.map((dc: string) => (
                  <p key={dc} className="font-mono text-xs font-semibold text-[#1D1D1F] truncate bg-white p-1.5 rounded-lg border border-[#FFE8A3]/50">
                    {dc}
                  </p>
                ))}
              </div>
              <p className="text-xs text-[#6E6E73] leading-relaxed">Immediate call-sites that import and consume exported signatures.</p>
            </div>

            {/* Step 3: Transitive Ripple & Entry Points */}
            <div
              className={`p-4 rounded-2xl bg-[#FFF8F8] border border-[#FFC5C2] shadow-apple space-y-2.5 ${isSimulating ? 'ring-2 ring-[#D7261C] scale-[1.01]' : ''}`}
              style={{
                opacity: prefersReduced || inView ? 1 : 0,
                transform: prefersReduced || inView ? (isSimulating ? 'scale(1.01)' : 'none') : 'translate3d(36px, 0, 0) scale(0.96)',
                filter: prefersReduced || inView ? 'blur(0px)' : 'blur(3px)',
                transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.34s, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.34s, filter 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.34s',
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b border-[#FFC5C2]/60">
                <span className="text-xs font-bold text-[#D7261C] font-mono">03 // ENTRY POINTS</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#FFF1F0] text-[#D7261C] border border-[#FFC5C2]">
                  Critical Alert
                </span>
              </div>
              <div className="space-y-1">
                {sim.affectedEntryPoints.map((ep: string) => (
                  <p key={ep} className="font-mono text-xs font-bold text-[#D7261C] truncate bg-white border border-[#FFC5C2] p-1.5 rounded-lg">
                    {ep}
                  </p>
                ))}
              </div>
              <p className="text-xs text-[#6E6E73] leading-relaxed">Root runtime entry points impacted if contracts diverge.</p>
            </div>
          </div>

          {/* Blast Radius Metrics Summary */}
          <div
            className="pt-3.5 border-t border-[#E5E5EA] grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs font-mono"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 20px, 0)',
              transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s',
            }}
          >
            <div className="bg-white p-2.5 rounded-xl border border-[#E5E5EA] shadow-xs">
              <span className="text-[10px] text-[#86868B] uppercase font-bold block mb-0.5">Blast Radius</span>
              <strong className="text-sm sm:text-base text-[#1D1D1F] font-extrabold">{sim.blastRadius} module(s)</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-[#E5E5EA] shadow-xs">
              <span className="text-[10px] text-[#86868B] uppercase font-bold block mb-0.5">Propagation Depth</span>
              <strong className="text-sm sm:text-base text-[#1D1D1F] font-extrabold">{sim.depth} hops</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-[#E5E5EA] shadow-xs">
              <span className="text-[10px] text-[#86868B] uppercase font-bold block mb-0.5">Entry Points</span>
              <strong className="text-sm sm:text-base text-[#D7261C] font-extrabold">{sim.affectedEntryPoints.length} point(s)</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-[#E5E5EA] shadow-xs">
              <span className="text-[10px] text-[#86868B] uppercase font-bold block mb-0.5">Protection Tests</span>
              <strong className="text-sm sm:text-base text-[#248A3D] font-extrabold">{sim.protectionTests} tests</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-[#E5E5EA] shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#86868B] uppercase font-bold block mb-0.5">Confidence</span>
              <strong className="text-xs text-[#007AFF] font-extrabold block truncate">{sim.confidence}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactSimulationSection;
