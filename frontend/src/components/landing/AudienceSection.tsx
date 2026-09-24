import React from 'react';
import { Terminal, Users, Cpu, GraduationCap, CheckCircle2, UserCheck } from 'lucide-react';
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
    <section
      id="audience-section"
      ref={sectionRef}
      className="w-full min-h-[100svh] flex flex-col justify-center py-8 lg:py-12 pt-20 px-4 sm:px-6 bg-[#F5F5F7] overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto w-full">
        {/* Header (10-15% top area) */}
        <div
          className="text-center max-w-[760px] mx-auto mb-6 lg:mb-8 transition-all duration-700 ease-out"
          style={{
            opacity: prefersReduced || inView ? 1 : 0,
            transform: prefersReduced || inView ? 'none' : 'translate3d(0, 24px, 0)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-2.5 font-geist-mono">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Who It&apos;s For</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-tight mb-2.5 font-geist">
            Built for engineers entering code they didn&apos;t write.
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-[#6E6E73] leading-relaxed font-sans max-w-[660px] mx-auto">
            Whether you are on-boarding into a legacy monolith, planning a cloud modernization, or reviewing risky PRs, CodeOracle gives you architectural clarity.
          </p>
        </div>

        {/* 5 Roles Grid (65-75% main content) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-6">
          {audiences.map((aud, idx) => {
            const Icon = aud.icon;
            return (
              <div
                key={aud.role}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E5EA] shadow-apple flex flex-col justify-between hover:-translate-y-1 hover:border-[#007AFF]/40 hover:shadow-apple-md transition-all duration-500 ease-out"
                style={{
                  opacity: prefersReduced || inView ? 1 : 0,
                  transform: prefersReduced || inView ? 'none' : 'scale(0.94) translate3d(0, 24px, 0)',
                  transitionDelay: prefersReduced ? '0ms' : `${idx * 70}ms`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-[#007AFF] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-geist-mono font-bold text-[#86868B] uppercase bg-[#F5F5F7] px-2 py-0.5 rounded-md">
                      0{idx + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1D1D1F] mb-1 font-geist">{aud.role}</h3>
                  <h4 className="text-xs font-semibold text-[#007AFF] mb-2 leading-snug">{aud.headline}</h4>
                  <p className="text-[11px] sm:text-xs text-[#6E6E73] leading-relaxed">{aud.desc}</p>
                </div>

                <div className="pt-3 mt-4 border-t border-[#E5E5EA] text-[10px] text-[#86868B] font-geist-mono flex items-center justify-between">
                  <span>Optimized Workflow</span>
                  <span className="text-[#34C759] font-medium">Ready</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom indicator (10-15% breathing room) */}
        <div className="flex items-center justify-center">
          <span className="text-xs font-geist-mono text-[#86868B]">
            Unified by AST evidence • Shared cross-functional mental model
          </span>
        </div>
      </div>
    </section>
  );
};

export default AudienceSection;
