import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();

  const faqs = [
    {
      q: 'Does CodeOracle execute uploaded repository code?',
      a: 'No. Uploaded repositories undergo strictly read-only static analysis using Tree-sitter and AST parsers. Code is never executed, evaled, or imported dynamically during analysis. Generated tests are only run automatically on the bundled, trusted benchmark.',
    },
    {
      q: 'Which languages are supported?',
      a: 'CodeOracle natively supports Python 3.10+, JavaScript (ESM and CommonJS), and TypeScript. Tree-sitter parsers provide deep AST grounding across syntax constructs, imports, and functional boundaries.',
    },
    {
      q: 'What does Full AST coverage mean?',
      a: 'Full AST coverage indicates that 100% of source files in the repository were parsed into complete syntax trees without encountering parse errors or falling back to token-level regex heuristics.',
    },
    {
      q: 'How is hotspot risk calculated?',
      a: 'Hotspot risk is an explainable weighted equation: 35% Cyclomatic Complexity (CC), 20% AST syntax debt, 25% incoming caller count (Fan-In), and 20% downstream blast radius. The breakdown is transparently displayed for every module.',
    },
    {
      q: 'What does "unresolved dependency" mean?',
      a: 'An unresolved dependency is an import statement that could not be mapped to an internal repository source file (such as a 3rd-party pip/npm package, a dynamic string import, or an uninstalled C extension). CodeOracle flags these explicitly rather than hallucinating paths.',
    },
    {
      q: 'Are generated safety tests executed automatically?',
      a: 'No. Generated characterization tests are statically validated for syntax correctness, but never executed against untrusted user uploads. You can download the generated pytest/Vitest suite as a ZIP to run in your own isolated CI sandbox.',
    },
    {
      q: 'What is the difference between a finding and autofix?',
      a: 'A modernization finding represents a detected legacy pattern (e.g. Python 2 print statements or old callbacks). An autofix candidate is an extremely pure transformation with zero breaking changes. CodeOracle requires explicit human review before any code transformation.',
    },
    {
      q: 'How does impact analysis work?',
      a: 'Impact analysis walks the directed dependency graph starting from a target file, calculating direct callers, transitive dependents up to N hops, and flagging any top-level entry points (such as API routes or main scripts) that would be perturbed.',
    },
    {
      q: 'Can I upload a ZIP archive instead of connecting GitHub?',
      a: 'Yes. You can upload ZIP archives up to 200 MB in size containing up to 10,000 files. CodeOracle performs safe zip extraction with directory traversal bounds checking.',
    },
    {
      q: 'Does CodeOracle modify my original repository?',
      a: 'Never. CodeOracle treats all ingested repositories as read-only. Refactoring proposals are presented as downloadable unified diffs, leaving your local disk or remote Git repository completely untouched.',
    },
    {
      q: 'Why might graph confidence be partial?',
      a: 'Graph confidence is marked PARTIAL if a repository relies heavily on dynamic meta-programming, runtime monkey-patching, or dynamic requires where static analysis cannot guarantee 100% resolution of every edge.',
    },
    {
      q: 'Can I download generated tests and modernization reports?',
      a: 'Yes. At any time from the Safety Tests tab, you can export a ZIP containing the generated test suites. From the Migration tab, you can export an executive Markdown report detailing the full architectural roadmap.',
    },
  ];

  const col1 = faqs.slice(0, 6);
  const col2 = faqs.slice(6);

  return (
    <section
      id="faq-section"
      ref={sectionRef}
      className="w-full min-h-[100svh] flex flex-col justify-center py-8 lg:py-12 pt-20 px-4 sm:px-6 bg-[#FFFFFF] overflow-hidden"
    >
      <div className="max-w-[1140px] mx-auto w-full">
        {/* Header (10-15% top area) */}
        <div
          className="text-center max-w-[760px] mx-auto mb-6 lg:mb-8 transition-all duration-700 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-2.5 font-geist-mono">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-2.5 font-geist">
            Answers for curious engineers.
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-[#6E6E73] leading-relaxed font-sans max-w-[620px] mx-auto">
            Everything you need to know about our AST parsing, security boundaries, and modernization philosophy.
          </p>
        </div>

        {/* 2-Column Accordion Grid (65-75% main content) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-3.5 mb-6">
          {/* Column 1 */}
          <div className="space-y-2.5">
            {col1.map((faq, idx) => {
              const actualIdx = idx;
              const isOpen = openIndex === actualIdx;
              return (
                <div
                  key={faq.q}
                  className={`rounded-xl border overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? 'bg-white border-[#007AFF]/40 shadow-apple' : 'bg-[#F5F5F7] border-[#E5E5EA] hover:border-[#D2D2D7]'
                  }`}
                  style={{
                    opacity: prefersReduced || inView ? 1 : 0,
                    transform: prefersReduced || inView ? 'none' : 'translate3d(0, 12px, 0)',
                    transitionDelay: prefersReduced ? '0ms' : `${idx * 30}ms`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : actualIdx)}
                    className="w-full text-left p-3 sm:p-3.5 flex items-center justify-between gap-3 focus:outline-none"
                  >
                    <span className={`text-xs sm:text-sm font-bold leading-snug font-geist ${isOpen ? 'text-[#007AFF]' : 'text-[#1D1D1F]'}`}>
                      {faq.q}
                    </span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                      isOpen ? 'bg-[#EAF4FF] text-[#007AFF]' : 'bg-white text-[#6E6E73]'
                    }`}>
                      {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 text-[#007AFF]" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 text-xs text-[#424245] leading-relaxed border-t border-[#E5E5EA] pt-2.5 bg-white/60 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Column 2 */}
          <div className="space-y-2.5">
            {col2.map((faq, idx) => {
              const actualIdx = idx + 6;
              const isOpen = openIndex === actualIdx;
              return (
                <div
                  key={faq.q}
                  className={`rounded-xl border overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? 'bg-white border-[#007AFF]/40 shadow-apple' : 'bg-[#F5F5F7] border-[#E5E5EA] hover:border-[#D2D2D7]'
                  }`}
                  style={{
                    opacity: prefersReduced || inView ? 1 : 0,
                    transform: prefersReduced || inView ? 'none' : 'translate3d(0, 12px, 0)',
                    transitionDelay: prefersReduced ? '0ms' : `${(idx + 6) * 30}ms`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : actualIdx)}
                    className="w-full text-left p-3 sm:p-3.5 flex items-center justify-between gap-3 focus:outline-none"
                  >
                    <span className={`text-xs sm:text-sm font-bold leading-snug font-geist ${isOpen ? 'text-[#007AFF]' : 'text-[#1D1D1F]'}`}>
                      {faq.q}
                    </span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                      isOpen ? 'bg-[#EAF4FF] text-[#007AFF]' : 'bg-white text-[#6E6E73]'
                    }`}>
                      {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 text-[#007AFF]" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 text-xs text-[#424245] leading-relaxed border-t border-[#E5E5EA] pt-2.5 bg-white/60 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Reassurance (10-15% breathing room) */}
        <div className="flex items-center justify-center">
          <span className="text-xs font-geist-mono text-[#86868B]">
            Have more questions? All analyses are locally reproducible in isolated environments.
          </span>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
