import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const TrustSection: React.FC = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();

  const principles = [
    {
      title: 'Read-only repository analysis',
      desc: 'CodeOracle never executes uploaded repository code during analysis. Testing is performed in isolated sandbox boundaries.',
    },
    {
      title: 'Parse confidence exposed',
      desc: 'We explicitly state whether a file was parsed with 100% Tree-sitter AST certainty or degraded to fallback heuristics.',
    },
    {
      title: 'Unresolved dependencies visible',
      desc: 'Dynamic imports and external C extensions are flagged as unresolved rather than silently skipped.',
    },
    {
      title: 'Risk score factors explainable',
      desc: 'Every hotspot score is backed by visible cyclomatic complexity, AST warnings, fan-in, and downstream blast radius.',
    },
    {
      title: 'Static vs runtime separated',
      desc: 'Syntax validation is never conflated with runtime behavioral passing. The boundary is always highlighted.',
    },
    {
      title: 'Original code untouched',
      desc: 'Refactoring proposals are generated as non-destructive unified diffs. Your master branch remains pristine.',
    },
  ];

  const whatWeDoNotClaim = [
    { claim: 'Static syntax = runtime behavior', truth: 'Passing syntax validation does not guarantee runtime semantic equivalence without execution.' },
    { claim: 'Complexity severity = overall risk', truth: 'A complex leaf utility has near-zero risk compared to a simple, highly-called middleware.' },
    { claim: 'Finding = safe autofix', truth: 'Modernization suggestions require human approval; blind AI automation breaks legacy assumptions.' },
    { claim: '0 detected cycles = guaranteed cycle-free', truth: 'Dynamic imports or eval statements outside static AST visibility are flagged as unknown.' },
    { claim: 'Generated tests = executed tests', truth: 'Generated characterization test suites must be executed in your CI before claiming test coverage.' },
  ];

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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>High-Trust Engineering</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-4 font-geist">
            Every conclusion should show its evidence.
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73] leading-relaxed font-sans">
            Engineering trust is earned through transparency. We reveal our parsing boundaries, factor weights, and confidence levels at every layer.
          </p>
        </div>

        {/* 6 Principles Grid with Blur-to-Sharp Stagger */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {principles.map((p, idx) => (
            <div
              key={p.title}
              className="bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-apple flex flex-col justify-between hover:-translate-y-1 transition-all duration-600 ease-out"
              style={{
                opacity: prefersReduced || inView ? 1 : 0,
                filter: prefersReduced || inView ? 'blur(0px)' : 'blur(8px)',
                transform: prefersReduced || inView ? 'none' : 'translate3d(0, 20px, 0)',
                transitionDelay: prefersReduced ? '0ms' : `${idx * 90}ms`,
              }}
            >
              <div>
                <div className="w-8 h-8 rounded-full bg-[#EAF4FF] text-[#007AFF] flex items-center justify-center font-bold text-xs mb-4 font-mono">
                  0{idx + 1}
                </div>
                <h3 className="text-base font-bold text-[#1D1D1F] mb-2 font-geist">{p.title}</h3>
                <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed font-sans">{p.desc}</p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#E5E5EA] flex items-center gap-1.5 text-xs text-[#248A3D] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Principle</span>
              </div>
            </div>
          ))}
        </div>

        {/* Connecting Evidence Bridge Ribbon */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E5E5EA] shadow-apple text-xs font-mono text-[#6E6E73]">
            <span className="w-2 h-2 rounded-full bg-[#34C759]" />
            <span>Guaranteed Boundary: Principles translate directly to verified runtime evidence</span>
            <span className="text-[#007AFF]">↓</span>
          </div>
        </div>

        {/* Standout Trust Section: "What CodeOracle Does Not Claim" with Luminous Border */}
        <div
          className="bg-[#1D1D1F] text-white rounded-[32px] p-6 sm:p-10 border border-black/10 shadow-apple-lg transition-all duration-700 delay-200 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 32px, 0)',
            boxShadow: inView ? '0 0 40px rgba(0, 122, 255, 0.12)' : 'none',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-[#FF9500]" />
                <span className="text-xs font-mono font-bold text-[#FF9500] uppercase tracking-wider">
                  Radical Transparency
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                What CodeOracle Does Not Claim
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-white/10 text-white/80 border border-white/10">
              Anti-Hallucination Manifesto
            </span>
          </div>

          <div className="space-y-4">
            {whatWeDoNotClaim.map((item) => (
              <div
                key={item.claim}
                className="p-4 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 font-mono text-[#FF3B30] font-bold">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span className="line-through decoration-[#FF3B30]">{item.claim}</span>
                </div>
                <div className="text-white/80 sm:text-right max-w-[500px]">
                  {item.truth}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
