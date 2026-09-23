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
      a: 'Hotspot risk is an explainable weighted equation: 35% Cyclomatic Complexity (CC), 20% AST syntax warnings/debt, 25% incoming caller count (Fan-In), and 20% downstream blast radius. The breakdown is transparently displayed for every module.',
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
      q: 'What is the difference between a modernization finding and autofix?',
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

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 bg-[#FFFFFF] overflow-hidden">
      <div className="max-w-[920px] mx-auto">
        <div
          className="text-center mb-16 transition-all duration-700 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-4 font-geist-mono">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-4 font-geist">
            Answers for curious engineers.
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73] leading-relaxed font-sans">
            Everything you need to know about our AST parsing, security boundaries, and modernization philosophy.
          </p>
        </div>

        {/* Accordion List with Stagger */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] overflow-hidden transition-all duration-500 ease-out hover:border-[#D2D2D7]"
                style={{
                  opacity: prefersReduced || inView ? 1 : 0,
                  transform: prefersReduced || inView ? 'none' : 'translate3d(0, 16px, 0)',
                  transitionDelay: prefersReduced ? '0ms' : `${idx * 40}ms`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-sm sm:text-base font-bold text-[#1D1D1F]">
                    {faq.q}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#6E6E73] shrink-0 shadow-sm">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 text-xs sm:text-sm text-[#424245] leading-relaxed border-t border-[#E5E5EA] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
