import React from 'react';
import {
  FileText,
  Network,
  CheckSquare,
  GitBranch,
  Milestone,
  AlertTriangle,
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F5F1E9] text-[#181715] scroll-mt-20">
      <div className="max-w-[1240px] mx-auto">
        {/* Section Header */}
        <div className="max-w-[700px] mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDFC] border border-[#C8BEB0] text-xs font-mono text-[#3B3733] shadow-sm mb-4">
            <span className="text-[#4C4FD6] font-bold">CAPABILITIES</span>
            <span className="text-[#A39888]">•</span>
            <span>Five Core Analysis Pillars</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#181715]">
            Everything needed to inspect, guard, and modernize legacy code.
          </h2>
          <p className="text-base text-[#5C554D] mt-3">
            Deterministic AST metrics paired with actionable proposals—no speculative guesswork.
          </p>
        </div>

        {/* Asymmetric but orderly 5-card grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Card 1: Code Explanations (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#FFFDFC] rounded-3xl p-6 sm:p-8 border border-[#C8BEB0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#EAE9FB] text-[#4C4FD6] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#181715]">
                    Code explanations
                  </h3>
                  <p className="text-xs text-[#5C554D]">
                    Structural role, cyclomatic complexity, and behavioral summary
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#3B3733] mb-6">
                Understand the real responsibility of any file in seconds. CodeOracle classifies entry points, state stores, orchestrators, and utility sinks with exact complexity rankings.
              </p>
            </div>

            {/* Mini-preview: Code Explanation UI */}
            <div className="rounded-2xl bg-[#ECE5DA]/60 border border-[#C8BEB0]/80 p-4 font-mono text-xs text-[#181715]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#C8BEB0]/60">
                <span className="font-bold text-[#4C4FD6]">flask/app.py</span>
                <span className="px-2 py-0.5 rounded bg-[#FFFDFC] text-[11px] border border-[#C8BEB0]">
                  Complexity: 18 (High)
                </span>
              </div>
              <p className="text-xs text-[#3B3733] font-sans mb-3">
                <span className="font-semibold text-[#181715]">Primary Role:</span> Central WSGI application controller coordinating URL routing, request dispatch, and blueprint registration.
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-lg bg-[#FFFDFC] border border-[#C8BEB0]/60">
                  <span className="block text-[#5C554D]">Functions</span>
                  <span className="font-bold text-[#181715]">42</span>
                </div>
                <div className="p-2 rounded-lg bg-[#FFFDFC] border border-[#C8BEB0]/60">
                  <span className="block text-[#5C554D]">Fan-out</span>
                  <span className="font-bold text-[#181715]">19 modules</span>
                </div>
                <div className="p-2 rounded-lg bg-[#FFFDFC] border border-[#C8BEB0]/60">
                  <span className="block text-[#5C554D]">Risk Index</span>
                  <span className="font-bold text-[#B88228]">Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Dependency Graph (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#FFFDFC] rounded-3xl p-6 sm:p-8 border border-[#C8BEB0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#EAE9FB] text-[#4C4FD6] flex items-center justify-center">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#181715]">
                    Dependency graph
                  </h3>
                  <p className="text-xs text-[#5C554D]">
                    Interactive topological graph & cycle detection
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#3B3733] mb-6">
                Trace how files connect. Instantly spotlight circular import chains, isolated modules, and structural bottlenecks before touching a single line.
              </p>
            </div>

            {/* Mini-preview: Graph UI */}
            <div className="rounded-2xl bg-[#181715] text-[#FFFDFC] p-4 font-mono text-xs border border-[#3B3733]">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#3B3733]">
                <span className="text-[#C8BEB0]">Topology Analyzer</span>
                <span className="flex items-center gap-1 text-[#B88228] text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" /> 1 Circular Dep
                </span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="p-2 rounded bg-[#23211E] flex items-center justify-between">
                  <span>helpers.py → config.py</span>
                  <span className="text-[#3EA862]">Direct</span>
                </div>
                <div className="p-2 rounded bg-[#23211E] border border-[#B88228]/40 flex items-center justify-between">
                  <span className="text-[#B88228]">session.py ↔ ctx.py</span>
                  <span className="text-[#B88228]">Cycle [2-hop]</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Generated Tests (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#FFFDFC] rounded-3xl p-6 sm:p-8 border border-[#C8BEB0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#EAE9FB] text-[#4C4FD6] flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#181715]">
                    Generated tests
                  </h3>
                  <p className="text-xs text-[#5C554D]">
                    Pin behavior before refactoring
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#3B3733] mb-6">
                Automated synthesis of pytest and jest test suites targeting unverified edge branches and legacy regressions.
              </p>
            </div>

            {/* Mini-preview: Test harness */}
            <div className="rounded-2xl bg-[#ECE5DA]/60 border border-[#C8BEB0]/80 p-3.5 font-mono text-[11px] text-[#181715]">
              <div className="text-[#4C4FD6] font-bold mb-1">tests/test_behavior.py</div>
              <div className="bg-[#FFFDFC] p-2.5 rounded-lg border border-[#C8BEB0]/60 space-y-1">
                <p className="text-[#5C554D]">def test_session_lifecycle():</p>
                <p className="pl-3 text-[#181715]">client = app.test_client()</p>
                <p className="pl-3 text-[#3EA862]">assert client.get("/").status == 200</p>
              </div>
              <div className="mt-2 text-[10px] text-[#5C554D] flex justify-between">
                <span>Coverage: 84% branch</span>
                <span className="text-[#3EA862] font-semibold">Ready to run</span>
              </div>
            </div>
          </div>

          {/* Card 4: Refactor Proposals (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#FFFDFC] rounded-3xl p-6 sm:p-8 border border-[#C8BEB0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#EAE9FB] text-[#4C4FD6] flex items-center justify-center">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#181715]">
                    Refactor proposals
                  </h3>
                  <p className="text-xs text-[#5C554D]">
                    Non-destructive, reviewable diffs
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#3B3733] mb-6">
                Review precise code modernizations: replace deprecated APIs, decouple cycles, and introduce clean dependency injection.
              </p>
            </div>

            {/* Mini-preview: Diff preview */}
            <div className="rounded-2xl bg-[#181715] text-[#FFFDFC] p-3.5 font-mono text-[11px] border border-[#3B3733]">
              <div className="text-[#A39888] pb-1 border-b border-[#3B3733] flex justify-between">
                <span>flask/sessions.py</span>
                <span className="text-[#4C4FD6]">Proposal #1</span>
              </div>
              <div className="pt-2 space-y-0.5">
                <p className="text-[#D9383A] bg-[#D9383A]/10 px-1 rounded">- import cPickle as pickle</p>
                <p className="text-[#3EA862] bg-[#3EA862]/10 px-1 rounded">+ import json</p>
                <p className="text-[#3EA862] bg-[#3EA862]/10 px-1 rounded">+ class SecureSerializer: ...</p>
              </div>
            </div>
          </div>

          {/* Card 5: Migration Plan (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#FFFDFC] rounded-3xl p-6 sm:p-8 border border-[#C8BEB0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#EAE9FB] text-[#4C4FD6] flex items-center justify-center">
                  <Milestone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#181715]">
                    Migration plan
                  </h3>
                  <p className="text-xs text-[#5C554D]">
                    Sequenced waves & rollback safeguards
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#3B3733] mb-6">
                Organize massive refactoring into manageable, sequenced phases (W0 foundation to W3 modernization) with blast radius estimates.
              </p>
            </div>

            {/* Mini-preview: Waves preview */}
            <div className="rounded-2xl bg-[#ECE5DA]/60 border border-[#C8BEB0]/80 p-3.5 font-mono text-[11px] text-[#181715]">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-1.5 rounded bg-[#FFFDFC] border border-[#C8BEB0]/60">
                  <span className="font-bold text-[#4C4FD6]">Wave W0</span>
                  <span className="text-[10px] text-[#5C554D]">Add safety tests</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-[#FFFDFC] border border-[#C8BEB0]/60">
                  <span className="font-bold text-[#B88228]">Wave W1</span>
                  <span className="text-[10px] text-[#5C554D]">Break cycles</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-[#FFFDFC] border border-[#C8BEB0]/60">
                  <span className="font-bold text-[#3EA862]">Wave W2</span>
                  <span className="text-[10px] text-[#5C554D]">Type & API updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
