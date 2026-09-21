import React from 'react';
import { ArrowDown, CheckCircle2, FileDiff, SearchCheck, Wrench, ShieldAlert } from 'lucide-react';
import { FindingFunnel as FindingFunnelData } from '../../types';

interface Props {
  funnel: FindingFunnelData;
}

export const FindingFunnel: React.FC<Props> = ({ funnel }) => {
  const isZeroVerified = (funnel.verified_changes || 0) === 0;

  const stages = [
    {
      label: 'Total findings',
      value: funnel.total_findings,
      icon: SearchCheck,
      cardClass: 'bg-indigo-surface border border-indigo/25 text-ink',
      iconClass: 'text-indigo',
      valueClass: 'text-ink',
      hint: 'Static AST, cycle & risk detections',
    },
    {
      label: 'Modernization candidates',
      value: funnel.modernization_candidates,
      icon: Wrench,
      cardClass: 'bg-indigo-surface/65 border border-indigo/20 text-ink',
      iconClass: 'text-indigo',
      valueClass: 'text-ink',
      hint: 'Eligible modernization patterns',
    },
    {
      label: 'Generated diffs',
      value: funnel.generated_diffs,
      icon: FileDiff,
      cardClass: 'bg-indigo-surface/35 border border-indigo/15 text-ink',
      iconClass: 'text-indigo',
      valueClass: 'text-ink',
      hint: 'Syntax-checked diff proposals',
    },
    {
      label: 'Verified changes',
      value: funnel.verified_changes,
      icon: isZeroVerified ? ShieldAlert : CheckCircle2,
      cardClass: isZeroVerified
        ? 'bg-amber-surface/40 border border-amber-line/50 text-amber-strong'
        : 'bg-teal-surface border border-teal/25 text-teal-strong',
      iconClass: isZeroVerified ? 'text-amber-strong' : 'text-teal-strong',
      valueClass: isZeroVerified ? 'text-amber-strong' : 'text-teal-strong',
      hint: isZeroVerified ? 'Awaiting sandbox verification' : 'Validated in sandbox test runs',
    },
  ];

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-1">
      <div className="mb-3.5">
        <h3 className="font-display text-sm sm:text-base font-bold text-ink">Finding Funnel</h3>
        <p className="mt-0.5 text-xs text-ink-3 font-sans">
          Trace findings from static detection through candidate filtering, diff generation, and verified execution.
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <React.Fragment key={stage.label}>
              <div className={`rounded-lg p-3.5 flex flex-col justify-between transition-all ${stage.cardClass}`}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Icon className={`h-4 w-4 ${stage.iconClass}`} />
                    <span className={`font-display text-xl font-extrabold num ${stage.valueClass}`}>
                      {stage.value}
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-2">{stage.label}</p>
                </div>
                <p className="mt-1.5 text-[10px] text-ink-3 font-sans font-medium leading-tight">{stage.hint}</p>
              </div>
              {index < 3 && <ArrowDown className="mx-auto h-4 w-4 text-ink-4 sm:hidden" />}
            </React.Fragment>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] font-mono text-ink-3">
        {funnel.autofixable_findings} autofixable pattern(s) · {funnel.estimated_findings} estimated finding(s) · {funnel.verification_label}
      </p>
    </section>
  );
};

export default FindingFunnel;
