import React, { useState } from 'react';
import { Check, Clipboard, AlertTriangle } from 'lucide-react';
import { DarkSegmentedControl } from './SegmentedControl';

export type DiffMode = 'diff' | 'original' | 'modernized';

interface RuleWarning {
  name: string;
  description: string;
}

interface DiffViewerProps {
  filePath: string;
  diffCode: string;
  originalCode: string;
  modernizedCode: string;
  mode: DiffMode;
  onModeChange: (mode: DiffMode) => void;
  syntaxCheckPassed?: boolean;
  ruleWarning?: RuleWarning | null;
  onCopy?: () => void;
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  filePath,
  diffCode,
  originalCode,
  modernizedCode,
  mode,
  onModeChange,
  syntaxCheckPassed = true,
  ruleWarning,
  onCopy,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const activeCode =
    mode === 'diff' ? diffCode : mode === 'original' ? originalCode : modernizedCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setLiveAnnouncement('Copied to clipboard');
      onCopy?.();
      setTimeout(() => {
        setCopied(false);
        setLiveAnnouncement('');
      }, 1500);
    } catch {
      // Ignore
    }
  };

  const renderDiffLines = () => {
    const lines = (diffCode || '').split('\n');

    return lines.map((line, idx) => {
      const isAdd = line.startsWith('+') && !line.startsWith('+++');
      const isDel = line.startsWith('-') && !line.startsWith('---');
      const isHunk = line.startsWith('@@');
      const isHeader = line.startsWith('---') || line.startsWith('+++');

      let rowClass = 'text-code-text';
      let marker = ' ';
      let markerClass = 'text-code-muted select-none';

      if (isAdd) {
        rowClass = 'bg-[rgba(94,184,150,0.14)] text-[#D5F2E3]';
        marker = '+';
        markerClass = 'text-teal-on-dark font-bold select-none';
      } else if (isDel) {
        rowClass = 'bg-[rgba(193,98,93,0.18)] text-[#F7CECB]';
        marker = '−';
        markerClass = 'text-diff-del-text font-bold select-none';
      } else if (isHunk) {
        rowClass = 'text-indigo-on-dark bg-indigo-deep/20 font-semibold';
      } else if (isHeader) {
        rowClass = 'text-code-muted opacity-80';
      }

      const content = isAdd || isDel ? line.slice(1) : line;

      return (
        <div key={idx} className={`table-row leading-[1.7] ${rowClass}`}>
          {/* Gutter / Marker */}
          <span
            className={`table-cell w-6 text-center pr-2 ${markerClass}`}
            aria-hidden="true"
          >
            {marker}
          </span>
          {/* Code text */}
          <span className="table-cell whitespace-pre">{content || ' '}</span>
        </div>
      );
    });
  };

  const renderPlainLines = (text: string) => {
    const lines = (text || '').split('\n');
    return lines.map((line, idx) => (
      <div key={idx} className="table-row leading-[1.7] text-code-text">
        <span
          className="table-cell pr-4 text-right select-none text-code-muted text-[12px] opacity-60 w-10"
          aria-hidden="true"
        >
          {idx + 1}
        </span>
        <span className="table-cell whitespace-pre">{line || ' '}</span>
      </div>
    ));
  };

  return (
    <section
      className={`bg-code-bg rounded-lg overflow-hidden flex flex-col border border-code-line ${className}`}
      aria-label={`Proposal diff for ${filePath || 'file'}`}
    >
      {/* Top bar */}
      <header className="bg-code-bar px-4 sm:px-5 py-3 border-b border-code-line flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono font-bold text-[13px] text-indigo-on-dark truncate">
            {filePath || 'Select a file'}
          </div>
          {syntaxCheckPassed && (
            <div className="text-[12px] text-teal-on-dark flex items-center gap-1 font-sans mt-0.5">
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Syntax check passed</span>
            </div>
          )}
        </div>

        {/* Segmented control + Copy action */}
        <div className="flex items-center gap-2">
          <DarkSegmentedControl<DiffMode>
            options={[
              { id: 'diff', label: 'Diff' },
              { id: 'original', label: 'Original' },
              { id: 'modernized', label: 'Modernized' },
            ]}
            value={mode}
            onChange={onModeChange}
          />

          <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied' : 'Copy active code'}
            aria-label={copied ? 'Copied' : 'Copy active code'}
            className="w-8 h-8 rounded-full bg-indigo-deep text-indigo-badge-text flex items-center justify-center hover:bg-indigo-deep/90 active:scale-[0.97] transition-all"
          >
            {copied ? (
              <Check className="w-4 h-4 text-teal-on-dark" strokeWidth={2} />
            ) : (
              <Clipboard className="w-4 h-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </header>

      {/* Rule / Warning bar */}
      {ruleWarning && (
        <div className="bg-amber-warn-bg px-4 sm:px-5 py-2.5 flex items-start gap-2 border-b border-amber-line/20 text-[12px]">
          <AlertTriangle className="w-4 h-4 text-amber-on-dark shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1">
            <span className="font-bold text-amber-on-dark uppercase tracking-wider mr-2">
              {ruleWarning.name}:
            </span>
            <span className="text-amber-warn-text">{ruleWarning.description}</span>
          </div>
        </div>
      )}

      {/* Code viewport */}
      <div className="relative overflow-auto max-h-[560px] dark-scrollbar">
        {activeCode ? (
          <pre
            tabIndex={0}
            className="p-4 sm:p-6 font-mono text-[13px] text-code-text m-0 whitespace-pre overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
          >
            <code>
              {mode === 'diff' ? renderDiffLines() : renderPlainLines(activeCode)}
            </code>
          </pre>
        ) : (
          <div className="p-12 text-center text-code-muted font-sans text-sm">
            Select a file to view changes.
          </div>
        )}
      </div>

      <span className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </span>
    </section>
  );
};

export default DiffViewer;
