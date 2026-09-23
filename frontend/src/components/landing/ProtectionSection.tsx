import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  MinusCircle,
  AlertCircle,
} from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const ProtectionSection: React.FC = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();

  const ladderSteps = [
    {
      stage: 'Generated',
      status: 'valid',
      detail: 'Deterministic pytest / Vitest characterization test files generated via AST analysis',
      proof: '133 suites created',
    },
    {
      stage: 'Syntax Valid',
      status: 'valid',
      detail: 'Parser verification guarantees 0 syntax errors and valid import contracts',
      proof: '133 / 133 validated',
    },
    {
      stage: 'Runtime Executed',
      status: 'pending',
      detail: 'Uploaded untrusted code is NEVER executed without explicit container isolation',
      proof: 'Strict Read-Only Guard',
    },
    {
      stage: 'Behavior Verified',
      status: 'pending',
      detail: 'Runtime assertion verification reserved for trusted sandbox runs only',
      proof: 'Explicit Boundary',
    },
  ];

  return (
    <section
      id="protection-section"
      ref={sectionRef}
      className="min-h-[100svh] w-full flex flex-col justify-center py-10 lg:py-14 pt-20 px-4 sm:px-6 bg-[#FFFFFF] overflow-hidden"
    >
      <div className="max-w-[1140px] w-full mx-auto my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Verification Ladder UI (7 cols) */}
          <div
            className="lg:col-span-7 bg-[#F5F5F7] rounded-2xl sm:rounded-3xl border border-[#E5E5EA] shadow-apple-md p-5 sm:p-6 space-y-4 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#007AFF] uppercase">
                  Behavioral Guardrail Ladder
                </span>
                <h3 className="text-sm sm:text-base font-bold text-[#1D1D1F] mt-0.5">
                  Verification State Hierarchy
                </h3>
              </div>
              <div className="px-2.5 py-0.5 rounded-full bg-white border border-[#E5E5EA] text-[11px] font-mono text-[#248A3D] font-semibold flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>1,172 Test Cases Ready</span>
              </div>
            </div>

            {/* Ladder Steps with ascending stagger */}
            <div className="space-y-2">
              {ladderSteps.map((step, idx) => (
                <div
                  key={step.stage}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-500 ${
                    step.status === 'valid'
                      ? 'bg-white border-[#E5E5EA] shadow-xs'
                      : 'bg-white/70 border-dashed border-[#D2D2D7]'
                  }`}
                  style={{
                    opacity: prefersReduced || inView ? 1 : 0,
                    transform: prefersReduced || inView ? 'none' : 'translate3d(0, 16px, 0)',
                    transitionDelay: prefersReduced ? '0ms' : `${idx * 80}ms`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {step.status === 'valid' ? (
                        <div className="w-5 h-5 rounded-full bg-[#E8F9ED] flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                          <MinusCircle className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
                        </div>
                      )}
                      <span className="text-xs sm:text-sm font-bold text-[#1D1D1F] font-geist">
                        {step.stage}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        step.status === 'valid'
                          ? 'bg-[#E8F9ED] text-[#248A3D] border-[#34C759]/20'
                          : 'bg-[#F2F2F7] text-[#636366] border-[#D2D2D7]'
                      }`}
                    >
                      {step.proof}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6E73] ml-7 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>

            {/* Test Sample Code Snippet Box */}
            <div className="bg-[#1D1D1F] rounded-2xl p-4 text-xs font-mono text-white/90 overflow-hidden shadow-apple-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
                    <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                    <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
                  </div>
                  <span className="text-white/70 font-semibold ml-1">tests/test_anomaly_explain.py</span>
                </div>
                <span className="text-[#34C759] text-[11px] font-bold bg-[#34C759]/15 px-2 py-0.5 rounded-full">
                  pytest validated
                </span>
              </div>
              <pre className="text-[11px] leading-relaxed text-[#007AFF] overflow-x-auto py-1">
{`def test_characterization_anomaly_explain_defaults():
    # Pin current legacy branching contract before modernization
    result = render_anomaly_panel(threshold=0.85, active=True)
    assert result.has_warnings == True
    assert len(result.rendered_series) >= 1`}
              </pre>
            </div>
          </div>

          {/* Right Column: Editorial Text & Trust Differentiator (5 cols) */}
          <div
            className="lg:col-span-5 space-y-4 transition-all duration-700 delay-150 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 20px, 0)',
            }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider font-geist-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Behavioral Guardrails</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-[#1D1D1F] leading-[1.08] font-geist">
              Protect behavior before refactoring it.
            </h2>

            <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed font-sans">
              Before modifying legacy code, engineers need characterization tests that freeze current inputs, outputs, and edge cases. CodeOracle generates deterministic test suites you can download and run in your CI pipeline.
            </p>

            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1D1D1F]">
                <AlertCircle className="w-3.5 h-3.5 text-[#007AFF]" />
                <span className="font-geist">Strict Separation of Static vs Runtime</span>
              </div>
              <p className="text-xs text-[#6E6E73] leading-relaxed">
                CodeOracle explicitly distinguishes static validation (AST syntax checks) from runtime behavior verification. We never fake test runs or execute untrusted code in an unisolated environment.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#86868B]">
              <span className="px-3 py-1 rounded-full bg-white border border-[#E5E5EA] shadow-xs">pytest</span>
              <span className="px-3 py-1 rounded-full bg-white border border-[#E5E5EA] shadow-xs">Vitest / Jest</span>
              <span className="px-3 py-1 rounded-full bg-white border border-[#E5E5EA] shadow-xs text-[#007AFF] font-bold">ZIP Exportable</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProtectionSection;
