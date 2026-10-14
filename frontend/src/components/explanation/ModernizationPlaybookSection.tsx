import React from 'react';
import { Activity } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

interface ModernizationPlaybookSectionProps {
  onGenerateTests: () => void;
  onInspectInGraph: () => void;
  onAnalyzeImpact: () => void;
  onReviewModernization: () => void;
  onPlanMigration: () => void;
}

export const ModernizationPlaybookSection: React.FC<ModernizationPlaybookSectionProps> = ({
  onGenerateTests,
  onInspectInGraph,
  onAnalyzeImpact,
  onReviewModernization,
  onPlanMigration,
}) => {
  return (
    <Card variant="primary" padding="lg" className="space-y-4 animate-[fade-up_200ms_ease-out_both]">
      <div className="flex items-center gap-3 pb-3 border-b border-line">
        <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
          <Activity className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide inline-block mb-0.5">
            Question 5 · Execution Roadmap
          </span>
          <h3 className="font-display font-bold text-base sm:text-lg text-ink">
            What Should I Do Next? Guided Modernization Playbook
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
          <div>
            <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 1 · PIN</span>
            <h4 className="font-bold text-xs text-ink">Generate Tests</h4>
            <p className="text-[11px] text-ink-3 leading-snug mt-1">
              Pin behavior with deterministic characterization tests before modernizing code.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateTests}
            className="w-full text-xs !py-1 font-semibold"
          >
            Generate Tests →
          </Button>
        </div>

        <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
          <div>
            <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 2 · MAP</span>
            <h4 className="font-bold text-xs text-ink">Inspect Coupling</h4>
            <p className="text-[11px] text-ink-3 leading-snug mt-1">
              Review internal &amp; external imports, entry points, and isolate dependency cycles.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onInspectInGraph}
            className="w-full text-xs !py-1 font-semibold"
          >
            Dependency Map →
          </Button>
        </div>

        <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
          <div>
            <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 3 · SIMULATE</span>
            <h4 className="font-bold text-xs text-ink">Analyze Impact</h4>
            <p className="text-[11px] text-ink-3 leading-snug mt-1">
              Simulate what breaks if you edit high-risk modules and check downstream ripple.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyzeImpact}
            className="w-full text-xs !py-1 font-semibold"
          >
            Analyze Impact →
          </Button>
        </div>

        <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
          <div>
            <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 4 · PREVIEW</span>
            <h4 className="font-bold text-xs text-ink">Modernize Code</h4>
            <p className="text-[11px] text-ink-3 leading-snug mt-1">
              Review AST-validated modernization diffs and verify transformations in sandbox.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReviewModernization}
            className="w-full text-xs !py-1 font-semibold"
          >
            Modernize Code →
          </Button>
        </div>

        <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
          <div>
            <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 5 · EXECUTE</span>
            <h4 className="font-bold text-xs text-ink">Migration Plan</h4>
            <p className="text-[11px] text-ink-3 leading-snug mt-1">
              Follow staged wave-by-wave execution roadmap ordered by dependency topology.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onPlanMigration}
            className="w-full text-xs !py-1 font-semibold"
          >
            Migration Plan →
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ModernizationPlaybookSection;
