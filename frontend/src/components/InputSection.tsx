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
import { formatBytes } from '../utils/formatters';

const MAX_ZIP_BYTES = 200 * 1024 * 1024;

interface InputSectionProps {
  onAnalyzeZip: (file: File) => void;
  onAnalyzeGithub: (url: string) => void;
  onLoadDemo: (benchmarkName?: string) => void;
  disabled?: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onAnalyzeZip,
  onAnalyzeGithub,
  onLoadDemo,
  disabled = false,
}) => {
  const [mode, setMode] = useState<IngestionMode>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubError, setGithubError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sampleRepositories = [
    { label: 'Flask', url: 'https://github.com/pallets/flask', desc: 'Python 2/3' },
    { label: 'Express', url: 'https://github.com/expressjs/express', desc: 'Node.js ESM' },
    { label: 'NumPy 100', url: 'https://github.com/rougier/numpy-100', desc: 'Benchmark' },
  ];

  const validateUrl = (url: string): boolean => {
    setGithubError(null);
    if (!url.trim()) {
      setGithubError('GitHub URL is required.');
      return false;
    }
    const regex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/;
    if (!regex.test(url.trim())) {
      setGithubError('Enter a valid public GitHub HTTPS repository URL (e.g. https://github.com/owner/repo)');
      return false;
    }
    return true;
  };

  const isUrlValid = Boolean(
    githubUrl.trim() &&
    /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/.test(githubUrl.trim())
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
    if (mode === 'github') {
      if (!validateUrl(githubUrl)) return;
      onAnalyzeGithub(githubUrl.trim());
    } else {
      if (!selectedFile) {
        setFileError('Please select a ZIP file to analyze.');
        return;
      }
      onAnalyzeZip(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-3 sm:py-6 flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-indigo-surface border border-indigo/20 text-indigo text-xs font-bold uppercase tracking-wider mb-3.5 shadow-xs">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Codebase Modernization Engine</span>
      </div>

      {/* Hero Title */}
      <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-ink tracking-tight leading-tight max-w-[620px]">
        Understand legacy code before you change it.
      </h1>

      {/* Hero Subtitle */}
      <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-ink-3 max-w-[540px] font-sans">
        Deterministic dependency maps, explainable modernization readiness scores, and safe before-and-after proposals.
      </p>

      {/* Main Elevated Ingestion Card */}
      <div className="w-full max-w-2xl mx-auto mt-6 bg-surface border border-line rounded-2xl shadow-xl overflow-hidden transition-all text-left">
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
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Built-in Demo Benchmark Cards */}
      <div className="w-full max-w-2xl mx-auto mt-6 pt-5 border-t border-line/70 text-left">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber" />
            Try Built-in Demo Benchmarks
          </span>
          <span className="text-[11px] text-ink-3">
            Offline AST evaluation · 0 configuration
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onLoadDemo('python_legacy')}
            className="flex flex-col items-start p-3.5 rounded-xl bg-surface hover:bg-tile border border-line hover:border-line-strong transition-all shadow-xs text-left group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-ink group-hover:text-indigo transition-colors">
                Python Legacy
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-track text-ink-2 font-bold border border-line">
                Py 2/3
              </span>
            </div>
            <p className="text-[11px] text-ink-3 mt-1.5 leading-snug">
              Modernizes old Python 2 constructs to Python 3.12 with characterization tests.
            </p>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onLoadDemo('js_commonjs')}
            className="flex flex-col items-start p-3.5 rounded-xl bg-surface hover:bg-tile border border-line hover:border-line-strong transition-all shadow-xs text-left group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-ink group-hover:text-indigo transition-colors">
                JS CommonJS
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-track text-ink-2 font-bold border border-line">
                Node.js
              </span>
            </div>
            <p className="text-[11px] text-ink-3 mt-1.5 leading-snug">
              CommonJS require/export migration to modern ES Modules and Vitest.
            </p>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onLoadDemo('legacy_retail')}
            className="flex flex-col items-start p-3.5 rounded-xl bg-surface hover:bg-tile border border-line hover:border-line-strong transition-all shadow-xs text-left group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-ink group-hover:text-indigo transition-colors">
                Full Retail Suite
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-track text-ink-2 font-bold border border-line">
                Polyglot
              </span>
            </div>
            <p className="text-[11px] text-ink-3 mt-1.5 leading-snug">
              Multi-tiered architecture with cross-language API contracts and test suite.
            </p>
          </button>
        </div>
      </div>

      {/* Safety & Trust Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-5 border-t border-line/80 w-full max-w-2xl text-left">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface/50 border border-line/60">
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
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface/50 border border-line/60">
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
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface/50 border border-line/60">
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
        </div>
      </div>
    </div>
  );
};

export default InputSection;
