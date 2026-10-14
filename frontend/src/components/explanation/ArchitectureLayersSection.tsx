import React from 'react';
import { FolderGit2 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { formatNumber } from '../../utils/formatters';

interface ArchitectureLayersSectionProps {
  architectureLayers: any[];
  selectedLayer: string | null;
  onSelectLayer: (layer: string | null) => void;
  onViewModules: () => void;
}

export const ArchitectureLayersSection: React.FC<ArchitectureLayersSectionProps> = ({
  architectureLayers,
  selectedLayer,
  onSelectLayer,
  onViewModules,
}) => {
  if (architectureLayers.length === 0) return null;

  return (
    <Card variant="primary" padding="lg" className="space-y-4 animate-[fade-up_200ms_ease-out_both]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
            <FolderGit2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide inline-block mb-0.5">
              Question 2 · Structural Decomposition
            </span>
            <h3 className="font-display font-bold text-base sm:text-lg text-ink">
              What Are Its Major Layers?
            </h3>
          </div>
        </div>
        {selectedLayer && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewModules}
              className="text-xs"
            >
              View Filtered Modules ({selectedLayer}) →
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectLayer(null)}
              className="text-xs"
            >
              Clear Filter
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {architectureLayers.map((layer) => {
          const isSelected = selectedLayer === layer.path;
          return (
            <div
              key={layer.path}
              onClick={() => {
                const next = isSelected ? null : layer.path;
                onSelectLayer(next);
              }}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo bg-indigo-surface ring-2 ring-indigo ring-offset-1'
                  : 'border-line bg-tile hover:bg-track'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectLayer(isSelected ? null : layer.path);
                }
              }}
              title={`Click to select ${layer.path}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="font-mono text-xs font-bold text-ink truncate" title={layer.path}>
                  {layer.path}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-pill bg-surface border border-line text-ink-3">
                  {layer.role}
                </span>
              </div>

              {/* Dual metric breakdown: files share vs LOC share */}
              <div className="space-y-1 my-2">
                <div className="flex items-center justify-between text-xs text-ink-2 font-mono">
                  <span>{layer.file_count} files</span>
                  <span className="text-ink-3">{layer.file_percentage}% of source files</span>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-2 font-mono">
                  <span>{formatNumber(layer.loc)} LOC</span>
                  <span className="text-ink-3">{layer.loc_percentage}% of code</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-track rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo rounded-full"
                  style={{ width: `${Math.max(layer.file_percentage, 5)}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                {layer.entry_points > 0 ? (
                  <span className="text-teal-strong font-semibold">{layer.entry_points} entry root(s)</span>
                ) : (
                  <span className="text-ink-4">Internal layer</span>
                )}
                {layer.has_cycle && (
                  <span className="text-[10px] font-bold text-red">• Cyclic Loop</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedLayer && (
        <div className="pt-3 border-t border-line flex items-center justify-between">
          <span className="text-xs text-ink-2">
            Active layer filter: <strong className="font-mono text-indigo">{selectedLayer}</strong>
          </span>
          <Button
            variant="indigo"
            size="sm"
            onClick={onViewModules}
          >
            Inspect Matching Modules in Explorer →
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ArchitectureLayersSection;
