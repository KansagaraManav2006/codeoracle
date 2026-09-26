import React from 'react';
import {
  HelpCircle,
  Binary,
  Users,
  ShieldCheck,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

export const WhatIsCodeOracleSection: React.FC = () => {
  const corePillars = [
    {
      num: '01',
      title: 'What It Is',
      tagline: 'Static AST Codebase Intelligence',
      desc: 'CodeOracle is an automated codebase intelligence engine that translates unreadable, legacy repositories into plain-English architecture summaries, function-by-function explanations, and interactive dependency graphs.',
      badge: 'Read-Only Static Analysis',
      icon: Binary,
      iconBg: 'bg-[#EAF4FF] text-[#007AFF]',
      borderHover: 'hover:border-[#007AFF]/40',
    },
    {
      num: '02',
      title: 'Who It Is For',
      tagline: 'Engineers & Tech Leads Navigating Inherited Code',
      desc: 'Built specifically for developers jumping into unfamiliar codebases, technical leads prioritizing architectural debt, and modernization teams who must refactor legacy Python and JavaScript without breaking production.',
      badge: 'Zero Onboarding Ramp',
      icon: Users,
      iconBg: 'bg-[#F2F1FD] text-[#5856D6]',
      borderHover: 'hover:border-[#5856D6]/40',
    },
    {
      num: '03',
      title: 'The Problem It Solves',
      tagline: 'Hidden Coupling & Untracked Blast Radius',
      desc: 'Legacy rewrites rarely fail from old syntax—they fail because a tiny signature edit silently breaks three distant downstream consumers. CodeOracle maps your entire dependency ripple before you touch a single line.',
      badge: 'Blast Radius Prediction',
      icon: Radio,
      iconBg: 'bg-[#FFF8E6] text-[#B26A00]',
      borderHover: 'hover:border-[#FF9500]/40',
    },
    {
      num: '04',
      title: 'How It Protects You',
      tagline: 'Deterministic Behavioral Pinning',
      desc: 'Before refactoring legacy logic, CodeOracle generates deterministic characterization tests (pytest and Vitest) to lock in current runtime contracts. Uploaded code is never executed without isolated container boundaries.',
      badge: 'Characterization Suites',
      icon: ShieldCheck,
      iconBg: 'bg-[#E8F9ED] text-[#248A3D]',
      borderHover: 'hover:border-[#34C759]/40',
    },
  ];

  const workflowSteps = [
    {
      step: '1. Ingest',
      label: 'Read-Only Intake',
      detail: 'Paste a public GitHub repo or upload a ZIP. Zero code execution.',
    },
    {
      step: '2. Understand',
      label: 'AST Parsing & Topology',
      detail: 'Tree-sitter maps functions, classes, imports, and circular loops.',
    },
    {
      step: '3. Simulate',
      label: 'Risk & Blast Radius',
      detail: 'Explainable 0–100 scores pinpoint fragile modules before changes.',
    },
    {
      step: '4. Protect & Modernize',
      label: 'Tests & Phased Waves',
      detail: 'Generates pytest/Vitest guardrails and non-destructive diffs.',
    },
  ];

  return (
    <section
      id="what-is-codeoracle"
      className="min-h-[100svh] w-full flex flex-col justify-center py-12 lg:py-16 pt-20 px-4 sm:px-6 bg-[#FFFFFF] border-t border-[#E5E5EA] overflow-hidden"
    >
      <div className="max-w-[1180px] w-full mx-auto my-auto">
        {/* Section Header */}
        <ScrollReveal variant="slide-up" duration={550} className="text-center max-w-[840px] mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#007AFF] text-xs font-semibold uppercase tracking-wider mb-3 font-geist-mono shadow-xs">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>The Core Concept Explained</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1D1D1F] leading-[1.08] mb-3 font-geist">
            What is CodeOracle?
          </h2>
          <p className="text-base sm:text-lg text-[#424245] leading-relaxed font-sans max-w-[740px] mx-auto">
            A deterministic codebase intelligence engine and modernization safety simulator. It replaces guesswork with concrete architectural evidence, behavioral test guardrails, and automated impact prediction.
          </p>
        </ScrollReveal>

        {/* 4 Core Pillars Grid (Cards with Zoom-In Scroll Reveal & Stagger) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {corePillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <ScrollReveal
                key={item.num}
                variant="card"
                delay={idx * 80}
                duration={500}
                className="h-full"
              >
                <div
                  className={`bg-[#F5F5F7] rounded-3xl p-6 sm:p-7 border border-[#E5E5EA] shadow-apple flex flex-col justify-between h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-apple-md hover:bg-white ${item.borderHover} group`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl ${item.iconBg} flex items-center justify-center transition-transform group-hover:scale-110 duration-200 shadow-xs`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#86868B] uppercase tracking-wider block">
                            PILLAR {item.num}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] font-geist leading-tight">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white border border-[#E5E5EA] text-[#6E6E73] shadow-xs">
                        {item.badge}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-[#007AFF] mb-2 font-geist">
                      {item.tagline}
                    </h4>
                    <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-5 border-t border-[#E5E5EA] flex items-center justify-between text-xs text-[#86868B] font-mono">
                    <span>Evidence-grounded</span>
                    <span className="text-[#1D1D1F] font-semibold group-hover:text-[#007AFF] transition-colors flex items-center gap-1">
                      Learn more <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* 4-Step Architecture Flow Strip */}
        <ScrollReveal variant="card" delay={320} duration={550}>
          <div className="bg-gradient-to-r from-[#F5F5F7] via-white to-[#F5F5F7] rounded-3xl p-5 sm:p-7 border border-[#E5E5EA] shadow-apple">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E5E5EA]">
              <div>
                <span className="text-xs font-bold text-[#007AFF] uppercase tracking-wider font-geist-mono block mb-0.5">
                  End-to-End Modernization Lifecycle
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] font-geist">
                  How a messy codebase turns into a safe migration plan:
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#248A3D] bg-[#E8F9ED] px-3 py-1 rounded-full font-semibold">
                  Zero Untrusted Code Execution
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {workflowSteps.map((wf, i) => (
                <div
                  key={wf.step}
                  className="bg-white rounded-2xl p-4 border border-[#E5E5EA] flex flex-col justify-between shadow-xs hover:border-[#007AFF]/30 transition-all"
                >
                  <div>
                    <div className="text-[11px] font-mono font-bold text-[#007AFF] mb-1">
                      {wf.step}
                    </div>
                    <div className="text-sm font-bold text-[#1D1D1F] mb-1 font-geist">
                      {wf.label}
                    </div>
                    <div className="text-xs text-[#6E6E73] leading-relaxed">
                      {wf.detail}
                    </div>
                  </div>
                  {i < workflowSteps.length - 1 && (
                    <div className="hidden lg:flex justify-end pt-2 text-[#C7C7CC]">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default WhatIsCodeOracleSection;
