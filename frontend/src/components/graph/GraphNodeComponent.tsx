import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import { truncateMiddle } from '../../utils/formatters';
import { LanguageTag, StatusTag } from '../common/Tags';
import { GraphNodeData } from '../../types';

export interface GraphNodeProps {
  data: {
    node: GraphNodeData;
    isSelected: boolean;
    isCycle: boolean;
    isEntryPoint: boolean;
    isExternal: boolean;
    isUnresolved: boolean;
    isDimmed: boolean;
    inDegree?: number;
    outDegree?: number;
  };
}

export const GraphNodeComponent: React.FC<GraphNodeProps> = ({ data }) => {
  const {
    node,
    isSelected,
    isCycle,
    isEntryPoint,
    isExternal,
    isUnresolved,
    isDimmed,
    inDegree = 0,
    outDegree = 0,
  } = data;

  let containerClass = 'bg-surface border border-line shadow-xs';
  if (isCycle) {
    containerClass = 'bg-red-surface/95 border-2 border-red-line shadow-xs ring-1 ring-red/30';
  } else if (isEntryPoint) {
    containerClass = 'bg-surface border border-line border-l-4 border-l-teal shadow-xs';
  } else if (isUnresolved) {
    containerClass = 'bg-amber-surface/20 border-2 border-dashed border-amber shadow-none';
  } else if (isExternal) {
    containerClass = 'bg-slate-surface/80 border border-dashed border-slate shadow-none';
  }

  if (isSelected) {
    containerClass += ' ring-2 ring-indigo ring-offset-2 shadow-2 scale-[1.02] z-20';
  }

  if (isDimmed) {
    containerClass += ' opacity-25 hover:opacity-100 transition-opacity';
  }

  const roleLabel = (node.module_role || 'module').toUpperCase();
  const entryKind = node.entry_point_kind
    ? node.entry_point_kind.replace('_', ' ').toUpperCase()
    : 'ENTRY';

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Node ${node.label}, ${node.language}, ${inDegree} in, ${outDegree} out`}
      className={`w-[250px] p-2.5 rounded-lg transition-all select-none hover:shadow-2 hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${containerClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-indigo !border-surface !border-2"
      />

      {/* Row 1: File name + language tag */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className="font-mono text-[12px] font-bold text-ink truncate flex-1"
          title={node.label}
        >
          {truncateMiddle(node.label, 22)}
        </span>
        <LanguageTag language={node.language} />
      </div>

      {/* Row 2: Role badge + Entry point / Status badges */}
      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-panel text-ink-2 border border-line">
            {roleLabel}
          </span>
          {isEntryPoint && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-surface text-teal-text border border-teal-line"
              title={node.entry_point_evidence || 'Confirmed entry point'}
            >
              {entryKind}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isCycle && <StatusTag status="critical" label="LOOP" />}
          {isUnresolved && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-surface text-amber-text border border-amber-line flex items-center gap-0.5"
              title={node.standalone_reason || 'Unresolved imports or partial AST parse'}
            >
              <AlertTriangle className="w-2.5 h-2.5" /> PARTIAL
            </span>
          )}
          {isExternal && (
            <span className="px-1 py-0.5 rounded text-[9px] font-mono bg-slate-surface text-slate-text border border-slate/30">
              EXT
            </span>
          )}
        </div>
      </div>

      {/* Row 3: Primary Relationships (IN / OUT) + Risk & CC */}
      <div className="flex items-center justify-between pt-1.5 border-t border-line/60 text-[10px] font-mono text-ink-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 font-bold" title={`${inDegree} incoming callers`}>
            <ArrowDownLeft className="w-2.5 h-2.5 text-teal" />
            <span className="text-teal-strong">IN {inDegree}</span>
          </span>
          <span className="flex items-center gap-0.5 font-bold" title={`${outDegree} outgoing dependencies`}>
            <ArrowUpRight className="w-2.5 h-2.5 text-indigo" />
            <span className="text-indigo-text">OUT {outDegree}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold uppercase ${
              node.complexity_rating === 'critical'
                ? 'bg-red-strong text-white'
                : node.complexity_rating === 'high'
                ? 'bg-amber-surface text-amber-text border border-amber-line'
                : node.complexity_rating === 'medium'
                ? 'bg-amber-surface/70 text-amber-text'
                : 'bg-teal-surface/70 text-teal-text'
            }`}
          >
            {node.complexity_rating}
          </span>
          <span className="text-ink-4 text-[9px]">CC {node.complexity_score}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-indigo !border-surface !border-2"
      />
    </div>
  );
};

export default GraphNodeComponent;
