import React from 'react';
import { Target } from 'lucide-react';
import { GraphNodeData } from '../../types';
import { truncateMiddle } from '../../utils/formatters';
import Button from '../common/Button';
import { LanguageTag, StatusTag } from '../common/Tags';

export type ListSortField = 'label' | 'role' | 'in' | 'out' | 'unresolved' | 'status' | 'cc';

export interface GraphListViewTableProps {
  sortedListNodes: GraphNodeData[];
  sortField: ListSortField;
  sortAsc: boolean;
  inDegreeMap: Map<string, number>;
  outDegreeMap: Map<string, number>;
  onSortChange: (field: ListSortField) => void;
  onSelectNode: (node: GraphNodeData) => void;
  onInspectImpact?: (filePath: string) => void;
  onSelectFile?: (filePath: string) => void;
}

export const GraphListViewTable: React.FC<GraphListViewTableProps> = ({
  sortedListNodes,
  sortField,
  sortAsc,
  inDegreeMap,
  outDegreeMap,
  onSortChange,
  onSelectNode,
  onInspectImpact,
  onSelectFile,
}) => {
  return (
    <div
      role="region"
      aria-label="Dependency graph data table"
      className="bg-surface border border-line rounded-lg overflow-x-auto shadow-1"
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-panel text-ink-2 font-bold uppercase tracking-wider text-[11px] border-b border-line select-none">
          <tr>
            <th
              className="py-3 px-4 cursor-pointer hover:bg-tile"
              onClick={() => onSortChange('label')}
            >
              Module {sortField === 'label' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="py-3 px-4 cursor-pointer hover:bg-tile"
              onClick={() => onSortChange('role')}
            >
              Role {sortField === 'role' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="py-3 px-4 text-center cursor-pointer hover:bg-tile"
              onClick={() => onSortChange('in')}
            >
              Fan-In (Callers) {sortField === 'in' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="py-3 px-4 text-center cursor-pointer hover:bg-tile"
              onClick={() => onSortChange('out')}
            >
              Fan-Out (Deps) {sortField === 'out' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="py-3 px-4 text-center cursor-pointer hover:bg-tile"
              onClick={() => onSortChange('unresolved')}
            >
              Unresolved {sortField === 'unresolved' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="py-3 px-4 cursor-pointer hover:bg-tile"
              onClick={() => onSortChange('status')}
            >
              Parse Status {sortField === 'status' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="py-3 px-4 cursor-pointer hover:bg-tile"
              onClick={() => onSortChange('cc')}
            >
              Risk / CC {sortField === 'cc' && (sortAsc ? '↑' : '↓')}
            </th>
            <th className="py-3 px-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60 text-ink-2 font-mono">
          {sortedListNodes.map((n) => {
            const inCount = inDegreeMap.get(n.id) || 0;
            const outCount = outDegreeMap.get(n.id) || 0;
            const unres = n.unresolved_imports || 0;

            return (
              <tr
                key={n.id}
                className="hover:bg-tile/70 cursor-pointer transition-colors"
                onClick={() => onSelectNode(n)}
              >
                <td className="py-3 px-4 font-bold text-indigo-text">
                  <div className="flex items-center gap-1.5">
                    <span>{truncateMiddle(n.label, 36)}</span>
                    <LanguageTag language={n.language} />
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-panel text-ink-2 border border-line">
                    {(n.module_role || 'utility').toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-teal-strong font-bold">{inCount}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-indigo-text font-bold">{outCount}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  {unres > 0 ? (
                    <span className="text-amber font-bold">{unres}</span>
                  ) : (
                    <span className="text-ink-4">0</span>
                  )}
                </td>
                <td className="py-3 px-4 font-sans text-xs">
                  {n.parse_status === 'complete' ? (
                    <span className="text-teal-strong">Complete (Full AST)</span>
                  ) : (
                    <span className="text-amber-text font-bold uppercase">{n.parse_status || 'Partial'}</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusTag
                    status={`complexity-${n.complexity_rating.toLowerCase()}`}
                    label={`${n.complexity_rating.toUpperCase()} (${n.complexity_score})`}
                  />
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Button
                      variant="indigo"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFile?.(n.label);
                        onInspectImpact?.(n.label);
                      }}
                      icon={<Target className="w-3 h-3" />}
                    >
                      Impact
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default GraphListViewTable;
