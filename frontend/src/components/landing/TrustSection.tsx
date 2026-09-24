import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, ArrowDown } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const TrustSection: React.FC = () => {
  const [section1Ref, inView1] = useInView({ threshold: 0.12 });
  const [section2Ref, inView2] = useInView({ threshold: 0.12 });
  const prefersReduced = useReducedMotion();

  const principles = [
    { title: 'Read-only repository analysis', desc: 'CodeOracle never executes uploaded repository code during analysis. Testing is performed in isolated sandbox boundaries.' },
    { title: 'Parse confidence exposed', desc: 'We explicitly state whether a file was parsed with 100% Tree-sitter AST certainty or degraded to fallback heuristics.' },
    { title: 'Unresolved dependencies visible', desc: 'Dynamic imports and external C extensions are flagged as unresolved rather than silently skipped.' },
    { title: 'Risk score factors explainable', desc: 'Every hotspot score is backed by visible cyclomatic complexity, AST debt warnings, fan-in, and downstream blast radius.' },
    { title: 'Static vs runtime separated', desc: 'Syntax validation is never conflated with runtime behavioral passing. The boundary is always highlighted.' },
    { title: 'Original code untouched', desc: 'Refactoring proposals are generated as non-destructive unified diffs. Your master branch remains pristine.' },
  ];

  const whatWeDoNotClaim = [
    { claim: 'Static syntax = runtime behavior', truth: 'Passing syntax validation does not guarantee runtime semantic equivalence without execution.' },
    { claim: 'Complexity severity = overall risk', truth: 'A complex leaf utility has near-zero risk compared to a simple, highly-called middleware.' },
    { claim: 'Finding = safe autofix', truth: 'Modernization suggestions require human approval; blind AI automation breaks legacy assumptions.' },
    { claim: '0 detected cycles = guaranteed cycle-free', truth: 'Dynamic imports or eval statements outside static AST visibility are flagged as unknown.' },
    { claim: 'Generated tests = executed tests', truth: 'Generated characterization test suites must be executed in your CI before claiming test coverage.' },
  ];

  return (
    <>
      {/* Screen 1: High-Trust Principles */}
      <section
        id="trust-principles"
        ref={section1Ref}
        className="w-full min-h-[100svh] flex flex-col justify-center py-8 lg:py-12 pt-20 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden"
      >
        <div className="max-w-[1140px] mx-auto w-full">
          <div
            className="text-center max-w-[760px] mx-auto mb-6 lg:mb-8"
            style={{
              opacity: prefersReduced || inView1 ? 1 : 0,
              transform: prefersReduced || inView1 ? 'none' : 'translate3d(0, 24px, 0)',
              transition: 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-2.5 font-geist-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>High-Trust Engineering</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-2.5 font-geist">
              Every conclusion should show its evidence.
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-[#6E6E73] leading-relaxed font-sans max-w-[660px] mx-auto">
              Engineering trust is earned through transparency. We reveal our parsing boundaries, factor weights, and confidence levels at every layer.
            </p>
          </div>

          {/* 6 Principles Grid — each card staggered individually */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 lg:gap-4 mb-6">
            {principles.map((p, idx) => (
              <div
                key={p.title}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E5EA] shadow-apple flex flex-col justify-between hover:-translate-y-1 hover:shadow-apple-md transition-all duration-200"
                style={{
                  opacity: prefersReduced || inView1 ? 1 : 0,
                  filter: prefersReduced || inView1 ? 'blur(0px)' : 'blur(10px)',
                  transform: prefersReduced || inView1 ? 'none' : 'translate3d(0, 24px, 0) scale(0.97)',
                  transitionDelay: prefersReduced ? '0ms' : `${idx * 80}ms`,
                  transitionProperty: 'opacity, filter, transform',
                  transitionDuration: '0.7s',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#EAF4FF] text-[#007AFF] flex items-center justify-center font-bold text-xs font-mono">
                      0{idx + 1}
                    </div>
                    <span className="text-[10px] font-mono text-[#86868B] uppercase tracking-wider">Standard</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1D1D1F] mb-1.5 font-geist">{p.title}</h3>
                  <p className="text-xs text-[#6E6E73] leading-relaxed font-sans">{p.desc}</p>
                </div>
                <div className="pt-3 mt-3 border-t border-[#E5E5EA] flex items-center gap-1.5 text-[11px] text-[#248A3D] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Principle</span>
                </div>
              </div>
            ))}
          </div>

          {/* Evidence Bridge Ribbon */}
          <div
            className="flex items-center justify-center"
            style={{
              opacity: prefersReduced || inView1 ? 1 : 0,
              transform: prefersReduced || inView1 ? 'none' : 'translate3d(0, 16px, 0)',
              transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.5s, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.5s',
            }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E5E5EA] shadow-apple text-xs font-mono text-[#6E6E73]">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              <span>Guaranteed Boundary: Principles translate directly to verified runtime evidence</span>
              <ArrowDown className="w-3.5 h-3.5 text-[#007AFF] animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Screen 2: Anti-Hallucination Manifesto (dark) */}
      <section
        id="trust-manifesto"
        ref={section2Ref}
        className="w-full min-h-[100svh] flex flex-col justify-center py-10 lg:py-14 pt-20 px-4 sm:px-6 bg-[#161617] text-white overflow-hidden relative"
      >
        {/* Ambient glow — appears on inView */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full blur-3xl pointer-events-none -z-10"
          style={{
            background: 'radial-gradient(ellipse, rgba(0,122,255,0.12) 0%, rgba(88,86,214,0.10) 50%, transparent 80%)',
            opacity: inView2 ? 1 : 0,
            transition: 'opacity 1.2s ease 0.3s',
          }}
        />

        <div className="max-w-[1040px] mx-auto w-full">
          {/* Header — rises from below */}
          <div
            className="text-center max-w-[760px] mx-auto mb-6 lg:mb-8"
            style={{
              opacity: prefersReduced || inView2 ? 1 : 0,
              transform: prefersReduced || inView2 ? 'none' : 'translate3d(0, 40px, 0) scale(0.97)',
              transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#FF9F0A] text-xs font-semibold uppercase tracking-wider mb-2.5 font-geist-mono border border-white/15 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Radical Transparency</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-2.5 font-geist">
              What CodeOracle Does Not Claim
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-white/75 leading-relaxed font-sans max-w-[620px] mx-auto">
              Most analysis tools over-promise and hallucinate certainty. Here is our exact boundary between static fact and runtime truth.
            </p>
          </div>

          {/* Manifesto Card — rises from below + glow on inView */}
          <div
            className="bg-white/[0.05] backdrop-blur-xl rounded-[32px] p-6 sm:p-8 border border-white/15 shadow-apple-lg"
            style={{
              opacity: prefersReduced || inView2 ? 1 : 0,
              transform: prefersReduced || inView2 ? 'none' : 'translate3d(0, 44px, 0) scale(0.96)',
              boxShadow: inView2 ? '0 0 64px rgba(0, 122, 255, 0.18)' : 'none',
              transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, transform 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, box-shadow 1.2s ease 0.2s',
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <span className="text-xs font-mono font-bold text-[#FF9F0A] uppercase tracking-wider">Anti-Hallucination Boundary Rules</span>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-white/10 text-white/90 border border-white/15 font-semibold">5 Ground Truth Assertions</span>
            </div>

            {/* Boundary rules — sequential stagger from inView2 */}
            <div className="space-y-3">
              {whatWeDoNotClaim.map((item, idx) => (
                <div
                  key={item.claim}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm hover:bg-white/[0.06] transition-colors"
                  style={{
                    opacity: prefersReduced || inView2 ? 1 : 0,
                    transform: prefersReduced || inView2 ? 'none' : 'translate3d(0, 20px, 0)',
                    transitionDelay: prefersReduced ? '0ms' : `${150 + idx * 120}ms`,
                    transitionProperty: 'opacity, transform',
                    transitionDuration: '0.65s',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div className="flex items-center gap-2.5 font-mono text-[#FF453A] font-semibold shrink-0">
                    <XCircle className="w-4 h-4 shrink-0 text-[#FF453A]" />
                    <span className="line-through decoration-[#FF453A]/90">{item.claim}</span>
                  </div>
                  <div className="text-white/90 sm:text-right max-w-[560px] text-xs sm:text-sm leading-relaxed font-sans font-normal">
                    {item.truth}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-white/70">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                Tree-sitter AST Grounded
              </span>
              <span>•</span>
              <span>Zero Silent Fallbacks</span>
              <span>•</span>
              <span>Deterministic Factor Weights</span>
              <span>•</span>
              <span className="text-[#34C759] font-bold">Non-Destructive Diffs</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default TrustSection;
