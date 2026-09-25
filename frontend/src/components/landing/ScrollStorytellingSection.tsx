import React, { useState, useEffect, useRef } from 'react';
import { FileCode, Network, GitPullRequest, CheckCircle2 } from 'lucide-react';

interface Stage {
  id: string;
  number: string;
  title: string;
  headline: string;
  description: string;
  points: string[];
}

const STAGES: Stage[] = [
  {
    id: 'stage-import',
    number: '01',
    title: 'Import',
    headline: 'Static ingestion without compilation or execution.',
    description:
      'Provide a GitHub URL or drop a ZIP archive. CodeOracle inspects repository source files, builds Abstract Syntax Trees (ASTs), and isolates symbols without running arbitrary code or sending private code to unvetted external services.',
    points: [
      'Fast tree-sitter & AST parsing for Python and TypeScript',
      'Detects entry points, module boundaries, and external dependencies',
      'Local-first privacy: no background telemetry or code harvesting',
    ],
  },
  {
    id: 'stage-understand',
    number: '02',
    title: 'Understand',
    headline: 'Trace dependencies, find cycles, and calculate risk.',
    description:
      'Turn hundreds of fragmented files into a clear directed graph. Surface hidden circular imports, identify fragile utility files with excessive fan-in, and compute cyclomatic complexity across every function.',
    points: [
      'Interactive visual graph with topological sorting',
      'Instant detection of circular import chains and high coupling',
      'Blast-radius calculator: see which modules break when a file changes',
    ],
  },
  {
    id: 'stage-modernize',
    number: '03',
    title: 'Modernize',
    headline: 'Grounded refactoring, generated tests, and phased plans.',
    description:
      'Before touching sensitive logic, CodeOracle synthesizes targeted regression tests to establish a behavioral safety net. It then generates reviewable refactor proposals and sequences changes into safe migration waves.',
    points: [
      'Behavioral test generation covering untested branch conditions',
      'Unified structural diffs with verifiable rationale and zero hallucinations',
      'Phased migration roadmaps (W0 to W3) with rollback readiness',
    ],
  },
];

export const ScrollStorytellingSection: React.FC = () => {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const viewportCenter = window.innerHeight / 2;
      stageRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
          setActiveStageIndex(index);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#ECE5DA]/40 text-[#181715] scroll-mt-20">
      <div className="max-w-[1240px] mx-auto">
        {/* Section Header */}
        <div className="max-w-[680px] mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDFC] border border-[#C8BEB0] text-xs font-mono text-[#3B3733] shadow-sm mb-4">
            <span className="text-[#4C4FD6] font-bold">WORKFLOW</span>
            <span className="text-[#A39888]">•</span>
            <span>Three-Stage Transformation</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#181715]">
            How CodeOracle transforms legacy confusion into engineering clarity.
          </h2>
          <p className="text-base text-[#5C554D] mt-3">
            A linear, verifiable progression from raw codebase ingestion to executable modernization.
          </p>
        </div>

        {/* Desktop: Sticky Visualization beside Sequential Stages */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start relative">
          {/* Sequential Stage Cards (Left Column, normal scroll) */}
          <div className="lg:col-span-6 space-y-16 lg:space-y-32">
            {STAGES.map((stage, idx) => (
              <div
                key={stage.id}
                ref={(el) => (stageRefs.current[idx] = el)}
                className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
                  activeStageIndex === idx
                    ? 'bg-[#FFFDFC] border-[#4C4FD6]/50 shadow-md ring-1 ring-[#4C4FD6]/20'
                    : 'bg-[#FFFDFC]/60 border-[#C8BEB0]/60 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#EAE9FB] text-[#4C4FD6]">
                    STAGE {stage.number}
                  </span>
                  <span className="font-display font-bold text-lg text-[#181715]">
                    {stage.title}
                  </span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#181715] mb-3 leading-snug">
                  {stage.headline}
                </h3>

                <p className="text-sm text-[#3B3733] leading-relaxed mb-6">
                  {stage.description}
                </p>

                <div className="space-y-2.5 pt-4 border-t border-[#ECE5DA]">
                  {stage.points.map((pt, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2.5 text-xs text-[#5C554D]">
                      <CheckCircle2 className="w-4 h-4 text-[#4C4FD6] shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Visualization (Right Column on desktop) */}
          <div className="hidden lg:block lg:col-span-6 lg:sticky lg:top-28">
            <div className="bg-[#181715] text-[#FFFDFC] rounded-3xl border border-[#3B3733] p-6 shadow-2xl relative overflow-hidden min-h-[460px] flex flex-col justify-between">
              {/* Header metadata */}
              <div className="flex items-center justify-between pb-4 border-b border-[#3B3733]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9383A]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B88228]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3EA862]" />
                  <span className="font-mono text-xs text-[#A39888] ml-2">
                    engine.runtime // {STAGES[activeStageIndex].title.toLowerCase()}
                  </span>
                </div>
                <span className="font-mono text-xs text-[#B88228]">
                  STATUS: VERIFIED
                </span>
              </div>

              {/* Dynamic stage graphic */}
              <div className="my-8 flex-1 flex flex-col items-center justify-center">
                {activeStageIndex === 0 && (
                  <div className="w-full space-y-3 animate-fade-in">
                    <div className="p-3.5 rounded-xl bg-[#23211E] border border-[#3B3733] font-mono text-xs">
                      <div className="flex items-center justify-between text-[#C8BEB0] mb-2">
                        <span className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-[#4C4FD6]" />
                          src/core/router.py
                        </span>
                        <span className="text-[#3EA862]">PARSED</span>
                      </div>
                      <div className="text-[11px] text-[#A39888] space-y-1">
                        <p>AST depth: 8 • 4 classes • 12 route handlers</p>
                        <p>Imports: 7 modules • Fan-out: 14 callers</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#23211E] border border-[#3B3733] font-mono text-xs">
                      <div className="flex items-center justify-between text-[#C8BEB0] mb-2">
                        <span className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-[#4C4FD6]" />
                          src/auth/session.py
                        </span>
                        <span className="text-[#3EA862]">PARSED</span>
                      </div>
                      <div className="text-[11px] text-[#A39888] space-y-1">
                        <p>Tokens: 1,420 • Complexity: 12 (Moderate)</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeStageIndex === 1 && (
                  <div className="w-full space-y-3 animate-fade-in font-mono text-xs">
                    <div className="p-4 rounded-xl bg-[#23211E] border border-[#3B3733]">
                      <div className="flex items-center justify-between text-[#C8BEB0] mb-3">
                        <span className="flex items-center gap-2 text-[#B88228]">
                          <Network className="w-4 h-4" />
                          Circular Coupling Warning
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#B88228]/20 text-[#B88228]">
                          Cycle 1 detected
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A39888] mb-2">
                        auth/session.py ↔ utils/crypto.py (Direct cycle)
                      </p>
                      <div className="h-2 w-full rounded-full bg-[#3B3733] overflow-hidden">
                        <div className="h-full bg-[#B88228] w-[65%]" />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#A39888] mt-1.5">
                        <span>Risk Index: 65/100</span>
                        <span>Blast Radius: 18 files</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#23211E]/70 border border-[#3B3733] text-[11px] text-[#C8BEB0] flex items-center justify-between">
                      <span>Topological sort resolution:</span>
                      <span className="text-[#3EA862]">Complete (23 layers)</span>
                    </div>
                  </div>
                )}

                {activeStageIndex === 2 && (
                  <div className="w-full space-y-3 animate-fade-in font-mono text-xs">
                    <div className="p-4 rounded-xl bg-[#23211E] border border-[#4C4FD6]/60">
                      <div className="flex items-center justify-between text-[#C8BEB0] mb-2">
                        <span className="flex items-center gap-2 text-[#EAE9FB]">
                          <GitPullRequest className="w-4 h-4 text-[#4C4FD6]" />
                          Refactor Proposal: Decouple Cycle
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#3EA862]/20 text-[#3EA862]">
                          Tests Passing (4/4)
                        </span>
                      </div>
                      <div className="bg-[#181715] p-2.5 rounded-lg border border-[#3B3733] text-[11px] text-[#C8BEB0] space-y-1">
                        <p className="text-[#D9383A]">- from utils.crypto import sign_jwt</p>
                        <p className="text-[#3EA862]">+ from core.interfaces import TokenSigner</p>
                        <p className="text-[#3EA862]">+ class SafeJwtHandler(TokenSigner): ...</p>
                      </div>
                      <p className="text-[10px] text-[#A39888] mt-2">
                        Wave W1 candidate • Zero breaking changes detected
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer status */}
              <div className="pt-4 border-t border-[#3B3733] flex items-center justify-between text-xs font-mono text-[#A39888]">
                <span>Stage: {STAGES[activeStageIndex].number} / 03</span>
                <span className="text-[#4C4FD6] font-semibold">
                  {STAGES[activeStageIndex].title} Phase
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScrollStorytellingSection;
