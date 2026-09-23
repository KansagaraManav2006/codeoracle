import React from 'react';
import { Terminal, Users, Cpu, GraduationCap, CheckCircle2 } from 'lucide-react';
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';

export const AudienceSection: React.FC = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const prefersReduced = useReducedMotion();

  const audiences = [
    {
      role: 'Developers',
      icon: Terminal,
      headline: 'Understand unfamiliar modules quickly',
      desc: 'Jump into inherited repos without reading thousands of lines. See AST explanations, callers, and dependencies on day one.',
    },
    {
      role: 'Tech Leads',
      icon: Users,
      headline: 'Prioritize refactoring using architecture evidence',
      desc: 'Stop debating refactoring priorities in meeting rooms. Let cyclomatic complexity, fan-in, and blast radius rank targets objectively.',
    },
    {
      role: 'Modernization Teams',
      icon: Cpu,
      headline: 'Sequence change safely across dependency waves',
      desc: 'Migrate legacy Python 2 or legacy JavaScript code in verified waves — protecting baselines first and advancing from leaves to core services.',
    },
    {
      role: 'Students & Learners',
      icon: GraduationCap,
      headline: 'Learn how real enterprise codebases fit together',
      desc: 'Explore production-grade open source projects like Flask and Express in an interactive 2D spatial universe.',
    },
    {
      role: 'Reviewers & QA',
      icon: CheckCircle2,
      headline: 'Inspect risk and evidence before approving PRs',
      desc: 'Simulate downstream blast radius before merging. Know exactly which entry points will be touched before deployment.',
    },
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
          <p className="text-xs font-semibold text-[#007AFF] tracking-wider uppercase mb-3 font-geist-mono">
            Who It&apos;s For
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-4 font-geist">
            Built for engineers entering code they didn&apos;t write.
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73] leading-relaxed font-sans">
            Whether you are on-boarding into a legacy monolith, planning a cloud modernization, or reviewing risky PRs, CodeOracle gives you architectural clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {audiences.map((aud, idx) => {
            const Icon = aud.icon;
            return (
              <div
                key={aud.role}
                className={`bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-apple flex flex-col justify-between hover:-translate-y-1 hover:shadow-apple-md transition-all duration-600 ease-out ${
                  idx === 4 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
                style={{
                  opacity: prefersReduced || inView ? 1 : 0,
                  transform: prefersReduced || inView ? 'none' : 'scale(0.94) translate3d(0, 24px, 0)',
                  transitionDelay: prefersReduced ? '0ms' : `${idx * 90}ms`,
                }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] text-[#007AFF] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-[#86868B] uppercase">
                        Role 0{idx + 1}
                      </span>
                      <h3 className="text-base font-bold text-[#1D1D1F]">{aud.role}</h3>
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-[#1D1D1F] mb-2">{aud.headline}</h4>
                  <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed">{aud.desc}</p>
                </div>

                <div className="pt-4 mt-6 border-t border-[#E5E5EA] text-[11px] text-[#86868B] font-mono">
                  Optimized Workflow
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AudienceSection;
