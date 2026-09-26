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
  const [sectionRef, inView] = useInView({ threshold: 0.1 });
  const prefersReduced = useReducedMotion();

  // Each card has a unique motion identity with zoom-in entrance
  const cardStyle = (
    delay: number,
    enterFrom: string = 'scale(0.93) translate3d(0, 24px, 0)',
    extra: React.CSSProperties = {}
  ): React.CSSProperties =>
    prefersReduced
      ? {}
      : {
          opacity: inView ? 1 : 0,
          transform: inView ? 'scale(1) translate3d(0, 0, 0)' : enterFrom,
          transition: `opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          willChange: 'opacity, transform',
          ...extra,
        };

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      className="min-h-[100svh] w-full flex flex-col justify-center py-8 lg:py-12 pt-20 px-4 sm:px-6 bg-[#FFFFFF] overflow-hidden"
    >
      <div id="capability-bento" className="sr-only" />
      <div className="max-w-[1180px] w-full mx-auto my-auto">
        {/* Section Header */}
        <div
          className="text-center max-w-[760px] mx-auto mb-3.5 sm:mb-5"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 22px, 0)',
            transition: 'opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAF4FF] text-[#007AFF] text-[11px] font-semibold uppercase tracking-wider mb-2 font-geist-mono">
            <Layers className="w-3 h-3" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-1 font-geist">
            Core Platform Capabilities: Everything you need to safely modernize.
          </h2>
          <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed max-w-[660px] mx-auto font-sans">
            Every analysis capability is grounded in concrete AST parsing and dependency graph evidence — providing multi-dimensional architectural visibility.
          </p>
        </div>

        {/* Bento Grid — layered depth cascade */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[165px]">
          {/* Card 1: Large (2 cols, 2 rows) — Neural Universe — enters from below with most dramatic entrance */}
          <div
            className="md:col-span-2 md:row-span-2 bg-[#09090B] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/10 flex flex-col justify-between relative overflow-hidden group shadow-apple-md hover:-translate-y-1 hover:shadow-apple-lg transition-[box-shadow,transform] duration-300"
            style={cardStyle(0, 'translate3d(0, 48px, 0) scale(0.92)')}
          >
            {/* Subtle glow orb behind it */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 30% 40%, rgba(0,122,255,0.15) 0%, transparent 70%)',
                opacity: inView ? 1 : 0,
                transition: 'opacity 1.2s ease 0.4s',
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-white border border-white/10">
                  Spatial Intelligence
                </span>
                <span className="text-[11px] font-mono text-[#007AFF]">Force-Directed Canvas</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Neural Universe</h3>
              <p className="text-xs text-white/70 max-w-[400px]">
                Interactive 2D physics visualization of codebase modules with real-time semantic zoom and cluster gravity.
              </p>
            </div>

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

          {/* Card 2: Tall (1 col, 2 rows) — System Pulse — enters from right */}
          <div
            className="md:col-span-1 md:row-span-2 bg-[#F5F5F7] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-[box-shadow,transform] duration-300"
            style={cardStyle(100, 'translate3d(32px, 28px, 0) scale(0.95)')}
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#007AFF] mb-1.5">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Executive Health</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] mb-0.5">System Pulse</h3>
              <p className="text-[11px] text-[#6E6E73] mb-3">Single unified readiness score synthesizing 5 engineering dimensions.</p>

              <div className="p-3 rounded-xl bg-white border border-[#E5E5EA] shadow-xs text-center mb-2.5">
                <span className="text-[9px] text-[#86868B] uppercase font-bold">Readiness Score</span>
                <div className="text-3xl font-bold font-mono text-[#1D1D1F] mt-0.5">
                  74 <span className="text-xs text-[#86868B]">/ 100</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                {[
                  { label: 'Parsing', val: '80%', color: undefined },
                  { label: 'Dependencies', val: '83%', color: undefined },
                  { label: 'Protection', val: '40%', color: '#D7261C' },
                  { label: 'Modernization', val: '97%', color: '#248A3D' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-0.5 border-b border-[#E5E5EA]">
                    <span className="text-[#6E6E73]">{row.label}</span>
                    <span className="font-mono font-bold" style={{ color: row.color }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-[#E5E5EA] text-[10px] text-[#86868B]">Refreshed deterministically on ingest</div>
          </div>

          {/* Card 3: Risk Hotspots — enters from top-right diagonal */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-[box-shadow,transform] duration-300"
            style={cardStyle(200, 'translate3d(20px, 24px, 0) scale(0.95)')}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[#D7261C] text-xs font-bold uppercase font-geist">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Risk Hotspots</span>
                </div>
                <span className="text-[10px] font-mono text-[#D7261C] font-bold bg-[#FFF1F0] px-1.5 py-0.5 rounded-full border border-[#FFC5C2]">#1 Target</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] truncate font-geist">AnomalyExplainPanel.tsx</h4>
              <p className="text-xs text-[#6E6E73] mt-0.5">CC: 21 • 6 Warnings • Fan-in: 4</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Hotspot Score</span>
              <strong className="text-[#D7261C]">63 / 100</strong>
            </div>
          </div>

          {/* Card 4: Safety Tests — enters from bottom-right */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-[box-shadow,transform] duration-300"
            style={cardStyle(300, 'translate3d(24px, 32px, 0) scale(0.95)')}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[#248A3D] text-xs font-bold uppercase font-geist">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Protection</span>
                </div>
                <span className="text-[10px] font-mono text-[#248A3D] font-bold bg-[#E8F9ED] px-1.5 py-0.5 rounded-full border border-[#34C759]/20">100% Valid</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] font-geist">1,172 Test Cases</h4>
              <p className="text-xs text-[#6E6E73] mt-0.5">Deterministic pytest &amp; Vitest suites</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-[#E5E5EA]">
              <span className="text-[#86868B]">Coverage</span>
              <strong className="text-[#248A3D]">73.8%</strong>
            </div>
          </div>

          {/* Card 5: Parse Confidence — enters from left */}
          <div
            className="md:col-span-1 md:row-span-1 bg-[#F5F5F7] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-[box-shadow,transform] duration-300"
            style={cardStyle(400, 'translate3d(-24px, 24px, 0) scale(0.95)')}
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

          {/* Card 6: Entry Points — enters from below */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-[box-shadow,transform] duration-300"
            style={cardStyle(500, 'translate3d(0, 32px, 0) scale(0.95)')}
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

          {/* Card 7: Modernization Funnel — enters from right */}
          <div
            className="md:col-span-1 md:row-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-[box-shadow,transform] duration-300"
            style={cardStyle(600, 'translate3d(24px, 24px, 0) scale(0.95)')}
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

          {/* Card 8: Migration Waves — enters from below-right */}
          <div
            className="md:col-span-1 md:row-span-1 bg-[#F5F5F7] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-apple hover:-translate-y-1 transition-[box-shadow,transform] duration-300"
            style={cardStyle(700, 'translate3d(20px, 36px, 0) scale(0.95)')}
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
