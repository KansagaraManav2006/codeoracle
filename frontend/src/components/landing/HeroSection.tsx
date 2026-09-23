import React, { useState, useEffect } from 'react';
import {
  Github,
  FolderArchive,
  ArrowRight,
  Upload,
  Sparkles,
  ShieldCheck,
  Loader2,
  Clipboard,
  AlertCircle,
  FileCode2,
} from 'lucide-react';
import { validateGithubUrl } from '../../utils/github';

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
  const [activeTab, setActiveTab] = useState<'github' | 'zip'>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedZip, setSelectedZip] = useState<File | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Sample repositories
  const sampleRepos = [
    { name: 'Flask', url: 'https://github.com/pallets/flask', desc: 'Python 2/3 core' },
    { name: 'Express', url: 'https://github.com/expressjs/express', desc: 'Node.js web framework' },
    { name: 'NumPy 100', url: 'https://github.com/rougier/numpy-100', desc: 'Verified benchmark' },
    {
      name: 'E-Commerce Platform',
      url: 'https://github.com/DeepMakwana-18/End-to-End-E-commerce-Demand-Forecasting-Inventory-Optimization-Platform..git',
      desc: '145 files • 29k LOC',
    },
  ];

  // Gentle mount rise + scroll parallax
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stage animation when submitting
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSubmitting || isLoading) {
      interval = setInterval(() => {
        setCurrentStageIndex((prev) => (prev < ANALYSIS_STAGES.length - 1 ? prev + 1 : prev));
      }, 700);
    } else {
      setCurrentStageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isSubmitting, isLoading]);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setGithubUrl(text.trim());
          setUrlError(null);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <section className="relative isolate pt-32 pb-24 md:pt-40 md:pb-32 px-4 sm:px-6 overflow-hidden">
      {/* ========================================================================= */}
      {/* HERO BACKGROUND SYSTEM: Soft Glowing Vertical Columns (Inspired by Reference) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        {/* Core Radiant Atmosphere Bloom (Directly behind the pillar crest) */}
        <div
          className="absolute top-24 sm:top-20 w-[640px] sm:w-[820px] md:w-[940px] h-[480px] sm:h-[540px] rounded-full pointer-events-none transition-transform duration-700 ease-out"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(0, 122, 255, 0.45) 0%, rgba(88, 86, 214, 0.32) 42%, rgba(255, 149, 0, 0.16) 65%, transparent 80%)',
            filter: 'blur(70px)',
            transform: `translate3d(0, ${scrollY * 0.08}px, 0)`,
          }}
        />

        {/* Vertical Translucent Glass Pillars / Columns Stage */}
        <div className="absolute top-16 w-full max-w-[1040px] h-[640px] pointer-events-none">
          {/* Pillar 1: Outer Left (Cyan Glass) */}
          <div
            className="absolute backdrop-blur-[6px] border border-white/50 transition-transform duration-500 ease-out"
            style={{
              width: '110px',
              height: '370px',
              top: '190px',
              left: 'calc(50% - 410px)',
              background: 'linear-gradient(180deg, rgba(50, 173, 230, 0.65) 0%, rgba(0, 122, 255, 0.25) 55%, transparent 100%)',
              borderRadius: '42px 42px 24px 24px',
              boxShadow: '0 10px 40px rgba(50, 173, 230, 0.28), inset 0 2px 4px rgba(255, 255, 255, 0.7)',
              transform: `translate3d(0, ${scrollY * 0.09}px, 0)`,
            }}
          />

          {/* Pillar 2: Mid Left (Soft Purple / Lavender) */}
          <div
            className="absolute backdrop-blur-[6px] border border-white/60 transition-transform duration-500 ease-out"
            style={{
              width: '135px',
              height: '460px',
              top: '130px',
              left: 'calc(50% - 315px)',
              background: 'linear-gradient(180deg, rgba(175, 82, 222, 0.72) 0%, rgba(88, 86, 214, 0.40) 50%, transparent 100%)',
              borderRadius: '48px 48px 28px 28px',
              boxShadow: '0 15px 50px rgba(175, 82, 222, 0.32), inset 0 2px 4px rgba(255, 255, 255, 0.8)',
              transform: `translate3d(0, ${scrollY * 0.14}px, 0)`,
            }}
          />

          {/* Pillar 3: Inner Left (Apple Blue Core) */}
          <div
            className="absolute backdrop-blur-[6px] border border-white/75 transition-transform duration-500 ease-out"
            style={{
              width: '155px',
              height: '540px',
              top: '70px',
              left: 'calc(50% - 195px)',
              background: 'linear-gradient(180deg, rgba(0, 122, 255, 0.82) 0%, rgba(0, 122, 255, 0.45) 45%, rgba(88, 86, 214, 0.20) 80%, transparent 100%)',
              borderRadius: '56px 56px 32px 32px',
              boxShadow: '0 20px 60px rgba(0, 122, 255, 0.42), inset 0 2px 5px rgba(255, 255, 255, 0.9)',
              transform: `translate3d(0, ${scrollY * 0.20}px, 0)`,
            }}
          />

          {/* Pillar 4: Center Cathedral Column (Tallest & Most Luminous) */}
          <div
            className="absolute backdrop-blur-[6px] border border-white/85 transition-transform duration-500 ease-out"
            style={{
              width: '180px',
              height: '620px',
              top: '15px',
              left: 'calc(50% - 90px)',
              background: 'linear-gradient(180deg, rgba(0, 122, 255, 0.90) 0%, rgba(56, 139, 253, 0.65) 45%, rgba(88, 86, 214, 0.30) 75%, transparent 100%)',
              borderRadius: '64px 64px 36px 36px',
              boxShadow: '0 25px 70px rgba(0, 122, 255, 0.55), inset 0 3px 6px rgba(255, 255, 255, 1)',
              transform: `translate3d(0, ${scrollY * 0.26}px, 0)`,
            }}
          >
            {/* Center specular gleam */}
            <div className="absolute inset-0 rounded-t-[64px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          </div>

          {/* Pillar 5: Inner Right (Apple Blue with Warm Amber Accent) */}
          <div
            className="absolute backdrop-blur-[6px] border border-white/70 transition-transform duration-500 ease-out"
            style={{
              width: '155px',
              height: '530px',
              top: '75px',
              left: 'calc(50% + 40px)',
              background: 'linear-gradient(180deg, rgba(0, 122, 255, 0.78) 0%, rgba(255, 149, 0, 0.45) 48%, rgba(255, 149, 0, 0.15) 80%, transparent 100%)',
              borderRadius: '56px 56px 32px 32px',
              boxShadow: '0 20px 60px rgba(255, 149, 0, 0.35), inset 0 2px 5px rgba(255, 255, 255, 0.85)',
              transform: `translate3d(0, ${scrollY * 0.19}px, 0)`,
            }}
          />

          {/* Pillar 6: Mid Right (Cyan / Lavender Glass) */}
          <div
            className="absolute backdrop-blur-[6px] border border-white/60 transition-transform duration-500 ease-out"
            style={{
              width: '135px',
              height: '450px',
              top: '135px',
              left: 'calc(50% + 180px)',
              background: 'linear-gradient(180deg, rgba(0, 199, 190, 0.70) 0%, rgba(88, 86, 214, 0.35) 50%, transparent 100%)',
              borderRadius: '48px 48px 28px 28px',
              boxShadow: '0 15px 50px rgba(0, 199, 190, 0.30), inset 0 2px 4px rgba(255, 255, 255, 0.8)',
              transform: `translate3d(0, ${scrollY * 0.13}px, 0)`,
            }}
          />

          {/* Pillar 7: Outer Right (Frosted Neutral Glass) */}
          <div
            className="absolute backdrop-blur-[6px] border border-white/55 transition-transform duration-500 ease-out"
            style={{
              width: '110px',
              height: '360px',
              top: '195px',
              left: 'calc(50% + 300px)',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.90) 0%, rgba(0, 122, 255, 0.32) 55%, transparent 100%)',
              borderRadius: '42px 42px 24px 24px',
              boxShadow: '0 10px 40px rgba(255, 255, 255, 0.40), inset 0 2px 4px rgba(255, 255, 255, 0.85)',
              transform: `translate3d(0, ${scrollY * 0.08}px, 0)`,
            }}
          />
        </div>

        {/* Soft bottom diffusion gradient smoothly fading pillars into the canvas */}
        <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/85 to-transparent pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* HERO FOREGROUND CONTENT: Clean, Apple-Modern, Uncluttered */}
      {/* ========================================================================= */}
      <div className="max-w-[1020px] mx-auto text-center flex flex-col items-center relative z-10">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E5E5EA] shadow-apple text-xs font-semibold text-[#1D1D1F] tracking-tight mb-8 transition-all duration-700 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translate3d(0, 16px, 0)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-ping" />
          <span className="font-geist">Codebase Intelligence Engine</span>
        </div>

        {/* Main Headline (Geist Sans 3-line cadence) */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-tight text-[#1D1D1F] leading-[1.04] max-w-[920px] mb-6 font-geist transition-all duration-700 delay-100 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translate3d(0, 20px, 0)',
          }}
        >
          Map your codebase.<br />
          <span className="text-[#6E6E73]">Understand the risk.</span><br />
          <span className="text-[#007AFF]">Modernize with confidence.</span>
        </h1>

        {/* Short, elegant supporting copy */}
        <p
          className="text-base sm:text-lg md:text-xl text-[#424245] max-w-[680px] leading-relaxed mb-8 font-normal font-sans transition-all duration-700 delay-150 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translate3d(0, 16px, 0)',
          }}
        >
          Analyze architecture, dependencies, risk hotspots, and test guardrails before touching production code.
        </p>

        {/* Primary & Secondary Clean CTA Pair (Inspired by Reference) */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14 transition-all duration-700 delay-200 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translate3d(0, 16px, 0)',
          }}
        >
          <button
            type="button"
            onClick={scrollToComposer}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] shadow-[0_8px_20px_rgba(0,122,255,0.25)] transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Analyze Repository</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSubmitting(true);
              onLoadDemo();
            }}
            disabled={isSubmitting || isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-[#1D1D1F] bg-white/85 hover:bg-white border border-[#E5E5EA] shadow-apple backdrop-blur-md transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-[#007AFF]" />
            <span>Try Benchmark Demo</span>
          </button>
        </div>

        {/* Hero Repository Composer */}
        <div
          id="repository-composer"
          className="w-full max-w-[880px] bg-white/90 backdrop-blur-xl rounded-[32px] sm:rounded-[36px] border border-white/80 shadow-apple-lg p-3 sm:p-5 transition-all duration-700 delay-250 ease-out relative text-left"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translate3d(0, 24px, 0)',
          }}
        >
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3 mb-4 px-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('github');
                  setUrlError(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeTab === 'github'
                    ? 'bg-[#1D1D1F] text-white shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
                  }`}
              >
                <Github className="w-3.5 h-3.5" />
                <span>Public GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('zip');
                  setZipError(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeTab === 'zip'
                    ? 'bg-[#1D1D1F] text-white shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
                  }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>ZIP Upload</span>
              </button>
            </div>

            {/* Built-in Demo Trigger */}
            <button
              type="button"
              onClick={() => {
                setIsSubmitting(true);
                onLoadDemo();
              }}
              disabled={isSubmitting || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#007AFF] bg-[#EAF4FF] hover:bg-[#D5E9FF] transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>Full Benchmark Demo</span>
            </button>
          </div>

          {/* Form Content */}
          {activeTab === 'github' ? (
            <form onSubmit={handleGithubSubmit} className="space-y-4">
              <div className="relative flex flex-col sm:flex-row items-center gap-2 bg-[#F5F5F7] rounded-2xl p-2 border border-[#E5E5EA] focus-within:border-[#007AFF] focus-within:ring-2 focus-within:ring-[#007AFF]/20 transition-all">
                <div className="flex items-center gap-2 w-full px-3 py-1">
                  <Github className="w-5 h-5 text-[#86868B] shrink-0" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      setUrlError(null);
                    }}
                    placeholder="https://github.com/owner/repository"
                    disabled={isSubmitting || isLoading}
                    className="w-full bg-transparent text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none font-mono"
                  />
                  {githubUrl && (
                    <button
                      type="button"
                      onClick={() => setGithubUrl('')}
                      className="text-xs text-[#86868B] hover:text-[#1D1D1F] px-1"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePaste}
                    title="Paste from clipboard"
                    className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-white transition-colors"
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isLoading || !githubUrl.trim()}
                  className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-40 shadow-sm transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing…</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {urlError && (
                <div className="flex items-center gap-2 text-xs text-[#D7261C] px-3 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}

              {/* Sample Repository Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 px-1">
                <span className="text-xs text-[#86868B] font-medium mr-1 font-geist-mono">Quick Benchmarks:</span>
                {sampleRepos.map((repo) => (
                  <button
                    key={repo.name}
                    type="button"
                    onClick={() => {
                      setGithubUrl(repo.url);
                      setUrlError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-[#424245] bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition-all"
                  >
                    <span className="font-semibold">{repo.name}</span>
                    <span className="text-[#86868B] text-[10px] font-mono">({repo.desc})</span>
                  </button>
                ))}
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleZipDrop}
                className="border-2 border-dashed border-[#D2D2D7] hover:border-[#007AFF] bg-[#F5F5F7] rounded-2xl p-6 sm:p-8 text-center transition-colors cursor-pointer"
                onClick={() => document.getElementById('zip-file-input')?.click()}
              >
                <input
                  id="zip-file-input"
                  type="file"
                  accept=".zip"
                  onChange={handleZipFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-[#E5E5EA] flex items-center justify-center mx-auto mb-3 text-[#007AFF]">
                  <Upload className="w-6 h-6" />
                </div>
                {selectedZip ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#1D1D1F] flex items-center justify-center gap-2 font-geist">
                      <FileCode2 className="w-4 h-4 text-[#34C759]" />
                      <span>{selectedZip.name}</span>
                    </p>
                    <p className="text-xs text-[#86868B] font-mono">
                      {(selectedZip.size / (1024 * 1024)).toFixed(2)} MB archive ready for static inspection
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#1D1D1F]">
                      Drag and drop repository .zip here, or click to browse
                    </p>
                    <p className="text-xs text-[#86868B]">Up to 200 MB archive, 10,000 files</p>
                  </div>
                )}
              </div>

              {zipError && (
                <div className="flex items-center gap-2 text-xs text-[#D7261C] px-3 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{zipError}</span>
                </div>
              )}

              {selectedZip && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleZipSubmit}
                    disabled={isSubmitting || isLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] shadow-sm transition-all"
                  >
                    {isSubmitting || isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Extracting &amp; Analyzing…</span>
                      </>
                    ) : (
                      <>
                        <span>Analyze ZIP Archive</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analysis Stages Animated Overlay when Active */}
          {(isSubmitting || isLoading) && (
            <div className="mt-4 pt-4 border-t border-[#E5E5EA] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1D1D1F] flex items-center gap-2 font-geist">
                  <Loader2 className="w-3.5 h-3.5 text-[#007AFF] animate-spin" />
                  {ANALYSIS_STAGES[currentStageIndex]}
                </span>
                <span className="text-[#86868B] font-mono font-geist-mono">
                  Stage {currentStageIndex + 1} of {ANALYSIS_STAGES.length}
                </span>
              </div>
              <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#007AFF] h-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStageIndex + 1) / ANALYSIS_STAGES.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Composer Security Footnote */}
          <div className="mt-4 pt-3 border-t border-[#E5E5EA] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#86868B]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" />
              <span>Read-only static analysis — uploaded repository code is never executed.</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-geist-mono">
              <span>Python 3.10+</span>
              <span>•</span>
              <span>JS / TS ESM</span>
              <span>•</span>
              <span>AST-grounded</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
