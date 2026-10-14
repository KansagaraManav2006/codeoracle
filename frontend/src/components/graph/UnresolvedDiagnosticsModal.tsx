import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { UnresolvedDependency } from '../../types';
import Button from '../common/Button';

export interface UnresolvedDiagnosticsModalProps {
  unresolvedCount: number;
  unresolvedDependencies?: UnresolvedDependency[];
  unresolvedBreakdown?: Record<string, number>;
  onClose: () => void;
}

export const UnresolvedDiagnosticsModal: React.FC<UnresolvedDiagnosticsModalProps> = ({
  unresolvedCount,
  unresolvedDependencies = [],
  unresolvedBreakdown,
  onClose,
}) => {
  const [selectedDiagnosticKey, setSelectedDiagnosticKey] = useState<string>('all');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-[fade-in_150ms_ease-out]">
      <div className="bg-surface border border-line rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-panel">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-surface text-amber flex items-center justify-center border border-amber-line">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Unresolved Dependencies Diagnostics
              </h3>
              <p className="text-xs text-ink-3">
                {unresolvedCount} internal relationship(s) could not be confidently resolved to target files.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-tile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diagnostic Categories Filter */}
        <div className="p-4 border-b border-line bg-surface flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedDiagnosticKey('all')}
            className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors ${
              selectedDiagnosticKey === 'all'
                ? 'bg-indigo text-white'
                : 'bg-panel text-ink-2 hover:bg-tile border border-line'
            }`}
          >
            All ({unresolvedCount})
          </button>
          {unresolvedBreakdown &&
            Object.entries(unresolvedBreakdown).map(([key, count]) => {
              const label =
                key === 'ts_alias'
                  ? 'TS Aliases'
                  : key === 'python_relative'
                  ? 'Python Relative'
                  : key === 'dynamic_import'
                  ? 'Dynamic Imports'
                  : key === 'generated'
                  ? 'Generated Code'
                  : key === 'syntax_error'
                  ? 'Parse Fallback'
                  : key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDiagnosticKey(key)}
                  className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors ${
                    selectedDiagnosticKey === key
                      ? 'bg-indigo text-white'
                      : 'bg-panel text-ink-2 hover:bg-tile border border-line'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
        </div>

        {/* Diagnostics Items List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {unresolvedDependencies.length > 0 ? (
            unresolvedDependencies
              .filter((u) => selectedDiagnosticKey === 'all' || u.reason_key === selectedDiagnosticKey)
              .map((u, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg border border-line bg-tile hover:bg-surface transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-text">
                      {u.source_path} <span className="text-ink-4">line {u.line}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-surface text-amber-text border border-amber-line">
                      {u.reason_key.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-ink bg-surface p-2 rounded border border-line/60 break-all mb-1.5">
                    <span className="text-ink-4">import:</span>
                    <strong>{u.raw_import}</strong>
                  </div>
                  <p className="text-[11px] text-ink-3">
                    {u.reason_label}
                  </p>
                </div>
              ))
          ) : (
            <div className="text-center py-10 text-xs text-ink-3">
              No unresolved dependencies in this category.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line bg-panel flex items-center justify-between">
          <span className="text-xs text-ink-3">
            Resolving tsconfig paths or Python package roots improves full architecture confidence.
          </span>
          <Button
            variant="indigo"
            size="sm"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnresolvedDiagnosticsModal;
