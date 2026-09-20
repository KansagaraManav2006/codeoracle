import React, { useState } from 'react';
import { Github, FolderArchive, ArrowRight, Upload, Sparkles, Shield, Lock, FileOutput } from 'lucide-react';
import { IngestionMode } from '../types';
import Button from './common/Button';
import { FilterChip } from './common/Chips';

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
      setFileError('ZIP file size exceeds 200MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="w-full max-w-landing mx-auto py-8 sm:py-12 flex flex-col items-center text-center">
      {/* H1 Title per DESIGN.md §8.7 */}
      <h1 className="font-display font-extrabold text-[32px] sm:text-[44px] leading-[1.1] tracking-[-0.02em] text-ink max-w-[580px]">
        Understand legacy code before you change it.
      </h1>

      {/* Lede per DESIGN.md §8.7 */}
      <p className="mt-4 text-base sm:text-[17px] leading-[1.5] text-ink-3 max-w-[500px] font-sans">
        Deterministic dependency maps, explainable modernization readiness scores, and safe before-and-after proposals.
      </p>

      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-track rounded-pill border border-line mt-8 mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('github');
            setFileError(null);
            setGithubError(null);
          }}
          className={`inline-flex items-center gap-2 h-8 px-4 rounded-pill text-xs font-semibold select-none transition-all ${
            mode === 'github'
              ? 'bg-surface text-ink shadow-1 border border-line'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <Github className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>GitHub Repository</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('zip');
            setFileError(null);
            setGithubError(null);
          }}
          className={`inline-flex items-center gap-2 h-8 px-4 rounded-pill text-xs font-semibold select-none transition-all ${
            mode === 'zip'
              ? 'bg-surface text-ink shadow-1 border border-line'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>ZIP Archive</span>
        </button>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {mode === 'github' ? (
          <div>
            <div className="relative flex items-center bg-surface border border-line rounded-pill shadow-1 p-1.5 focus-within:ring-2 focus-within:ring-indigo focus-within:border-transparent transition-all">
              <label htmlFor="repo-url-input" className="sr-only">
                GitHub repository URL
              </label>
              <Github className="w-5 h-5 text-ink-3 ml-3 shrink-0" strokeWidth={1.75} />
              <input
                id="repo-url-input"
                type="url"
                value={githubUrl}
                onChange={(e) => {
                  setGithubUrl(e.target.value);
                  if (githubError) validateUrl(e.target.value);
                }}
                placeholder="https://github.com/owner/repo"
                disabled={disabled}
                className="w-full h-11 px-3 bg-transparent text-[14px] text-ink placeholder-ink-4 focus:outline-none font-sans"
              />
              <Button
                type="submit"
                variant="indigo"
                size="md"
                disabled={disabled || !githubUrl.trim()}
                icon={<ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
                className="shrink-0"
              >
                Analyze
              </Button>
            </div>

            {githubError && (
              <p className="mt-2 text-xs text-red-text font-medium text-left px-4">
                {githubError}
              </p>
            )}
          </div>
        ) : (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleZipFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all bg-surface/50 ${
                isDragging
                  ? 'border-indigo bg-indigo-surface/40'
                  : selectedFile
                  ? 'border-teal bg-teal-surface/20'
                  : 'border-line hover:border-line-strong hover:bg-tile'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-track flex items-center justify-center text-ink-3">
                  <Upload className="w-6 h-6" strokeWidth={1.75} />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="font-mono text-xs font-bold text-indigo-text">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-ink-3 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB selected
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Drag &amp; drop your <code className="bg-tile px-1.5 py-0.5 rounded font-mono text-xs">.zip</code> archive here
                    </p>
                    <p className="text-xs text-ink-3 mt-1">
                      Supports Python, JavaScript, and TypeScript codebases
                    </p>
                  </div>
                )}

                <label className="cursor-pointer mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="pointer-events-none"
                  >
                    {selectedFile ? 'Change File' : 'Browse Files'}
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
            </div>

            {selectedFile && (
              <div className="mt-4">
                <Button
                  type="submit"
                  variant="indigo"
                  size="md"
                  disabled={disabled}
                  icon={<ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
                  className="w-full sm:w-auto"
                >
                  Analyze Archive
                </Button>
              </div>
            )}

            {fileError && (
              <p className="mt-2 text-xs text-red-text font-medium text-left px-4">
                {fileError}
              </p>
            )}
          </div>
        )}
      </form>

      {/* Sample demo benchmark chips per DESIGN.md §8.7 */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span className="text-[11px] font-sans font-semibold text-ink-3 uppercase tracking-wider">
          Demo Benchmarks:
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <FilterChip
            label="Python Legacy"
            active={false}
            onClick={() => onLoadDemo('python_legacy')}
            disabled={disabled}
            icon={<Sparkles className="w-3 h-3 text-amber" strokeWidth={1.75} />}
          />
          <FilterChip
            label="JavaScript CommonJS"
            active={false}
            onClick={() => onLoadDemo('js_commonjs')}
            disabled={disabled}
            icon={<Sparkles className="w-3 h-3 text-amber" strokeWidth={1.75} />}
          />
          <FilterChip
            label="Full Retail Suite"
            active={false}
            onClick={() => onLoadDemo('legacy_retail')}
            disabled={disabled}
            icon={<Sparkles className="w-3 h-3 text-amber" strokeWidth={1.75} />}
          />
        </div>
      </div>

      {/* Three factual product statements per DESIGN.md §8.7 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 pt-8 border-t border-line/80 w-full text-left">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-teal-surface text-teal-strong flex items-center justify-center shrink-0 border border-teal/20">
            <Shield className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-xs text-ink uppercase tracking-wider">
              Read-only analysis
            </h3>
            <p className="font-sans text-xs text-ink-3 mt-1 leading-[1.4]">
              Static analysis inspects AST structure and syntax without executing arbitrary code.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
            <Lock className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-xs text-ink uppercase tracking-wider">
              Your code is never executed
            </h3>
            <p className="font-sans text-xs text-ink-3 mt-1 leading-[1.4]">
              Tests are safely characterized and verified in an isolated disposable sandbox.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-amber-surface text-amber-strong flex items-center justify-center shrink-0 border border-amber-line/40">
            <FileOutput className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-xs text-ink uppercase tracking-wider">
              Reports you can export
            </h3>
            <p className="font-sans text-xs text-ink-3 mt-1 leading-[1.4]">
              Download Markdown architecture overviews, Mermaid graph diagrams, and ZIP test suites.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputSection;
