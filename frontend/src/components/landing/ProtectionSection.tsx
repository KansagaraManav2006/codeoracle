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
    <section id="protection-section" ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 bg-[#FFFFFF] overflow-hidden">
      <div className="max-w-[1140px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Verification Ladder UI (7 cols) */}
          <div
            className="lg:col-span-7 bg-[#F5F5F7] rounded-[32px] border border-[#E5E5EA] shadow-apple-md p-6 sm:p-8 space-y-6 transition-all duration-700 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 32px, 0)',
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EA]">
              <div>
                <span className="text-xs font-mono font-bold text-[#007AFF] uppercase">
                  Behavioral Guardrail Ladder
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] mt-0.5">
                  Verification State Hierarchy
                </h3>
              </div>
              <div className="px-3 py-1 rounded-full bg-white border border-[#E5E5EA] text-xs font-mono text-[#248A3D] font-semibold flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>1,172 Test Cases Ready</span>
              </div>
            </div>

            {/* Ladder Steps with ascending stagger */}
            <div className="space-y-3">
              {ladderSteps.map((step, idx) => (
                <div
                  key={step.stage}
                  className={`p-4 rounded-2xl border transition-all duration-500 ${
                    step.status === 'valid'
                      ? 'bg-white border-[#E5E5EA] shadow-sm'
                      : 'bg-white/60 border-dashed border-[#D2D2D7]'
                  }`}
                  style={{
                    opacity: prefersReduced || inView ? 1 : 0,
                    transform: prefersReduced || inView ? 'none' : 'translate3d(0, 20px, 0)',
                    transitionDelay: prefersReduced ? '0ms' : `${idx * 110}ms`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      {step.status === 'valid' ? (
                        <CheckCircle2 className={`w-4 h-4 text-[#34C759] shrink-0 transition-transform duration-300 ${inView ? 'scale-110' : 'scale-75'}`} />
                      ) : (
                        <MinusCircle className="w-4 h-4 text-[#86868B] shrink-0" />
                      )}
                      <span className="text-sm font-bold text-[#1D1D1F] font-mono">
                        {step.stage}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                        step.status === 'valid'
                          ? 'bg-[#E8F9ED] text-[#248A3D] font-bold'
                          : 'bg-[#F2F2F7] text-[#636366]'
                      }`}
                    >
                      {step.proof}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6E73] ml-6 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>

            {/* Test Sample Code Snippet Box */}
            <div className="bg-[#1D1D1F] rounded-2xl p-4 text-xs font-mono text-white/90 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] text-white/60">
                <span>test_anomaly_explain.py</span>
                <span className="text-[#34C759]">pytest compatible</span>
              </div>
              <pre className="text-[11px] leading-relaxed text-[#007AFF] overflow-x-auto">
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
            className="lg:col-span-5 space-y-6 transition-all duration-700 delay-150 ease-out"
            style={{
              opacity: prefersReduced || inView ? 1 : 0,
              transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
            }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Behavioral Guardrails</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] leading-[1.08]">
              Protect behavior before refactoring it.
            </h2>

            <p className="text-base text-[#6E6E73] leading-relaxed">
              Before modifying legacy code, engineers need characterization tests that freeze current inputs, outputs, and edge cases. CodeOracle generates deterministic test suites you can download and run in your CI pipeline.
            </p>

            <div className="p-5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1D1D1F]">
                <AlertCircle className="w-4 h-4 text-[#007AFF]" />
                <span>Strict Separation of Static vs Runtime</span>
              </div>
              <p className="text-xs text-[#6E6E73] leading-relaxed">
                CodeOracle explicitly distinguishes static validation (AST syntax checks) from runtime behavior verification. We never fake test runs or execute untrusted code in an unisolated environment.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#86868B] font-mono">
              <span>• pytest</span>
              <span>• Vitest / Jest</span>
              <span>• ZIP Exportable</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProtectionSection;
