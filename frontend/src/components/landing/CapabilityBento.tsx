import React from 'react';
import {
  Layers,
  Activity,
  Flame,
  ShieldCheck,
  Binary,
  Radio,
  Sparkles,
  Milestone,
} from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const CapabilityBento: React.FC = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();

  return (
    <section
      ref={sectionRef}
      className="min-h-[100svh] w-full flex flex-col justify-center py-8 lg:py-12 pt-20 px-4 sm:px-6 bg-[#FFFFFF] overflow-hidden"
    >
      <div className="max-w-[1180px] w-full mx-auto my-auto">
        <div
          className="text-center max-w-[760px] mx-auto mb-3.5 sm:mb-5 transition-all duration-700 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 20px, 0)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAF4FF] text-[#007AFF] text-[11px] font-semibold uppercase tracking-wider mb-2 font-geist-mono">
            <Layers className="w-3 h-3" />
            <span>Capability Bento</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-1 font-geist">
            One repository. Multiple layers of intelligence.
          </h2>
          <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed max-w-[660px] mx-auto font-sans">
            Every analysis capability is grounded in concrete AST parsing and dependency graph evidence — providing multi-dimensional architectural visibility.
          </p>
        </div>

        {/* Bento Grid with 3D Cascade */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[165px]">
          {/* Card 1: Large (2 cols, 2 rows) — Neural Universe */}
          <div
            className="md:col-span-2 md:row-span-2 bg-[#09090B] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/10 flex flex-col justify-between relative overflow-hidden group shadow-apple-md transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-apple-lg"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 24px, 0)',
              transitionDelay: '0ms',
            }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-white border border-white/10">
                  Spatial Intelligence
                </span>
                <span className="text-[11px] font-mono text-[#007AFF]">Force-Directed Canvas</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
                Neural Universe
              </h3>
              <p className="text-xs text-white/70 max-w-[400px]">
                Interactive 2D physics visualization of codebase modules with real-time semantic zoom and cluster gravity.
              </p>
            </div>

            {/* Visual simulation fragment */}
            <div className="relative z-10 flex items-center justify-center py-2">
              <div className="w-24 h-24 rounded-full border border-[#007AFF]/40 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(0,122,255,0.3)]">
                <div className="w-14 h-14 rounded-full bg-[#007AFF]/20 border border-[#007AFF] flex items-center justify-center">
                  <span className="text-[11px] font-mono font-bold text-white">145 Nodes</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-white/60 pt-2.5 border-t border-white/10">
              <span>Constellations • Clusters • Gravitational pools</span>
              <span className="font-mono text-[#34C759]">60 FPS physics</span>
            </div>
          </div>

          {/* Card 2: Tall (1 col, 2 rows) — System Pulse */}
          <div
            className="md:col-span-1 md:row-span-2 bg-[#F5F5F7] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 24px, 0)',
              transitionDelay: '80ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#007AFF] mb-1.5">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Executive Health</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] mb-0.5">System Pulse</h3>
              <p className="text-[11px] text-[#6E6E73] mb-3">
                Single unified readiness score synthesizing 5 engineering dimensions.
              </p>

              <div className="p-3 rounded-xl bg-white border border-[#E5E5EA] shadow-xs text-center mb-2.5">
                <span className="text-[9px] text-[#86868B] uppercase font-bold">Readiness Score</span>
                <div className="text-3xl font-bold font-mono text-[#1D1D1F] mt-0.5">
                  74 <span className="text-xs text-[#86868B]">/ 100</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between py-0.5 border-b border-[#E5E5EA]">
                  <span className="text-[#6E6E73]">Parsing</span>
                  <span className="font-mono font-bold">80%</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#E5E5EA]">
                  <span className="text-[#6E6E73]">Dependencies</span>
                  <span className="font-mono font-bold">83%</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#E5E5EA]">
                  <span className="text-[#6E6E73]">Protection</span>
                  <span className="font-mono font-bold text-[#D7261C]">40%</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#6E6E73]">Modernization</span>
                  <span className="font-mono font-bold text-[#248A3D]">97%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E5EA] text-[10px] text-[#86868B]">
              Refreshed deterministically on ingest
            </div>
          </div>

          {/* Card 3: Wide (1 col, 1 row) — Risk Score Decomposition */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-500 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 24px, 0)',
              transitionDelay: '160ms',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[#D7261C] text-xs font-bold uppercase font-geist">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Risk Hotspots</span>
                </div>
                <span className="text-[10px] font-mono text-[#D7261C] font-bold bg-[#FFF1F0] px-1.5 py-0.5 rounded-full border border-[#FFC5C2]">
                  #1 Target
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] truncate font-geist">
                AnomalyExplainPanel.tsx
              </h4>
              <p className="text-xs text-[#6E6E73] mt-0.5">CC: 21 • 6 Warnings • Fan-in: 4</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Hotspot Score</span>
              <strong className="text-[#D7261C]">63 / 100</strong>
            </div>
          </div>

          {/* Card 4: Safety Tests (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-500 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 24px, 0)',
              transitionDelay: '240ms',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[#248A3D] text-xs font-bold uppercase font-geist">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Protection</span>
                </div>
                <span className="text-[10px] font-mono text-[#248A3D] font-bold bg-[#E8F9ED] px-1.5 py-0.5 rounded-full border border-[#34C759]/20">
                  100% Valid
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] font-geist">1,172 Test Cases</h4>
              <p className="text-xs text-[#6E6E73] mt-0.5">Deterministic pytest &amp; Vitest suites</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Coverage</span>
              <strong className="text-[#248A3D]">73.8%</strong>
            </div>
          </div>

          {/* Card 5: Parse Confidence (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-[#F5F5F7] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-500 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 24px, 0)',
              transitionDelay: '300ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#007AFF] text-xs font-bold uppercase mb-1.5 font-geist">
                <Binary className="w-3.5 h-3.5" />
                <span>Parse Confidence</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] font-geist">61% Full AST</h4>
              <p className="text-xs text-[#6E6E73] mt-0.5">39% partial fallback without hallucinations</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Parser</span>
              <span className="text-[#1D1D1F] font-bold">Tree-sitter 0.21</span>
            </div>
          </div>

          {/* Card 6: Entry-Point Detection (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-500 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 24px, 0)',
              transitionDelay: '360ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#FF9500] text-xs font-bold uppercase mb-1.5 font-geist">
                <Radio className="w-3.5 h-3.5" />
                <span>Entry Points</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] font-geist">4 Runtime Roots</h4>
              <p className="text-xs text-[#6E6E73] mt-0.5">main.py, server.py, App.tsx, index.tsx</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Cycle Loops</span>
              <span className="text-[#D7261C] font-bold">2 isolated</span>
            </div>
          </div>

          {/* Card 7: Modernization Funnel (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-500 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 24px, 0)',
              transitionDelay: '420ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#007AFF] text-xs font-bold uppercase mb-1.5 font-geist">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Modernization</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] font-geist">136 Findings</h4>
              <p className="text-xs text-[#6E6E73] mt-0.5">37 candidates filtered for safe review</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Autofix</span>
              <span className="text-[#86868B]">0 (Guarded)</span>
            </div>
          </div>

          {/* Card 8: Migration Waves (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-[#F5F5F7] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-500 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 24px, 0)',
              transitionDelay: '480ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#34C759] text-xs font-bold uppercase mb-1.5 font-geist">
                <Milestone className="w-3.5 h-3.5" />
                <span>Migration Waves</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] font-geist">W0 → W4 Sequence</h4>
              <p className="text-xs text-[#6E6E73] mt-0.5">Ordered from leaves to critical roots</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Export Format</span>
              <span className="text-[#007AFF] font-bold">Markdown Report</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CapabilityBento;
