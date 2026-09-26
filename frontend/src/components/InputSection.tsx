import React, { useState } from 'react';
import {
  Github,
  FolderArchive,
  ArrowRight,
  Upload,
  Sparkles,
  Shield,
  Lock,
  FileOutput,
  FileCode,
  CheckCircle2,
  X,
  Clipboard,
  Info,
  Loader2,
  Check,
} from 'lucide-react';
import { IngestionMode } from '../types';
import Button from './common/Button';
import Badge from './common/Badge';
import Card from './common/Card';
import PageHeader from './common/PageHeader';
import { formatBytes } from '../utils/formatters';

import { normalizeGithubUrl, validateGithubUrl } from '../utils/github';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

const MAX_ZIP_BYTES = 200 * 1024 * 1024;

interface InputSectionProps {
  onAnalyzeZip: (file: File) => void;
  onAnalyzeGithub: (url: string) => void;
  onLoadDemo: (benchmarkName?: string) => void;
  disabled?: boolean;
  initialGithubUrl?: string | null;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onAnalyzeZip,
  onAnalyzeGithub,
  onLoadDemo,
  disabled = false,
  initialGithubUrl,
}) => {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<IngestionMode>('github');
  const [githubUrl, setGithubUrl] = useState(initialGithubUrl || '');
  const [githubError, setGithubError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sync when initialGithubUrl changes (e.g. from Edit Repository URL)
  React.useEffect(() => {
    if (initialGithubUrl) {
      setGithubUrl(initialGithubUrl);
      setMode('github');
      setGithubError(null);
    }
  }, [initialGithubUrl]);

  const sampleRepositories = [
    { label: 'Flask', url: 'https://github.com/pallets/flask', desc: 'Python 2/3' },
    { label: 'Express', url: 'https://github.com/expressjs/express', desc: 'Node.js ESM' },
    { label: 'NumPy 100', url: 'https://github.com/rougier/numpy-100', desc: 'Benchmark' },
  ];

  const validateUrl = (url: string): boolean => {
    setGithubError(null);
    const result = validateGithubUrl(url);
    if (!result.valid) {
      setGithubError(result.error || 'Enter a valid public GitHub HTTPS repository URL');
      return false;
    }
    return true;
  };

  const isUrlValid = Boolean(
    githubUrl.trim() && validateGithubUrl(githubUrl).valid
  );

  const handleZipFile = (file: File) => {
    setFileError(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setFileError('Only .zip archive files are supported.');
      return;
    }
    if (file.size === 0) {
      setFileError('The selected ZIP file is empty.');
      return;
    }
    if (file.size > MAX_ZIP_BYTES) {
      setFileError('ZIP file size exceeds the 200MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handlePasteUrl = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setGithubUrl(text.trim());
          validateUrl(text.trim());
        }
      }
    } catch {
      // Clipboard access denied or unsupported
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (!isAuthenticated) {
      navigateTo('/signin?redirect=/workspace');
      return;
    }
    if (mode === 'github') {
      const normalized = normalizeGithubUrl(githubUrl);
      if (!validateUrl(normalized)) return;
      onAnalyzeGithub(normalized);
    } else {
      if (!selectedFile) {
        setFileError('Please select a ZIP file to analyze.');
        return;
      }
      onAnalyzeZip(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-workspace text-left space-y-5">
      <PageHeader
        icon={Upload}
        title="Analyze a codebase"
        description="Upload a ZIP or connect a public GitHub repository. Analysis is read-only AST — Python (.py) and JavaScript (.js/.jsx)."
        badge={
          <Badge tone="indigo" size="sm">
            Workspace
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="neutral" size="sm">
              Max 200 MB
            </Badge>
            <Badge tone="indigo" size="sm">
              Python &bull; JS &bull; TS
            </Badge>
          </div>
        }
      />

      {/* Main Ingestion Card */}
      <Card variant="primary" padding="none" className="overflow-hidden">
        {/* Top Segmented Mode Selector */}
        <div className="grid grid-cols-2 border-b border-line bg-tile/50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('github');
              setFileError(null);
              setGithubError(null);
            }}
            disabled={disabled}
            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'github'
                ? 'bg-surface text-ink shadow-sm border border-line'
                : 'text-ink-3 hover:text-ink hover:bg-surface/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Github className={`w-4 h-4 ${mode === 'github' ? 'text-indigo' : 'text-ink-3'}`} strokeWidth={2} />
            <span>Public GitHub URL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('zip');
              setFileError(null);
              setGithubError(null);
            }}
            disabled={disabled}
            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'zip'
                ? 'bg-surface text-ink shadow-sm border border-line'
                : 'text-ink-3 hover:text-ink hover:bg-surface/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FolderArchive className={`w-4 h-4 ${mode === 'zip' ? 'text-indigo' : 'text-ink-3'}`} strokeWidth={2} />
            <span>ZIP Archive (.zip)</span>
          </button>
        </div>

        {/* Ingestion Body */}
        <div className="p-5 sm:p-6">
          {!isAuthenticated && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#EAE9FB]/70 border border-[#4C4FD6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#4C4FD6] shrink-0" />
                <p className="text-xs text-[#181715]">
                  <strong className="font-semibold">Sign in required for custom repos:</strong> GitHub and ZIP analysis require an authenticated session. Guests can explore all bundled demos below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('/signin?redirect=/workspace')}
                className="px-3.5 py-1.5 rounded-lg bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] text-xs font-semibold whitespace-nowrap shadow-xs transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
              >
                Sign in to analyze
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'github' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="repo-url-input"
                    className="font-sans font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5"
                  >
                    GitHub Repository Address
                  </label>
                  <span className="text-[11px] text-ink-3 font-mono">Public HTTPS</span>
                </div>

                {/* Input Container */}
                <div className="relative flex items-center bg-tile border border-line rounded-xl shadow-inner focus-within:ring-2 focus-within:ring-indigo focus-within:border-transparent transition-all">
                  <div className="pl-3.5 text-ink-3 shrink-0">
                    <Github className="w-4 h-4" />
                  </div>

                  <input
                    id="repo-url-input"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      if (githubError) validateUrl(e.target.value);
                    }}
                    placeholder="https://github.com/owner/repository"
                    disabled={disabled}
                    className="w-full h-12 px-3 bg-transparent text-xs sm:text-sm text-ink placeholder-ink-4 focus:outline-none font-mono"
                  />

                  {/* Actions inside input */}
                  <div className="pr-2.5 flex items-center gap-1.5 shrink-0">
                    {isUrlValid && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-surface text-teal-strong text-[11px] font-bold border border-teal/20 animate-fade-in">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}

                    {githubUrl ? (
                      <button
                        type="button"
                        onClick={() => setGithubUrl('')}
                        className="p-1 text-ink-4 hover:text-ink rounded cursor-pointer transition-colors"
                        title="Clear input"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePasteUrl}
                        className="px-2 py-1 text-[11px] font-semibold text-indigo hover:text-indigo-strong bg-indigo-surface rounded border border-indigo/20 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Paste URL from clipboard"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>Paste</span>
                      </button>
                    )}
                  </div>
                </div>

                {githubError && (
                  <p className="text-xs text-red-text font-medium px-1 flex items-center gap-1.5 animate-fade-in">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {githubError}
                  </p>
                )}

                {/* Popular Repository Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider">
                    Quick Fill:
                  </span>
                  {sampleRepositories.map((repo) => (
                    <button
                      key={repo.label}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setGithubUrl(repo.url);
                        validateUrl(repo.url);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-tile hover:bg-ink hover:text-white text-ink-2 text-xs font-semibold border border-line transition-all shadow-xs cursor-pointer group"
                    >
                      <span>{repo.label}</span>
                      <span className="text-[10px] text-ink-4 group-hover:text-ink-2 font-mono">
                        ({repo.desc})
                      </span>
                    </button>
                  ))}
                </div>

                {/* Submit Action Bar */}
                <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-ink-3 font-sans">
                    <Shield className="w-3.5 h-3.5 text-teal-strong" />
                    <span>Non-destructive static AST clone. Never executes code.</span>
                  </div>

                  {!isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => navigateTo('/signin?redirect=/workspace')}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Sign in to analyze codebase</span>
                    </button>
                  ) : (
                    <Button
                      type="submit"
                      variant="indigo"
                      size="md"
                      disabled={disabled || !githubUrl.trim()}
                      icon={
                        disabled ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                        )
                      }
                      className="w-full sm:w-auto font-bold shadow-sm"
                    >
                      {disabled ? 'Ingesting…' : 'Analyze Repository'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                    Codebase ZIP Archive
                  </span>
                  <span className="text-[11px] text-ink-3 font-mono">Max 200 MB</span>
                </div>

                {/* Drag and Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (disabled) return;
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleZipFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 sm:p-7 text-center transition-all ${
                    isDragging
                      ? 'border-indigo bg-indigo-surface/30 ring-2 ring-indigo/20'
                      : selectedFile
                      ? 'border-teal bg-teal-surface/20'
                      : 'border-line hover:border-line-strong hover:bg-tile/50 bg-tile/30'
                  }`}
                >
                  {selectedFile ? (
                    /* Selected File Card */
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 bg-surface rounded-xl border border-line shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
                          <FileCode className="w-5 h-5" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs sm:text-sm font-bold text-ink truncate max-w-[220px] sm:max-w-[280px]">
                              {selectedFile.name}
                            </p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-teal-surface text-teal-strong text-[10px] font-bold border border-teal/20">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-3 font-mono mt-0.5">
                            {formatBytes(selectedFile.size)} · ZIP Archive
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            className="text-xs pointer-events-none"
                          >
                            Change File
                          </Button>
                          <input
                            type="file"
                            accept=".zip"
                            disabled={disabled}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleZipFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          disabled={disabled}
                          className="p-1.5 text-ink-4 hover:text-ink rounded cursor-pointer transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty State Drag & Drop Area */
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-indigo shadow-xs">
                        <Upload className="w-6 h-6" strokeWidth={1.75} />
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm font-bold text-ink">
                          Drag &amp; drop your <code className="bg-surface px-1.5 py-0.5 rounded border border-line font-mono text-xs">.zip</code> archive here
                        </p>
                        <p className="text-[11px] text-ink-3 mt-0.5">
                          Supports Python, JavaScript, and TypeScript codebases up to 200MB
                        </p>
                      </div>

                      {/* Supported filetypes */}
                      <div className="flex items-center gap-1.5 my-1">
                        <span className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-bold font-mono text-ink-2">
                          .py
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-bold font-mono text-ink-2">
                          .js / .jsx
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-bold font-mono text-ink-2">
                          .ts / .tsx
                        </span>
                      </div>

                      <label className="cursor-pointer mt-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          className="pointer-events-none text-xs font-semibold shadow-xs"
                        >
                          Browse from Computer
                        </Button>
                        <input
                          type="file"
                          accept=".zip"
                          disabled={disabled}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleZipFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {fileError && (
                  <p className="text-xs text-red-text font-medium px-1 flex items-center gap-1.5 animate-fade-in">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {fileError}
                  </p>
                )}

                {/* Submit Action Bar for ZIP */}
                <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-ink-3 font-sans">
                    <Lock className="w-3.5 h-3.5 text-indigo" />
                    <span>Secure ZIP extraction with zip-slip protections.</span>
                  </div>

                  {!isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => navigateTo('/signin?redirect=/workspace')}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Sign in to analyze codebase</span>
                    </button>
                  ) : (
                    <Button
                      type="submit"
                      variant="indigo"
                      size="md"
                      disabled={disabled || !selectedFile}
                      icon={
                        disabled ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                        )
                      }
                      className="w-full sm:w-auto font-bold shadow-sm"
                    >
                      {disabled ? 'Uploading…' : 'Analyze Archive'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </Card>

      {/* Built-in Demo Benchmark Cards */}
      <div className="w-full pt-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber" />
            Try Built-in Demo Benchmarks
          </span>
          <span className="text-[11px] text-ink-3">
            Offline AST evaluation · 0 configuration
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Primary Demo Choice */}
          <div className="md:col-span-6 p-4 rounded-xl bg-surface border-2 border-indigo shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo" />
                  Python Legacy (Primary Demo)
                </span>
                <Badge tone="indigo" size="sm">
                  Recommended
                </Badge>
              </div>
              <p className="text-xs text-ink-3 leading-relaxed mb-4">
                Full AST modernization benchmark: characterization test synthesis, circular coupling detection, and Python 3.12 compatibility.
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onLoadDemo('python_legacy')}
              className="w-full py-2 px-3 rounded-lg bg-indigo hover:bg-indigo-hover text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
            >
              <span>Load Python Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Secondary Choices */}
          <div className="md:col-span-6 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onLoadDemo('js_commonjs')}
              className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-tile border border-line hover:border-indigo/40 transition-all text-left group disabled:opacity-50 shadow-xs"
            >
              <div>
                <span className="text-xs font-bold text-ink group-hover:text-indigo transition-colors block">
                  JS CommonJS
                </span>
                <span className="text-[11px] text-ink-3">
                  Node.js require() to ES Modules &amp; Vitest migration.
                </span>
              </div>
              <Badge tone="neutral" size="sm">
                Node.js
              </Badge>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onLoadDemo('legacy_retail')}
              className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-tile border border-line hover:border-indigo/40 transition-all text-left group disabled:opacity-50 shadow-xs"
            >
              <div>
                <span className="text-xs font-bold text-ink group-hover:text-indigo transition-colors block">
                  Full Retail Suite
                </span>
                <span className="text-[11px] text-ink-3">
                  Multi-tiered polyglot architecture with cross-language API contracts.
                </span>
              </div>
              <Badge tone="neutral" size="sm">
                Polyglot
              </Badge>
            </button>
          </div>
        </div>
      </div>

      {/* Safety & Trust Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        <Card variant="secondary" padding="sm" className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-teal-surface text-teal-strong flex items-center justify-center shrink-0 border border-teal/20">
            <Shield className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-xs text-ink uppercase tracking-wider">
              Read-only AST
            </h3>
            <p className="font-sans text-[11px] text-ink-3 mt-0.5 leading-[1.4]">
              Inspects AST syntax trees without executing arbitrary code.
            </p>
          </div>
        </Card>

        <Card variant="secondary" padding="sm" className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
            <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-xs text-ink uppercase tracking-wider">
              Zero Execution Risk
            </h3>
            <p className="font-sans text-[11px] text-ink-3 mt-0.5 leading-[1.4]">
              Characterization tests run safely in isolated disposable sandboxes.
            </p>
          </div>
        </Card>

        <Card variant="secondary" padding="sm" className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-amber-surface text-amber-strong flex items-center justify-center shrink-0 border border-amber/20">
            <FileOutput className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-xs text-ink uppercase tracking-wider">
              Exportable Reports
            </h3>
            <p className="font-sans text-[11px] text-ink-3 mt-0.5 leading-[1.4]">
              Download Markdown architecture overviews and Mermaid diagrams.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InputSection;
