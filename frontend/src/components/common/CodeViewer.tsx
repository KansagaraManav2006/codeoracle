import React, { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';
import Button from './Button';

interface CodeViewerProps {
  filePath: string;
  targetPath?: string;
  code: string;
  language?: string;
  syntaxStatus?: string;
  onCopy?: () => void;
  className?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  filePath,
  targetPath,
  code,
  language: _language,
  syntaxStatus,
  onCopy,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setLiveAnnouncement('Copied to clipboard');
      onCopy?.();
      setTimeout(() => {
        setCopied(false);
        setLiveAnnouncement('');
      }, 1500);
    } catch {
      // Fallback
    }
  };

  const lines = (code || '').split('\n');

  return (
    <section
      className={`bg-code-bg rounded-lg overflow-hidden flex flex-col border border-code-line ${className}`}
      aria-label={`Code for ${filePath || 'file'}`}
    >
      {/* Top bar */}
      <header className="bg-code-bar px-4 sm:px-5 py-3.5 border-b border-code-line flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono font-bold text-[13px] text-indigo-on-dark truncate">
            {filePath || 'Select a file'}
          </div>
          {targetPath && (
            <div className="text-[12px] text-code-muted font-sans mt-0.5 truncate">
              Targets <span className="font-mono text-code-text">{targetPath}</span>
            </div>
          )}
          {syntaxStatus && (
            <div className="text-[12px] text-teal-on-dark flex items-center gap-1 font-sans mt-0.5">
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{syntaxStatus}</span>
            </div>
          )}
        </div>

        {code && (
          <Button
            variant="dark"
            size="sm"
            onClick={handleCopy}
            icon={
              copied ? (
                <Check className="w-3.5 h-3.5 text-teal-on-dark" strokeWidth={2} />
              ) : (
                <Clipboard className="w-3.5 h-3.5" strokeWidth={1.75} />
              )
            }
          >
            {copied ? 'Copied' : 'Copy Code'}
          </Button>
        )}
      </header>

      {/* Code viewport with line numbers */}
      <div className="relative overflow-auto max-h-[560px] dark-scrollbar">
        {code ? (
          <pre
            tabIndex={0}
            className="p-4 sm:p-6 font-mono text-[13px] leading-[1.7] text-code-text m-0 whitespace-pre overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
          >
            <code>
              {lines.map((line, idx) => (
                <div key={idx} className="table-row">
                  <span
                    className="table-cell pr-4 text-right select-none text-code-muted text-[12px] opacity-60 w-10"
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>
                  <span className="table-cell">{line || ' '}</span>
                </div>
              ))}
            </code>
          </pre>
        ) : (
          <div className="p-12 text-center text-code-muted font-sans text-sm">
            Select a file to view its code.
          </div>
        )}
      </div>

      {/* Screen-reader live announcement for copy action */}
      <span className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </span>
    </section>
  );
};

export default CodeViewer;
