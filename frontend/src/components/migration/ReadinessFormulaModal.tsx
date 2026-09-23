import React from 'react';
import { X, Calculator, CheckCircle2 } from 'lucide-react';
import { ReadinessDimension } from '../../types';
import Button from '../common/Button';

interface ReadinessFormulaModalProps {
  dimension: ReadinessDimension | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReadinessFormulaModal: React.FC<ReadinessFormulaModalProps> = ({
  dimension,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !dimension) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="formula-modal-title"
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-ink/40 backdrop-blur-[6px] animate-[fade-in_150ms_ease-out_both]"
    >
      <div className="w-full max-w-[560px] bg-surface rounded-xl border border-line shadow-4 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-indigo-surface text-indigo flex items-center justify-center border border-indigo/20 shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="formula-modal-title" className="font-display font-bold text-base text-ink">
                  {dimension.label} — Auditable Formula
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-pill font-mono font-bold uppercase bg-tile border border-line text-ink">
                  Confidence: {dimension.confidence || 'Medium'}
                </span>
              </div>
              <p className="text-xs text-ink-3 mt-0.5">
                Deterministic calculation logic derived from AST and static analysis.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-tile transition-colors"
            aria-label="Close formula details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dimension Score & Status Banner */}
        <div className="p-3.5 bg-tile rounded-lg border border-line flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-3 block">Score &amp; Status</span>
            <span className="text-sm font-bold text-ink font-sans">
              {dimension.status} ({dimension.reason})
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-mono font-bold text-ink">{dimension.score}</span>
            <span className="text-xs text-ink-3 font-mono"> / 100</span>
          </div>
        </div>

        {/* Mathematical Formula */}
        {dimension.formula && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
              Implemented Mathematical Formula:
            </span>
            <div className="p-3 rounded-md bg-ink text-indigo-on-dark font-mono text-xs overflow-x-auto">
              <code>{dimension.formula}</code>
            </div>
          </div>
        )}

        {/* Step-by-Step Breakdown Table */}
        {dimension.breakdown && dimension.breakdown.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
              Auditable Score Contribution Breakdown:
            </span>
            <div className="border border-line rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-tile text-ink-3 font-mono uppercase text-[10px] border-b border-line">
                  <tr>
                    <th className="p-2.5">Evaluation Factor</th>
                    <th className="p-2.5 text-right">Contribution / Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono">
                  {dimension.breakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-tile/40">
                      <td className="p-2.5 text-ink-2 font-sans">{item.label}</td>
                      <td className="p-2.5 text-right font-bold text-ink">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empirical Evidence */}
        {dimension.evidence && dimension.evidence.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
              Underlying Analysis Evidence:
            </span>
            <ul className="space-y-1 text-xs text-ink-2">
              {dimension.evidence.map((ev, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-strong shrink-0 mt-0.5" />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
          <span className="text-ink-3 italic text-[11px]">
            Static planning score; auditable against project AST.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReadinessFormulaModal;
