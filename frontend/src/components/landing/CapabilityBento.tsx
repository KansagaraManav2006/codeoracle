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
    <section ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 bg-[#FFFFFF] overflow-hidden">
      <div className="max-w-[1180px] mx-auto">
        <div
          className="text-center max-w-[760px] mx-auto mb-16 transition-all duration-700 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-4 font-geist-mono">
            <Layers className="w-3.5 h-3.5" />
            <span>Capability Bento</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-4 font-geist">
            One repository. Multiple layers of intelligence.
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73] leading-relaxed font-sans">
            Every analysis capability is grounded in concrete AST parsing and dependency graph evidence — providing multi-dimensional architectural visibility.
          </p>
        </div>

        {/* Bento Grid with 3D Cascade */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 auto-rows-[220px]">
          {/* Card 1: Large (2 cols, 2 rows) — Neural Universe */}
          <div
            className="md:col-span-2 md:row-span-2 bg-[#09090B] text-white rounded-[28px] p-6 sm:p-8 border border-white/10 flex flex-col justify-between relative overflow-hidden group shadow-apple-md transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-apple-lg"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 32px, 0)',
              transitionDelay: '0ms',
            }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-white/10 text-white border border-white/10">
                  Spatial Intelligence
                </span>
                <span className="text-xs font-mono text-[#007AFF]">Force-Directed Canvas</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                Neural Universe
              </h3>
              <p className="text-xs sm:text-sm text-white/70 max-w-[400px]">
                Interactive 2D physics visualization of codebase modules with real-time semantic zoom and cluster gravity.
              </p>
            </div>

            {/* Visual simulation fragment */}
            <div className="relative z-10 flex items-center justify-center py-6">
              <div className="w-32 h-32 rounded-full border border-[#007AFF]/40 flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(0,122,255,0.3)]">
                <div className="w-20 h-20 rounded-full bg-[#007AFF]/20 border border-[#007AFF] flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-white">145 Nodes</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-xs text-white/60 pt-4 border-t border-white/10">
              <span>Constellations • Clusters • Gravitational pools</span>
              <span className="font-mono text-[#34C759]">60 FPS physics</span>
            </div>
          </div>

          {/* Card 2: Tall (1 col, 2 rows) — System Pulse */}
          <div
            className="md:col-span-1 md:row-span-2 bg-[#F5F5F7] rounded-[28px] p-6 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 32px, 0)',
              transitionDelay: '80ms',
            }}
          >
            <div>
              <div className="flex items-center gap-2 text-[#007AFF] mb-3">
                <Activity className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Executive Health</span>
              </div>
              <h3 className="text-xl font-bold text-[#1D1D1F] mb-1">System Pulse</h3>
              <p className="text-xs text-[#6E6E73] mb-6">
                Single unified readiness score synthesizing 5 engineering dimensions.
              </p>

              <div className="p-4 rounded-2xl bg-white border border-[#E5E5EA] shadow-sm text-center mb-4">
                <span className="text-[10px] text-[#86868B] uppercase font-bold">Readiness Score</span>
                <div className="text-4xl font-bold font-mono text-[#1D1D1F] mt-1">
                  74 <span className="text-sm text-[#86868B]">/ 100</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E5E5EA]">
                  <span className="text-[#6E6E73]">Parsing</span>
                  <span className="font-mono font-bold">80%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5E5EA]">
                  <span className="text-[#6E6E73]">Dependencies</span>
                  <span className="font-mono font-bold">83%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5E5EA]">
                  <span className="text-[#6E6E73]">Protection</span>
                  <span className="font-mono font-bold text-[#D7261C]">40%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6E6E73]">Modernization</span>
                  <span className="font-mono font-bold text-[#248A3D]">97%</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E5EA] text-[11px] text-[#86868B]">
              Refreshed deterministically on ingest
            </div>
          </div>

          {/* Card 3: Wide (1 col, 1 row) — Risk Score Decomposition */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-[28px] p-6 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 32px, 0)',
              transitionDelay: '160ms',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[#D7261C] text-xs font-bold uppercase">
                  <Flame className="w-4 h-4" />
                  <span>Risk Hotspots</span>
                </div>
                <span className="text-xs font-mono text-[#D7261C] font-bold">#1 Target</span>
              </div>
              <h4 className="text-base font-bold text-[#1D1D1F] truncate">
                AnomalyExplainPanel.tsx
              </h4>
              <p className="text-xs text-[#6E6E73] mt-1">CC: 21 • 6 Warnings • Fan-in: 4</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Hotspot Score</span>
              <strong className="text-[#D7261C]">63 / 100</strong>
            </div>
          </div>

          {/* Card 4: Safety Tests (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-[28px] p-6 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 32px, 0)',
              transitionDelay: '240ms',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[#248A3D] text-xs font-bold uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Protection</span>
                </div>
                <span className="text-xs font-mono text-[#248A3D] font-bold">100% Valid</span>
              </div>
              <h4 className="text-base font-bold text-[#1D1D1F]">1,172 Test Cases</h4>
              <p className="text-xs text-[#6E6E73] mt-1">Deterministic pytest &amp; Vitest suites</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Benchmark Coverage</span>
              <strong className="text-[#248A3D]">73.8%</strong>
            </div>
          </div>

          {/* Card 5: Parse Confidence (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-[#F5F5F7] rounded-[28px] p-6 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 32px, 0)',
              transitionDelay: '300ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#007AFF] text-xs font-bold uppercase mb-2">
                <Binary className="w-4 h-4" />
                <span>Parse Confidence</span>
              </div>
              <h4 className="text-base font-bold text-[#1D1D1F]">61% Full AST</h4>
              <p className="text-xs text-[#6E6E73] mt-1">39% partial fallback without hallucinations</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Parser</span>
              <span className="text-[#1D1D1F] font-bold">Tree-sitter 0.21</span>
            </div>
          </div>

          {/* Card 6: Entry-Point Detection (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-[28px] p-6 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 32px, 0)',
              transitionDelay: '360ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#FF9500] text-xs font-bold uppercase mb-2">
                <Radio className="w-4 h-4" />
                <span>Entry Points</span>
              </div>
              <h4 className="text-base font-bold text-[#1D1D1F]">4 Runtime Roots</h4>
              <p className="text-xs text-[#6E6E73] mt-1">main.py, server.py, App.tsx, index.tsx</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Cycle Loops</span>
              <span className="text-[#D7261C] font-bold">2 isolated</span>
            </div>
          </div>

          {/* Card 7: Modernization Funnel (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-[28px] p-6 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 32px, 0)',
              transitionDelay: '420ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#007AFF] text-xs font-bold uppercase mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Modernization</span>
              </div>
              <h4 className="text-base font-bold text-[#1D1D1F]">136 Findings</h4>
              <p className="text-xs text-[#6E6E73] mt-1">37 candidates filtered for safe review</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Autofix</span>
              <span className="text-[#86868B]">0 (Guarded)</span>
            </div>
          </div>

          {/* Card 8: Migration Waves (1 col, 1 row) */}
          <div
            className="md:col-span-1 md:row-span-1 bg-[#F5F5F7] rounded-[28px] p-6 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'perspective(1000px) rotateX(6deg) translate3d(0, 32px, 0)',
              transitionDelay: '480ms',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#34C759] text-xs font-bold uppercase mb-2">
                <Milestone className="w-4 h-4" />
                <span>Migration Waves</span>
              </div>
              <h4 className="text-base font-bold text-[#1D1D1F]">W0 → W4 Sequence</h4>
              <p className="text-xs text-[#6E6E73] mt-1">Ordered from leaves to critical roots</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#E5E5EA]">
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
