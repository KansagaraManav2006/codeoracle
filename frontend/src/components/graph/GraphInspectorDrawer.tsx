import React from 'react';
import {
  Info,
  Copy,
  Check,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  TestTube,
  Wand2,
} from 'lucide-react';
import { GraphNodeData, GraphEdgeData, UnresolvedDependency, TabType } from '../../types';
import { formatNumber } from '../../utils/formatters';
import Button from '../common/Button';
import { LanguageTag, StatusTag } from '../common/Tags';
import { NodeRiskSummary, GraphLayoutMode, GraphFilterMode } from '../../utils/graphUtils';

export interface SelectedEdgeInspectorData {
  edge: GraphEdgeData;
  sourceLabel: string;
  targetLabel: string;
}

export interface GraphInspectorDrawerProps {
  selectedEdgeData: SelectedEdgeInspectorData | null;
  selectedNodeData: GraphNodeData | null;
  selectedNodeRisk: NodeRiskSummary | null;
  incomingEdges: GraphEdgeData[];
  outgoingEdges: GraphEdgeData[];
  selectedNodeUnresolved: UnresolvedDependency[];
  cyclesWithNode: string[][];
  cycleNodeIds: Set<string>;
  inDegreeMap: Map<string, number>;
  outDegreeMap: Map<string, number>;
  graphLayout: GraphLayoutMode;
  filterMode: GraphFilterMode;
  copiedPath: boolean;
  onClearSelection: () => void;
  onFocusNode: (nodeId: string) => void;
  onToggleFocusMode: () => void;
  onFilterUpstream: () => void;
  onFilterDownstream: () => void;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
  onCopyPath: (path: string) => void;
}

export const GraphInspectorDrawer: React.FC<GraphInspectorDrawerProps> = ({
  selectedEdgeData,
  selectedNodeData,
  selectedNodeRisk,
  incomingEdges,
  outgoingEdges,
  selectedNodeUnresolved,
  cyclesWithNode,
  cycleNodeIds,
  inDegreeMap,
  outDegreeMap,
  graphLayout,
  filterMode,
  copiedPath,
  onClearSelection,
  onFocusNode,
  onToggleFocusMode,
  onFilterUpstream,
  onFilterDownstream,
  onInspectImpact,
  onNavigateTab,
  onSelectFile,
  onCopyPath,
}) => {
  return (
    <div className="bg-surface border border-line rounded-lg p-5 shadow-1 min-h-[440px] flex flex-col justify-between">
      <div>
        <div className="pb-3 border-b border-line mb-4 flex items-center justify-between">
          <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block">
            {selectedEdgeData ? 'SELECTED RELATIONSHIP' : 'SELECTED NODE'}
          </span>
          {(selectedNodeData || selectedEdgeData) && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-ink-3 hover:text-ink font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Edge Inspection Card */}
        {selectedEdgeData ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-1 text-[11px] text-ink-3 font-semibold mb-1">
                <span>Source Module:</span>
              </div>
              <div className="font-mono text-xs font-bold text-ink break-all bg-tile p-2 rounded border border-line">
                {selectedEdgeData.sourceLabel}
              </div>
            </div>

            <div className="text-center font-mono text-indigo font-bold text-sm">↓ imports ↓</div>

            <div>
              <div className="flex items-center justify-between gap-1 text-[11px] text-ink-3 font-semibold mb-1">
                <span>Target Module:</span>
              </div>
              <div className="font-mono text-xs font-bold text-ink break-all bg-tile p-2 rounded border border-line">
                {selectedEdgeData.targetLabel}
              </div>
            </div>

            <div className="bg-tile rounded-md p-3 border border-line text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-ink-3">Relationship:</span>
                <span className="font-bold text-indigo-text">
                  {(selectedEdgeData.edge.kind || selectedEdgeData.edge.type).replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Confidence:</span>
                <span className="font-bold text-teal-strong">
                  {(selectedEdgeData.edge.confidence || 'HIGH').toUpperCase()}
                </span>
              </div>
              {selectedEdgeData.edge.raw_import && (
                <div className="flex justify-between">
                  <span className="text-ink-3">Raw Specifier:</span>
                  <span className="font-bold text-ink break-all">{selectedEdgeData.edge.raw_import}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-ink-3">Source Line:</span>
                <span className="font-bold">Line {selectedEdgeData.edge.source_line}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-line space-y-2">
              <Button
                variant="indigo"
                size="sm"
                onClick={() => onFocusNode(selectedEdgeData.edge.target)}
                className="w-full justify-center text-xs"
              >
                Focus Target Module
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFocusNode(selectedEdgeData.edge.source)}
                className="w-full justify-center text-xs"
              >
                Focus Source Module
              </Button>
            </div>
          </div>
        ) : selectedNodeData ? (
          <div className="space-y-4">
            {/* File Label & Badges */}
            <div>
              <div className="flex items-start justify-between gap-1">
                <div className="font-mono font-bold text-[13px] text-ink break-all">
                  {selectedNodeData.label}
                </div>
                <button
                  type="button"
                  onClick={() => onCopyPath(selectedNodeData.label)}
                  className="p-1 rounded text-ink-3 hover:text-ink hover:bg-tile"
                  title="Copy relative file path"
                >
                  {copiedPath ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <LanguageTag language={selectedNodeData.language} />
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-panel text-ink-2 border border-line">
                  ROLE: {(selectedNodeData.module_role || 'utility').toUpperCase()}
                </span>
                {selectedNodeData.is_entry_point && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-surface text-teal-text border border-teal-line">
                    {selectedNodeData.entry_point_kind
                      ? selectedNodeData.entry_point_kind.replace('_', ' ').toUpperCase()
                      : 'ENTRY POINT'}
                  </span>
                )}
                {cycleNodeIds.has(selectedNodeData.id) && (
                  <StatusTag status="critical" label="CYCLE LOOP" />
                )}
              </div>
            </div>

            {/* Parse Status & Entry Evidence */}
            <div className="bg-tile rounded-md p-2.5 border border-line text-xs space-y-1 text-ink-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-ink-3">AST Parse:</span>
                <span className="font-bold text-ink uppercase">
                  {selectedNodeData.parse_status || 'COMPLETE'} (HIGH)
                </span>
              </div>
              {selectedNodeData.entry_point_evidence && (
                <div className="text-[11px] text-teal-strong pt-1 border-t border-line/50">
                  <strong>Evidence:</strong> {selectedNodeData.entry_point_evidence}
                </div>
              )}
            </div>

            {/* Selected-Node Risk Summary Card */}
            <div
              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                selectedNodeRisk?.level === 'critical'
                  ? 'bg-red-surface border-red-line text-red-text'
                  : selectedNodeRisk?.level === 'high'
                  ? 'bg-amber-surface border-amber-line text-amber-text'
                  : selectedNodeRisk?.level === 'medium'
                  ? 'bg-amber-surface/40 border-amber-line/60 text-ink-2'
                  : 'bg-tile border-line text-ink-2'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  RISK SUMMARY
                </span>
                <StatusTag
                  status={
                    selectedNodeRisk?.level === 'critical'
                      ? 'critical'
                      : selectedNodeRisk?.level === 'high'
                      ? 'complexity-high'
                      : selectedNodeRisk?.level === 'medium'
                      ? 'complexity-medium'
                      : 'complexity-low'
                  }
                  label={selectedNodeRisk?.level.toUpperCase() || 'LOW'}
                />
              </div>
              <p className="text-[11px] leading-relaxed">
                {selectedNodeRisk?.reason}
              </p>
            </div>

            {/* Cycle Warning Breakdown */}
            {cyclesWithNode.length > 0 && (
              <div className="p-3 rounded-md bg-red-surface border border-red-line text-xs space-y-1.5 text-red-text">
                <div className="font-bold flex items-center gap-1">
                  <span>Part of {cyclesWithNode.length} Circular Loop(s)</span>
                </div>
                <div className="space-y-1 font-mono text-[10px] bg-white/60 p-2 rounded border border-red-line/40">
                  {cyclesWithNode.map((cycle, i) => (
                    <div key={i} className="truncate" title={cycle.join(' → ')}>
                      Loop {i + 1}: {cycle.slice(0, 3).join(' → ')}
                      {cycle.length > 3 ? ' → …' : ` → ${cycle[0]}`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metric Breakdown */}
            <div className="bg-tile rounded-md p-3 border border-line text-xs space-y-1.5 text-ink-2 font-mono">
              <div className="flex justify-between">
                <span className="text-ink-3">LOC / Complexity:</span>
                <span className="font-bold">
                  {formatNumber(selectedNodeData.line_count)} lines · CC {selectedNodeData.complexity_score}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Incoming Callers:</span>
                <span className="font-bold text-teal-strong">
                  {incomingEdges.length} ({inDegreeMap.get(selectedNodeData.id) || 0} resolved)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Outgoing Dependencies:</span>
                <span className="font-bold text-indigo-text">
                  {outgoingEdges.length} ({outDegreeMap.get(selectedNodeData.id) || 0} resolved)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Blast Radius:</span>
                <span className="font-bold text-red">
                  {selectedNodeData.blast_radius ?? incomingEdges.length} downstream callers
                </span>
              </div>
              {selectedNodeUnresolved.length > 0 && (
                <div className="flex justify-between text-amber-text pt-1 border-t border-line/60">
                  <span>Unresolved Local Imports:</span>
                  <span className="font-bold">{selectedNodeUnresolved.length}</span>
                </div>
              )}
            </div>

            {/* Focus & Neighborhood Isolation Buttons */}
            <div className="space-y-2">
              <Button
                variant={graphLayout === 'focus' ? 'indigo' : 'outline'}
                size="sm"
                onClick={onToggleFocusMode}
                icon={<Eye className="w-3.5 h-3.5" />}
                className="w-full justify-center text-xs"
              >
                {graphLayout === 'focus' ? 'Exit Focus Mode' : 'Focus 1-Hop Neighborhood'}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={filterMode === 'upstream' ? 'indigo' : 'outline'}
                  size="sm"
                  onClick={onFilterUpstream}
                  icon={<ArrowUpRight className="w-3 h-3" />}
                  className="justify-center text-xs"
                >
                  Upstream ({incomingEdges.length})
                </Button>
                <Button
                  variant={filterMode === 'downstream' ? 'indigo' : 'outline'}
                  size="sm"
                  onClick={onFilterDownstream}
                  icon={<ArrowDownLeft className="w-3 h-3" />}
                  className="justify-center text-xs"
                >
                  Downstream ({outgoingEdges.length})
                </Button>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="space-y-2 pt-2 border-t border-line">
              <Button
                variant="indigo"
                size="sm"
                onClick={() => {
                  onSelectFile?.(selectedNodeData.label);
                  onInspectImpact?.(selectedNodeData.label);
                }}
                icon={<Target className="w-3.5 h-3.5" strokeWidth={2} />}
                className="w-full justify-center text-xs font-bold shadow-xs py-2"
              >
                Inspect Blast Radius &amp; Impact
              </Button>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSelectFile?.(selectedNodeData.label);
                    onNavigateTab?.('tests');
                  }}
                  icon={<TestTube className="w-3.5 h-3.5" />}
                  className="text-xs justify-center"
                >
                  Safety Tests
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSelectFile?.(selectedNodeData.label);
                    onNavigateTab?.('refactor');
                  }}
                  icon={<Wand2 className="w-3.5 h-3.5" />}
                  className="text-xs justify-center"
                >
                  Modernize
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 px-2 text-center text-ink-3 flex flex-col items-center justify-center my-auto">
            <div className="w-10 h-10 rounded-full bg-tile border border-line flex items-center justify-center mb-3 text-ink-3 shadow-xs">
              <Info className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-ink mb-1.5">No Node Selected</h4>
            <p className="text-[11px] text-ink-3 font-sans leading-relaxed">
              Click any module node or relationship edge on the canvas to inspect incoming callers, outgoing dependencies, and characterization test hooks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphInspectorDrawer;
