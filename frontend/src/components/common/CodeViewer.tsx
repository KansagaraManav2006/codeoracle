import React, { useState, useEffect, useMemo } from 'react';
import { Clipboard, Check, Maximize2, Minimize2, WrapText } from 'lucide-react';
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

// Lightweight syntax tokenizer for Python and JavaScript/TypeScript
function highlightSyntax(line: string, _language: string = 'python'): React.ReactNode {
  if (!line) return ' ';

  const trimmed = line.trimStart();
  // Comment line check
  if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return <span className="text-gray-400 italic opacity-85">{line}</span>;
  }

  // Regex tokens: strings, comments, keywords, decorators, numbers
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|#.*$|\/\/.*$|@[\w.]+|\b(?:def|class|return|if|elif|else|for|while|try|except|finally|import|from|as|with|assert|yield|raise|pass|lambda|async|await|const|let|var|function|export|default|interface|type|extends|implements|new|this|typeof|instanceof|void|null|undefined|true|false|True|False|None|describe|it|test|expect|vi|pytest)\b|\b\d+(?:\.\d+)?\b)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('#') || token.startsWith('//')) {
      parts.push(<span key={match.index} className="text-gray-400 italic opacity-85">{token}</span>);
    } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      parts.push(<span key={match.index} className="text-emerald-400 font-normal">{token}</span>);
    } else if (token.startsWith('@')) {
      parts.push(<span key={match.index} className="text-purple-400 font-semibold">{token}</span>);
    } else if (/^\d/.test(token)) {
      parts.push(<span key={match.index} className="text-amber-300">{token}</span>);
    } else {
      // Keyword
      parts.push(<span key={match.index} className="text-indigo-300 font-semibold">{token}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  filePath,
  targetPath,
  code,
  language = 'python',
  syntaxStatus,
  onCopy,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Handle ESC to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen]);

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

  const lines = useMemo(() => (code || '').split('\n'), [code]);

  const viewerContent = (
    <section
      className={`bg-code-bg rounded-lg overflow-hidden flex flex-col border border-code-line w-full max-w-full min-w-0 ${
        fullscreen
          ? 'w-full h-full max-w-6xl shadow-2xl z-50'
          : className
      }`}
      aria-label={`Code for ${filePath || 'file'}`}
    >
      {/* Top bar */}
      <header className="bg-code-bar px-4 sm:px-5 py-3 border-b border-code-line flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="font-mono font-bold text-[13px] text-indigo-on-dark truncate" title={filePath}>
            {filePath || 'Select a file'}
          </div>
          {targetPath && (
            <div className="text-[11px] text-code-muted font-sans mt-0.5 truncate">
              Targets <span className="font-mono text-code-text">{targetPath}</span>
            </div>
          )}
          {syntaxStatus && (
            <div className="text-[11px] text-teal-on-dark flex items-center gap-1 font-sans mt-0.5">
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{syntaxStatus}</span>
            </div>
          )}
        </div>

        {code && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Wrap toggle */}
            <button
              type="button"
              onClick={() => setWrap(!wrap)}
              title={wrap ? 'Disable line wrap' : 'Enable line wrap'}
              className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors border ${
                wrap
                  ? 'bg-indigo/30 text-white border-indigo/60'
                  : 'bg-code-bg/60 text-code-muted hover:text-white border-code-line'
              }`}
            >
              <WrapText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">{wrap ? 'Wrap On' : 'Wrap Off'}</span>
            </button>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => setFullscreen(!fullscreen)}
              title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
              className="p-1.5 rounded text-xs text-code-muted hover:text-white bg-code-bg/60 border border-code-line transition-colors"
            >
              {fullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Copy button */}
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
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </header>

      {/* Code viewport with line numbers and horizontal scrolling */}
      <div
        className={`relative overflow-x-auto overflow-y-auto max-w-full min-w-0 dark-scrollbar ${
          fullscreen ? 'flex-1 max-h-[calc(100vh-140px)]' : 'max-h-[560px]'
        }`}
      >
        {code ? (
          <pre
            tabIndex={0}
            className={`p-4 sm:p-5 font-mono text-[12.5px] leading-[1.65] text-code-text m-0 max-w-full min-w-0 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
              wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
            }`}
          >
            <code className="block min-w-0">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-baseline min-w-0 hover:bg-white/5 py-0.5 px-1 rounded">
                  <span
                    className="shrink-0 pr-4 text-right select-none text-code-muted text-[11px] opacity-50 w-10 font-mono"
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>
                  <span className={`min-w-0 ${wrap ? 'break-words' : ''}`}>
                    {highlightSyntax(line, language)}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        ) : (
          <div className="p-12 text-center text-code-muted font-sans text-sm">
            Select a test file to inspect its code.
          </div>
        )}
      </div>

      {/* Screen-reader live announcement for copy action */}
      <span className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </span>
    </section>
  );

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center animate-[fade-in_150ms_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Fullscreen code viewer"
      >
        {viewerContent}
      </div>
    );
  }

  return viewerContent;
};

export default CodeViewer;
