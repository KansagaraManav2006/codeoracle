import React, { useRef, useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface ProductRevealSectionProps {
  onExploreDemo?: () => void;
}

export const ProductRevealSection: React.FC<ProductRevealSectionProps> = ({ onExploreDemo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handleMq = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handleMq);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();

    let ticking = false;
    const updateScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalDistance = rect.height - windowHeight;

      if (totalDistance <= 0) {
        setProgress(1);
        ticking = false;
        return;
      }

      // Progress: 0 when container top reaches near viewport, 1 when scrolled through
      const current = -rect.top;
      const raw = Math.min(Math.max(current / totalDistance, 0), 1);
      setProgress(raw);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('resize', checkMobile);
    updateScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('resize', checkMobile);
      mq.removeEventListener('change', handleMq);
    };
  }, []);

  // Smooth Apple cubic easing curve
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const smooth = reducedMotion ? 1 : easeOutCubic(progress);

  // Visual expansion metrics:
  // Starts as a clean centered preview (0.75 desktop / 0.88 mobile) and expands to 1.0 (full width)
  const initialScale = isMobile ? 0.88 : 0.74;
  const scale = initialScale + (1.0 - initialScale) * smooth;

  // Max width expands from 820px to 1240px
  const minWidthPx = isMobile ? 340 : 820;
  const maxWidthPx = minWidthPx + (1240 - minWidthPx) * smooth;

  // 3D subtle perspective tilt: levels from 3.5deg to 0deg
  const rotateX = reducedMotion ? 0 : (1 - smooth) * 3.5;

  // Corner radius: smoothly tightens from 36px to 24px
  const borderRadius = 36 - 12 * smooth;

  // Blur-to-sharp depth of field: initial subtle blur dissipates smoothly
  const blurPx = reducedMotion ? 0 : Math.max((1 - smooth * 4) * 3, 0);

  // Progressive surrounding reveals:
  // 1. Header fade + float up
  const headerOpacity = reducedMotion ? 1 : Math.min(Math.max((smooth - 0.05) / 0.30, 0), 1);
  const headerTranslateY = reducedMotion ? 0 : (1 - headerOpacity) * 22;

  // 2. Metrics tiles staggered reveals (cards 0 to 4)
  const getMetricCardStyle = (index: number) => {
    if (reducedMotion) return { opacity: 1, transform: 'none' };
    const start = 0.18 + index * 0.06;
    const end = start + 0.20;
    const cardProgress = Math.min(Math.max((smooth - start) / (end - start), 0), 1);
    return {
      opacity: cardProgress,
      transform: `translate3d(0, ${(1 - cardProgress) * 22}px, 0)`,
      willChange: 'opacity, transform',
    };
  };

  // 3. Internal subsystem cards illumination
  const getInternalCardStyle = (index: number) => {
    if (reducedMotion) return { opacity: 1, transform: 'none' };
    const start = 0.30 + index * 0.08;
    const end = start + 0.25;
    const cardProgress = Math.min(Math.max((smooth - start) / (end - start), 0), 1);
    return {
      opacity: Math.max(0.45 + 0.55 * cardProgress, 0.45),
      transform: `scale(${0.96 + 0.04 * cardProgress})`,
      willChange: 'opacity, transform',
    };
  };

  // 4. Floating hint indicator fades out as user scrolls down
  const hintOpacity = reducedMotion ? 0 : Math.max(1 - smooth * 3.5, 0);

  const metrics = [
    { label: 'Source Files', value: '145', desc: 'Analyzed via Tree-sitter & AST' },
    { label: 'Lines of Code', value: '29,379', desc: 'Normalized non-comment source' },
    { label: 'Languages', value: '3', desc: 'Python, JavaScript, TypeScript' },
    { label: 'Full AST Coverage', value: '61%', desc: 'Deep semantic syntax parsing' },
    { label: 'High-Risk Modules', value: '6', desc: 'Identified for refactoring priority' },
  ];

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${reducedMotion ? 'py-16' : 'min-h-[135vh] md:min-h-[150vh]'}`}
    >
      {/* Sticky Viewport Stage: Pinned during scroll expansion */}
      <section
        className={`${
          reducedMotion ? 'relative' : 'sticky top-10 md:top-14 min-h-[calc(100vh-3.5rem)] flex flex-col justify-center'
        } py-6 px-4 sm:px-6 overflow-hidden`}
      >
        <div className="max-w-[1240px] w-full mx-auto flex flex-col items-center">
          {/* Progressively Revealing Header with Staggered Parallax Float */}
          <div
            style={{
              opacity: headerOpacity,
              transform: `translate3d(0, ${headerTranslateY}px, 0)`,
              willChange: 'opacity, transform',
            }}
            className="text-center max-w-[780px] mx-auto mb-6 transition-opacity duration-200"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-2.5 shadow-sm font-geist-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Immediate Grounded Evidence</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1D1D1F] leading-[1.08] mb-2.5 font-geist">
              A repository becomes a system you can reason about.
            </h2>
            <p className="text-sm sm:text-base text-[#6E6E73] leading-relaxed max-w-[660px] mx-auto font-sans">
              Real static analysis extracts unambiguous architectural primitives from your codebase — replacing guesswork with measured complexity, dependencies, and behavioral boundaries.
            </p>
          </div>

          {/* Staggered Metric Tiles: Fade & Float in progressively */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3.5 w-full max-w-[1140px] mb-5">
            {metrics.map((item, idx) => (
              <div
                key={item.label}
                style={getMetricCardStyle(idx)}
                className={`p-3.5 rounded-2xl bg-white border border-[#E5E5EA] shadow-apple transition-shadow duration-300 ${
                  idx === 4 ? 'col-span-2 md:col-span-1 border-[#FF3B30]/30 bg-[#FFF8F8]' : ''
                }`}
              >
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-0.5 truncate">
                  {item.label}
                </div>
                <div
                  className={`text-xl sm:text-2xl font-bold tracking-tight mb-0.5 font-mono ${
                    idx === 4 ? 'text-[#D7261C]' : 'text-[#1D1D1F]'
                  }`}
                >
                  {item.value}
                </div>
                <div className="text-[11px] text-[#86868B] leading-tight truncate">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* The Expanding Framed Canvas with 3D Depth & Corner Easing */}
          <div
            className="w-full flex justify-center relative"
            style={{
              perspective: '1200px',
            }}
          >
            <div
              style={{
                transform: `scale(${scale}) rotateX(${rotateX}deg)`,
                borderRadius: `${borderRadius}px`,
                filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
                maxWidth: `${maxWidthPx}px`,
                willChange: 'transform, filter, max-width',
              }}
              className="w-full bg-[#FFFFFF] border border-[#E5E5EA] shadow-apple-lg p-4 sm:p-6 transition-shadow duration-300 relative transform-gpu"
            >
              {/* Window Chrome Header with macOS Dots & Status */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E5E5EA]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                  </div>
                  <div className="h-4 w-px bg-[#E5E5EA] mx-1 hidden sm:block" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-[#1D1D1F] tracking-tight">
                        End-to-End Demand Forecasting Platform
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#EAF4FF] text-[#007AFF] rounded-full">
                        Reference Benchmark
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6E6E73] font-mono">
                      Python 3.10 • FastAPI • React 18 • PyTorch
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-[#248A3D] bg-[#E8F9ED] px-3 py-1 rounded-full font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>98 Backend Unit Tests Validated</span>
                  </div>
                  {onExploreDemo && (
                    <button
                      onClick={onExploreDemo}
                      className="inline-flex items-center gap-1 text-[#007AFF] hover:underline font-semibold"
                    >
                      <span>Open Full Demo</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Subsystem Architecture Grid: Illuminates as Canvas Expands */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Subsystem Card 1: Core Architecture Layers */}
                <div
                  style={getInternalCardStyle(0)}
                  className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#E5E5EA] space-y-2.5 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1D1D1F] uppercase tracking-wider">
                      Architecture Layers
                    </span>
                    <span className="text-[10px] font-mono text-[#007AFF] font-bold">5 Detected</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="font-medium text-[#1D1D1F]">Presentation Layer</span>
                      <span className="font-mono text-[#6E6E73] text-[11px]">48 files (React)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="font-medium text-[#1D1D1F]">API &amp; Endpoints</span>
                      <span className="font-mono text-[#6E6E73] text-[11px]">24 files (FastAPI)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="font-medium text-[#1D1D1F]">Domain Services</span>
                      <span className="font-mono text-[#6E6E73] text-[11px]">39 files (Python)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="font-medium text-[#1D1D1F]">Data &amp; Persistence</span>
                      <span className="font-mono text-[#6E6E73] text-[11px]">18 files (SQLAlchemy)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="font-medium text-[#1D1D1F]">ML Pipeline Models</span>
                      <span className="font-mono text-[#6E6E73] text-[11px]">16 files (PyTorch)</span>
                    </div>
                  </div>
                </div>

                {/* Subsystem Card 2: Highest-Risk Hotspot */}
                <div
                  style={getInternalCardStyle(1)}
                  className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#E5E5EA] space-y-2.5 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1D1D1F] uppercase tracking-wider">
                      Top Hotspot #1
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF1F0] text-[#D7261C]">
                      Risk: HIGH
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#FFC5C2] space-y-2 shadow-xs">
                    <p className="font-mono text-xs font-bold text-[#D7261C] truncate">
                      AnomalyExplainPanel.tsx
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-[#FFC5C2]/40 font-mono text-[#424245]">
                      <div>Score: <strong className="text-[#1D1D1F]">63 / 100</strong></div>
                      <div>CC: <strong className="text-[#1D1D1F]">21</strong></div>
                      <div>Warnings: <strong className="text-[#1D1D1F]">6</strong></div>
                      <div>Blast Radius: <strong className="text-[#1D1D1F]">1 module</strong></div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6E6E73] leading-relaxed">
                    High conditional nesting and implicit state mutations without characterization test protection.
                  </p>
                </div>

                {/* Subsystem Card 3: Deterministic Test Generation Proof */}
                <div
                  style={getInternalCardStyle(2)}
                  className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#E5E5EA] space-y-2.5 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1D1D1F] uppercase tracking-wider">
                      Safety Generation
                    </span>
                    <span className="text-[10px] font-mono text-[#248A3D] font-bold">100% Syntax Valid</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="text-[#6E6E73]">Characterization Test Cases</span>
                      <span className="font-mono font-bold text-[#1D1D1F]">1,172 tests</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="text-[#6E6E73]">Generated Test Files</span>
                      <span className="font-mono font-bold text-[#1D1D1F]">133 files</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="text-[#6E6E73]">Protected Modules</span>
                      <span className="font-mono font-bold text-[#1D1D1F]">116 / 145 (80%)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E5EA]/60">
                      <span className="text-[#6E6E73]">Runtime Execution Guard</span>
                      <span className="font-semibold text-[#86868B]">Strict Read-Only</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll Hint Floating Pill */}
            {!reducedMotion && hintOpacity > 0.05 && (
              <div
                style={{ opacity: hintOpacity }}
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-200"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E5E5EA] shadow-apple text-[11px] font-medium text-[#6E6E73]">
                  <span>Scroll to expand architecture intelligence</span>
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce text-[#007AFF]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductRevealSection;
