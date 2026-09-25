import React from 'react';
import { Shield, Cpu, Lock, CheckCircle } from 'lucide-react';

export const AccurateAnalysisSection: React.FC = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#ECE5DA]/50 text-[#181715] border-t border-[#C8BEB0]/60">
      <div className="max-w-[1240px] mx-auto">
        <div className="max-w-[760px] mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDFC] border border-[#C8BEB0] text-xs font-mono text-[#3B3733] shadow-sm mb-4">
            <Shield className="w-3.5 h-3.5 text-[#4C4FD6]" />
            <span>Deterministic Static Analysis</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#181715]">
            Engineered for precision. Not probabilistic guesswork.
          </h2>
          <p className="text-sm sm:text-base text-[#5C554D] mt-3 leading-relaxed">
            CodeOracle does not send private intellectual property to third-party chatbots to guess architectural connections. All dependency graphs, complexity metrics, test fixtures, and refactoring proposals are computed deterministically from your repository’s Abstract Syntax Tree.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#FFFDFC] border border-[#C8BEB0] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#EAE9FB] text-[#4C4FD6] flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[#181715] mb-2">
              Concrete Syntax & AST
            </h3>
            <p className="text-xs text-[#5C554D] leading-relaxed">
              Every method invocation, import statement, class inheritance, and variable assignment is parsed directly into exact syntax nodes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFDFC] border border-[#C8BEB0] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#EAE9FB] text-[#4C4FD6] flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[#181715] mb-2">
              Zero Unvetted Cloud Leakage
            </h3>
            <p className="text-xs text-[#5C554D] leading-relaxed">
              Code remains in your private session environment. Analyzed archives and repository clones are isolated under strict user-owned boundaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFDFC] border border-[#C8BEB0] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#EAE9FB] text-[#4C4FD6] flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[#181715] mb-2">
              Verifiable Test Harness
            </h3>
            <p className="text-xs text-[#5C554D] leading-relaxed">
              Generated tests run against actual execution targets to establish hard regression boundaries before refactor diffs are approved.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccurateAnalysisSection;
