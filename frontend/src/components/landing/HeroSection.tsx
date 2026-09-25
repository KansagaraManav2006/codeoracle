import React, { useState } from 'react';
import {
  Github,
  FolderArchive,
  ArrowRight,
  Upload,
  Sparkles,
  ShieldCheck,
  Loader2,
  FileCode2,
  Lock,
} from 'lucide-react';
import { validateGithubUrl } from '../../utils/github';
import { Architecture3DScene } from './Architecture3DScene';
import { useAuth } from '../../context/AuthContext';
import { navigateTo } from '../../utils/navigation';

interface HeroSectionProps {
  onAnalyzeGithub: (url: string) => void;
  onAnalyzeZip: (file: File) => void;
  onLoadDemo: (benchmarkName?: string) => void;
  isLoading?: boolean;
}

const ANALYSIS_STAGES = [
  'Fetching repository metadata…',
  'Parsing AST trees across source files…',
  'Resolving module dependency graph…',
  'Scoring cyclomatic complexity & risk hotspots…',
  'Generating behavioral protection test suites…',
  'Assembling prioritized modernization waves…',
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onAnalyzeGithub,
  onAnalyzeZip,
  onLoadDemo,
  isLoading = false,
}) => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'github' | 'zip'>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedZip, setSelectedZip] = useState<File | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  React.useEffect(() => {
    if (!isSubmitting && !isLoading) return;
    const interval = setInterval(() => {
      setCurrentStageIndex((prev) => (prev + 1) % ANALYSIS_STAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isSubmitting, isLoading]);

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigateTo('/signin?redirect=/workspace');
      return;
    }
    setUrlError(null);
    const trimmed = githubUrl.trim();
    if (!trimmed) {
      setUrlError('Please enter a public GitHub repository URL');
      return;
    }
    const validation = validateGithubUrl(trimmed);
    if (!validation.valid) {
      setUrlError(validation.error || 'Enter a valid public GitHub URL');
      return;
    }
    setIsSubmitting(true);
    onAnalyzeGithub(trimmed);
  };

  const handleZipDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZipError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setZipError('Only .zip archives are supported.');
        return;
      }
      setSelectedZip(file);
    }
  };

  const handleZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZipError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setZipError('Only .zip archives are supported.');
        return;
      }
      setSelectedZip(file);
    }
  };

  const handleZipSubmit = () => {
    if (!isAuthenticated) {
      navigateTo('/signin?redirect=/workspace');
      return;
    }
    if (!selectedZip) {
      setZipError('Please select a ZIP file first');
      return;
    }
    setIsSubmitting(true);
    onAnalyzeZip(selectedZip);
  };

  const scrollToComposer = () => {
    const el = document.getElementById('repository-composer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.querySelector<HTMLInputElement>('input[type="url"]');
      if (input) setTimeout(() => input.focus(), 300);
    }
  };

  const sampleRepos = [
    { name: 'pallets/flask', url: 'https://github.com/pallets/flask', desc: 'Python WSGI web framework' },
    { name: 'expressjs/express', url: 'https://github.com/expressjs/express', desc: 'Node.js web application framework' },
  ];

  return (
    <section
      id="hero-section"
      className="relative min-h-[90vh] w-full flex flex-col justify-center items-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-[#F5F1E9] text-[#181715]"
    >
      <div className="max-w-[1240px] w-full mx-auto">
        {/* Two-column desktop composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDFC] border border-[#C8BEB0] text-xs font-mono text-[#3B3733] shadow-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-[#4C4FD6] animate-pulse" />
              <span>Static AST & Architecture Intelligence</span>
            </div>

            {/* Exact Required Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#181715] leading-[1.12] mb-6">
              Understand your code.{' '}
              <span className="block text-[#4C4FD6]">See the connections.</span>
              <span className="block">Plan what comes next.</span>
            </h1>

            {/* Concise Supporting Copy */}
            <p className="text-base sm:text-lg text-[#3B3733] leading-relaxed max-w-[580px] mb-8 font-normal">
              CodeOracle parses Python and TypeScript repositories to map module dependencies,
              detect circular couplings, synthesize regression test suites, and generate
              reviewable, phased modernization plans without hallucinating changes.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <button
                onClick={scrollToComposer}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] font-semibold text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4C4FD6] focus:ring-offset-2"
              >
                <span>Analyze your codebase</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onLoadDemo()}
                disabled={isLoading || isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FFFDFC] hover:bg-[#ECE5DA] text-[#181715] font-semibold text-sm border border-[#C8BEB0] transition-all shadow-sm hover:shadow active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4C4FD6] disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4 text-[#B88228]" />
                <span>Try the demo</span>
              </button>
            </div>

            {/* Key trust bullets */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#5C554D] font-mono">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4C4FD6]" />
                Deterministic AST parsing
              </span>
              <span className="flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-[#4C4FD6]" />
                Local & zero data retention
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Architecture Topology Card */}
          <div className="lg:col-span-5 w-full flex flex-col items-center">
            <div className="w-full bg-[#FFFDFC] rounded-3xl p-4 sm:p-6 border border-[#C8BEB0] shadow-sm relative">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#ECE5DA]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9383A]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B88228]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3EA862]/70" />
                  <span className="ml-2 text-xs font-mono text-[#5C554D]">repository.topology</span>
                </div>
                <span className="text-[11px] font-mono text-[#4C4FD6] bg-[#EAE9FB] px-2 py-0.5 rounded-md font-semibold">
                  Interactive Specimen (Example)
                </span>
              </div>

              {/* Topology Viewport */}
              <Architecture3DScene />
            </div>
          </div>
        </div>

        {/* Repository Composer Section */}
        <div id="repository-composer" className="mt-16 pt-8 scroll-mt-28">
          <div className="bg-[#FFFDFC] rounded-3xl border border-[#C8BEB0] shadow-md p-6 sm:p-8 max-w-[840px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#ECE5DA]">
              <div>
                <h2 className="text-xl font-display font-bold text-[#181715]">
                  Analyze a repository
                </h2>
                <p className="text-xs text-[#5C554D] mt-0.5">
                  Provide a public GitHub link or upload a local archive to start AST analysis.
                </p>
              </div>

              {/* Source Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-[#ECE5DA] border border-[#C8BEB0]/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setActiveTab('github'); setUrlError(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'github'
                      ? 'bg-[#FFFDFC] text-[#181715] shadow-xs'
                      : 'text-[#5C554D] hover:text-[#181715]'
                  }`}
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('zip'); setZipError(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'zip'
                      ? 'bg-[#FFFDFC] text-[#181715] shadow-xs'
                      : 'text-[#5C554D] hover:text-[#181715]'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>ZIP Archive</span>
                </button>
              </div>
            </div>

            {/* Input Form based on Active Tab */}
            <div className="pt-6">
              {activeTab === 'github' ? (
                <form onSubmit={handleGithubSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5C554D]">
                        <Github className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => {
                          setGithubUrl(e.target.value);
                          if (urlError) setUrlError(null);
                        }}
                        disabled={isLoading || isSubmitting}
                        placeholder="https://github.com/pallets/flask"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFDFC] border text-sm text-[#181715] placeholder:text-[#A39888] focus:outline-none focus:ring-2 focus:ring-[#4C4FD6] transition-all ${
                          urlError ? 'border-[#D9383A]' : 'border-[#C8BEB0] hover:border-[#A39888]'
                        }`}
                      />
                    </div>
                    {!isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => navigateTo('/signin?redirect=/workspace')}
                        className="px-5 py-2.5 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Sign in to analyze</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isLoading || isSubmitting}
                        className="px-5 py-2.5 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-60 shrink-0 cursor-pointer"
                      >
                        {isLoading || isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <span>Run Analysis</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {urlError && (
                    <p className="text-xs text-[#D9383A] font-medium">{urlError}</p>
                  )}

                  {/* Sample suggestions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-xs text-[#5C554D] font-mono">Quick test:</span>
                    {sampleRepos.map((repo) => (
                      <button
                        key={repo.name}
                        type="button"
                        onClick={() => {
                          setGithubUrl(repo.url);
                          setUrlError(null);
                        }}
                        className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#ECE5DA] hover:bg-[#E7DFD3] text-[#3B3733] border border-[#C8BEB0]/60 transition-colors"
                      >
                        {repo.name}
                      </button>
                    ))}
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleZipDrop}
                    className="border-2 border-dashed border-[#C8BEB0] hover:border-[#4C4FD6] rounded-2xl p-6 sm:p-8 text-center bg-[#F5F1E9]/40 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('zip-upload-input')?.click()}
                  >
                    <input
                      id="zip-upload-input"
                      type="file"
                      accept=".zip"
                      onChange={handleZipFileChange}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-[#4C4FD6] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#181715]">
                      {selectedZip ? selectedZip.name : 'Drop a .zip codebase archive here'}
                    </p>
                    <p className="text-xs text-[#5C554D] mt-1">
                      {selectedZip
                        ? `${(selectedZip.size / (1024 * 1024)).toFixed(2)} MB selected`
                        : 'Supports standard Python or TypeScript project archives'}
                    </p>
                  </div>

                  {zipError && (
                    <p className="text-xs text-[#D9383A] font-medium">{zipError}</p>
                  )}

                  {selectedZip && (
                    <div className="flex justify-end">
                      {!isAuthenticated ? (
                        <button
                          type="button"
                          onClick={() => navigateTo('/signin?redirect=/workspace')}
                          className="px-5 py-2.5 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] font-semibold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Sign in to analyze archive</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleZipSubmit}
                          disabled={isLoading || isSubmitting}
                          className="px-5 py-2.5 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] font-semibold text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {isLoading || isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processing ZIP...</span>
                            </>
                          ) : (
                            <>
                              <span>Analyze {selectedZip.name}</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Analysis progress feedback */}
            {(isLoading || isSubmitting) && (
              <div className="mt-6 pt-4 border-t border-[#ECE5DA] flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-[#4C4FD6] animate-spin shrink-0" />
                <span className="text-xs font-mono text-[#4C4FD6]">
                  {ANALYSIS_STAGES[currentStageIndex]}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
