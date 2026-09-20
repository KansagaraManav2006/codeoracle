import React from 'react';
import { ArrowDown, CheckCircle2, FileDiff, SearchCheck, Wrench } from 'lucide-react';
import { FindingFunnel as FindingFunnelData } from '../../types';

interface Props {
  funnel: FindingFunnelData;
}

const stages = (funnel: FindingFunnelData) => [
  { label: 'Total findings', value: funnel.total_findings, icon: SearchCheck, tone: 'bg-[#ECE5DA] text-[#4D4842]' },
  { label: 'Modernization candidates', value: funnel.modernization_candidates, icon: Wrench, tone: 'bg-[#EAE9FB] text-[#4340A0]' },
  { label: 'Generated diffs', value: funnel.generated_diffs, icon: FileDiff, tone: 'bg-[#F5E8CC] text-[#76561B]' },
  { label: 'Verified changes', value: funnel.verified_changes, icon: CheckCircle2, tone: 'bg-[#E0EFEB] text-[#245F59]' },
];

export const FindingFunnel: React.FC<Props> = ({ funnel }) => (
  <section className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
    <div className="mb-3">
      <h3 className="text-sm font-extrabold text-[#292622]">Finding funnel</h3>
      <p className="mt-0.5 text-xs text-[#6B645A]">Counts move from static evidence to reviewable and verified change.</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-4">
      {stages(funnel).map((stage, index) => {
        const Icon = stage.icon;
        return (
          <React.Fragment key={stage.label}>
            <div className={`rounded-xl p-3 ${stage.tone}`}>
              <div className="flex items-center justify-between gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-xl font-extrabold">{stage.value}</span>
              </div>
              <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide">{stage.label}</p>
            </div>
            {index < 3 && <ArrowDown className="mx-auto h-4 w-4 text-[#A3998E] sm:hidden" />}
          </React.Fragment>
        );
      })}
    </div>
    <p className="mt-3 text-[11px] font-medium text-[#6B645A]">
      {funnel.autofixable_findings} autofixable finding(s) · {funnel.estimated_findings} estimated finding(s) · {funnel.verification_label}
    </p>
  </section>
);

export default FindingFunnel;
