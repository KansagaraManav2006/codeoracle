import React, { useState, useEffect } from 'react';
import {
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
import { useInView, useReducedMotion } from '../../hooks/useScrollAnimation';
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
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const prefersReduced = useReducedMotion();

  // Staggered mount — each element reveals at its own time
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [headlineVisible, setHeadlineVisible] = useState(false);
  const [descVisible, setDescVisible] = useState(false);
  const [ctasVisible, setCtasVisible] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  // Repository composer in-view
  const [composerRef, composerInView] = useInView({ threshold: 0.12 });

  const sampleRepos = [
    { name: 'Flask', url: 'https://github.com/pallets/flask', desc: 'Python core' },
    { name: 'Express', url: 'https://github.com/expressjs/express', desc: 'Node.js framework' },
    { name: 'NumPy 100', url: 'https://github.com/rougier/numpy-100', desc: 'Verified benchmark' },
    {
      name: 'E-Commerce Platform',
      url: 'https://github.com/DeepMakwana-18/End-to-End-E-commerce-Demand-Forecasting-Inventory-Optimization-Platform..git',
      desc: '145 files • 29k LOC',
    },
  ];

  // Staggered mount sequence
  useEffect(() => {
    setMounted(true);
    if (prefersReduced) {
      setBadgeVisible(true);
      setHeadlineVisible(true);
      setDescVisible(true);
      setCtasVisible(true);
      setHintVisible(true);
      return;
    }
    const timers = [
      setTimeout(() => setBadgeVisible(true), 80),
      setTimeout(() => setHeadlineVisible(true), 240),
      setTimeout(() => setDescVisible(true), 420),
      setTimeout(() => setCtasVisible(true), 560),
      setTimeout(() => setHintVisible(true), 680),
    ];
    return () => timers.forEach(clearTimeout);
  }, [prefersReduced]);

  // Scroll parallax
  useEffect(() => {
    if (prefersReduced) return;
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
  }, [prefersReduced]);

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

    if (!isAuthenticated) {
      setUrlError('Sign in is required to import repositories. Guests are welcome to explore the bundled benchmark demo below.');
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

    if (!isAuthenticated) {
      setZipError('Sign in is required to upload archives. Guests are welcome to explore the bundled benchmark demo below.');
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

  // Hero scroll-out: as user scrolls, hero gently scales down (subtle depth shift)
  const heroScrollProgress = prefersReduced ? 0 : Math.min(scrollY / (window.innerHeight || 900), 1);
  const heroScale = prefersReduced ? 1 : 1 - heroScrollProgress * 0.04;
  const heroContentOpacity = prefersReduced ? 1 : Math.max(1 - heroScrollProgress * 1.8, 0);
  const bloomScale = prefersReduced ? 1 : 1 + heroScrollProgress * 0.25;

  // Composer panel scale/blur entrance
  const composerPanelStyle = prefersReduced
    ? {}
    : {
        opacity: composerInView ? 1 : 0,
        transform: composerInView ? 'scale(1) translateY(0px)' : 'scale(0.93) translateY(28px)',
        filter: composerInView ? 'blur(0px)' : 'blur(4px)',
        transition:
          'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), filter 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: '0.12s',
      };

  return (
    <>
      <section
        id="hero-section"
        className="relative isolate min-h-[100svh] w-full flex flex-col justify-center items-center pt-20 pb-8 px-4 sm:px-6 overflow-hidden bg-[#F5F1E9]"
        style={{
          transform: prefersReduced ? 'none' : `scale(${heroScale})`,
          transformOrigin: 'center top',
          willChange: 'transform',
        }}
      >
        {/* ========================================================================= */}
        {/* HERO BACKGROUND SYSTEM: Radiant Bloom & 7 Glowing Glass Pillars            */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
          {/* Core Radiant Atmosphere Bloom */}
          <div
            className="absolute top-24 sm:top-20 w-[640px] sm:w-[820px] md:w-[940px] h-[480px] sm:h-[540px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, rgba(76, 79, 214, 0.38) 0%, rgba(98, 102, 235, 0.24) 42%, rgba(184, 130, 40, 0.14) 65%, transparent 80%)',
              filter: 'blur(70px)',
              transform: `translate3d(0, ${scrollY * 0.06}px, 0) scale(${bloomScale})`,
              willChange: 'transform',
            }}
          />

          {/* Vertical Translucent Glass Pillars */}
          <div className="absolute top-16 w-full max-w-[1040px] h-[640px] pointer-events-none">
            {/* Pillar 1: Outer Left (Cyan Glass) */}
            <div
              className="absolute backdrop-blur-[6px] border border-white/50"
              style={{
                width: '110px',
                height: '370px',
                top: '190px',
                left: 'calc(50% - 410px)',
                background:
                  'linear-gradient(180deg, rgba(50, 173, 230, 0.65) 0%, rgba(76, 79, 214, 0.25) 55%, transparent 100%)',
                borderRadius: '42px 42px 24px 24px',
                boxShadow: '0 10px 40px rgba(50, 173, 230, 0.28), inset 0 2px 4px rgba(255, 255, 255, 0.7)',
                transform: `translate3d(0, ${scrollY * 0.06}px, 0)`,
                willChange: 'transform',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
              }}
            />

            {/* Pillar 2: Mid Left (Violet/Indigo) */}
            <div
              className="absolute backdrop-blur-[6px] border border-white/60"
              style={{
                width: '135px',
                height: '460px',
                top: '130px',
                left: 'calc(50% - 315px)',
                background:
                  'linear-gradient(180deg, rgba(142, 68, 173, 0.68) 0%, rgba(76, 79, 214, 0.38) 50%, transparent 100%)',
                borderRadius: '48px 48px 28px 28px',
                boxShadow: '0 15px 50px rgba(142, 68, 173, 0.30), inset 0 2px 4px rgba(255, 255, 255, 0.8)',
                transform: `translate3d(0, ${scrollY * 0.11}px, 0)`,
                willChange: 'transform',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
              }}
            />

            {/* Pillar 3: Inner Left (Primary Indigo) */}
            <div
              className="absolute backdrop-blur-[6px] border border-white/70"
              style={{
                width: '155px',
                height: '520px',
                top: '80px',
                left: 'calc(50% - 200px)',
                background:
                  'linear-gradient(180deg, rgba(76, 79, 214, 0.85) 0%, rgba(98, 102, 235, 0.50) 45%, rgba(184, 130, 40, 0.20) 75%, transparent 100%)',
                borderRadius: '56px 56px 32px 32px',
                boxShadow: '0 20px 60px rgba(76, 79, 214, 0.40), inset 0 2px 5px rgba(255, 255, 255, 0.85)',
                transform: `translate3d(0, ${scrollY * 0.17}px, 0)`,
                willChange: 'transform',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 1.0s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
              }}
            />

            {/* Pillar 4: Center Tallest (Deep Indigo & White Specular) */}
            <div
              className="absolute backdrop-blur-[6px] border border-white/80"
              style={{
                width: '175px',
                height: '570px',
                top: '40px',
                left: 'calc(50% - 90px)',
                background:
                  'linear-gradient(180deg, rgba(76, 79, 214, 0.92) 0%, rgba(98, 102, 235, 0.65) 45%, rgba(62, 65, 184, 0.30) 75%, transparent 100%)',
                borderRadius: '64px 64px 36px 36px',
                boxShadow: '0 25px 70px rgba(76, 79, 214, 0.48), inset 0 3px 6px rgba(255, 255, 255, 1)',
                transform: `translate3d(0, ${scrollY * 0.22}px, 0)`,
                willChange: 'transform',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.05s',
              }}
            >
              <div className="absolute inset-0 rounded-t-[64px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
            </div>

            {/* Pillar 5: Inner Right (Indigo to Warm Amber) */}
            <div
              className="absolute backdrop-blur-[6px] border border-white/70"
              style={{
                width: '155px',
                height: '530px',
                top: '75px',
                left: 'calc(50% + 40px)',
                background:
                  'linear-gradient(180deg, rgba(76, 79, 214, 0.78) 0%, rgba(184, 130, 40, 0.42) 48%, rgba(184, 130, 40, 0.15) 80%, transparent 100%)',
                borderRadius: '56px 56px 32px 32px',
                boxShadow: '0 20px 60px rgba(184, 130, 40, 0.30), inset 0 2px 5px rgba(255, 255, 255, 0.85)',
                transform: `translate3d(0, ${scrollY * 0.16}px, 0)`,
                willChange: 'transform',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 1.0s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
              }}
            />

            {/* Pillar 6: Mid Right (Teal & Indigo) */}
            <div
              className="absolute backdrop-blur-[6px] border border-white/60"
              style={{
                width: '135px',
                height: '450px',
                top: '135px',
                left: 'calc(50% + 180px)',
                background:
                  'linear-gradient(180deg, rgba(0, 199, 190, 0.65) 0%, rgba(76, 79, 214, 0.30) 50%, transparent 100%)',
                borderRadius: '48px 48px 28px 28px',
                boxShadow: '0 15px 50px rgba(0, 199, 190, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.8)',
                transform: `translate3d(0, ${scrollY * 0.10}px, 0)`,
                willChange: 'transform',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
              }}
            />

            {/* Pillar 7: Outer Right (Frost White & Indigo) */}
            <div
              className="absolute backdrop-blur-[6px] border border-white/55"
              style={{
                width: '110px',
                height: '360px',
                top: '195px',
                left: 'calc(50% + 300px)',
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0.90) 0%, rgba(76, 79, 214, 0.28) 55%, transparent 100%)',
                borderRadius: '42px 42px 24px 24px',
                boxShadow: '0 10px 40px rgba(255, 255, 255, 0.40), inset 0 2px 4px rgba(255, 255, 255, 0.85)',
                transform: `translate3d(0, ${scrollY * 0.06}px, 0)`,
                willChange: 'transform',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
              }}
            />
          </div>

          {/* Soft bottom fade blending seamlessly into warm canvas */}
          <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-[#F5F1E9] via-[#F5F1E9]/85 to-transparent pointer-events-none" />
        </div>

        {/* ========================================================================= */}
        {/* HERO FOREGROUND CONTENT: Staggered Entrance Flow                          */}
        {/* ========================================================================= */}
        <div
          className="max-w-[1020px] mx-auto text-center flex flex-col items-center relative z-10"
          style={{
            opacity: heroContentOpacity,
            willChange: 'opacity',
          }}
        >
          {/* Eyebrow badge — reveals first */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFFDFC]/90 backdrop-blur-md border border-[#C8BEB0] shadow-apple text-xs font-semibold text-[#181715] tracking-tight mb-8"
            style={{
              opacity: badgeVisible ? 1 : 0,
              transform: badgeVisible ? 'none' : 'translate3d(0, 18px, 0)',
              transition: prefersReduced
                ? 'none'
                : 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-[#4C4FD6] animate-ping" />
            <span>Codebase Intelligence Engine</span>
          </div>

          {/* Main Headline — reveals second */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-[-0.035em] text-[#181715] leading-[1.03] max-w-[940px] mb-6 font-display"
            style={{
              opacity: headlineVisible ? 1 : 0,
              transform: headlineVisible ? 'none' : 'translate3d(0, 24px, 0)',
              transition: prefersReduced
                ? 'none'
                : 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Map your codebase.<br />
            <span className="text-[#5C554D] font-bold">Understand the risk.</span><br />
            <span className="text-[#4C4FD6]">Modernize with confidence.</span>
          </h1>

          {/* Description — reveals third */}
          <p
            className="text-base sm:text-lg md:text-xl text-[#3B3733] max-w-[660px] leading-relaxed mb-8 font-normal font-sans"
            style={{
              opacity: descVisible ? 1 : 0,
              transform: descVisible ? 'none' : 'translate3d(0, 18px, 0)',
              transition: prefersReduced
                ? 'none'
                : 'opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Analyze architecture, dependencies, risk hotspots, and test guardrails before touching production code.
          </p>

          {/* CTAs — reveals fourth */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6"
            style={{
              opacity: ctasVisible ? 1 : 0,
              transform: ctasVisible ? 'none' : 'translate3d(0, 18px, 0)',
              transition: prefersReduced
                ? 'none'
                : 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <button
              type="button"
              onClick={scrollToComposer}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white bg-[#4C4FD6] hover:bg-[#3E41B8] shadow-[0_8px_24px_rgba(76,79,214,0.30)] transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-[#181715] bg-[#FFFDFC]/90 hover:bg-[#FFFDFC] border border-[#C8BEB0] hover:border-[#A39888] shadow-apple backdrop-blur-md transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#B88228]" />
              <span>Try Benchmark Demo</span>
            </button>
          </div>

          {/* Scroll hint — reveals last */}
          <div
            className="pt-2"
            style={{
              opacity: hintVisible ? 1 : 0,
              transform: hintVisible ? 'none' : 'translate3d(0, 12px, 0)',
              transition: prefersReduced
                ? 'none'
                : 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <button
              type="button"
              onClick={scrollToComposer}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFFDFC]/80 hover:bg-[#FFFDFC] backdrop-blur-md border border-[#C8BEB0] text-xs font-medium text-[#5C554D] hover:text-[#181715] transition-all shadow-xs group"
            >
              <span>Scroll to repository intake</span>
              <ArrowRight className="w-3 h-3 rotate-90 text-[#4C4FD6] group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 02. REPOSITORY COMPOSER — Scale/blur entrance from below                  */}
      {/* ========================================================================= */}
      <section
        id="repository-composer"
        ref={composerRef as React.RefObject<HTMLDivElement>}
        className="min-h-[100svh] w-full flex flex-col justify-center items-center py-10 lg:py-14 pt-20 px-4 sm:px-6 relative bg-[#F5F1E9] border-t border-[#C8BEB0]/60"
      >
        <div className="max-w-[880px] w-full mx-auto my-auto">
          {/* Composer Header — staggered */}
          <div className="text-center mb-5 sm:mb-6">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE9FB] text-[#4C4FD6] text-xs font-semibold uppercase tracking-wider mb-2 font-mono"
              style={{
                opacity: composerInView ? 1 : 0,
                transform: composerInView ? 'none' : 'translate3d(0, 14px, 0)',
                transition: prefersReduced
                  ? 'none'
                  : 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Repository Intake</span>
            </div>
            <h2
              className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#181715] leading-tight mb-2 font-display"
              style={{
                opacity: composerInView ? 1 : 0,
                transform: composerInView ? 'none' : 'translate3d(0, 18px, 0)',
                transition: prefersReduced
                  ? 'none'
                  : 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.08s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.08s',
              }}
            >
              Analyze any codebase in seconds.
            </h2>
            <p
              className="text-xs sm:text-sm text-[#5C554D] max-w-[580px] mx-auto leading-relaxed"
              style={{
                opacity: composerInView ? 1 : 0,
                transform: composerInView ? 'none' : 'translate3d(0, 14px, 0)',
                transition: prefersReduced
                  ? 'none'
                  : 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.16s, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.16s',
              }}
            >
              Enter a public GitHub repository URL or drag and drop a ZIP archive. Read-only static analysis without executing untrusted code.
            </p>
          </div>

          {/* Repository Panel — scale+blur approach, enters last */}
          <div
            className="w-full bg-[#FFFDFC] rounded-[32px] sm:rounded-[36px] border border-[#C8BEB0] shadow-apple-lg p-5 sm:p-7 relative text-left"
            style={composerPanelStyle}
          >
            {/* Mode Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE5DA] pb-3.5 mb-4">
              <div className="inline-flex p-1 rounded-full bg-[#ECE5DA] border border-[#C8BEB0]/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('github');
                    setUrlError(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTab === 'github'
                      ? 'bg-[#FFFDFC] text-[#181715] shadow-xs'
                      : 'text-[#5C554D] hover:text-[#181715]'
                  }`}
                >
                  GitHub URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('zip');
                    setZipError(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTab === 'zip'
                      ? 'bg-[#FFFDFC] text-[#181715] shadow-xs'
                      : 'text-[#5C554D] hover:text-[#181715]'
                  }`}
                >
                  Upload ZIP
                </button>
              </div>

              {/* Guest demo badge reminder */}
              {!isAuthenticated && (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#7A7268]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B88228]" />
                  <span>Guest mode: Demo ready • Sign in for custom repos</span>
                </div>
              )}
            </div>

            {/* Input View */}
            {activeTab === 'github' ? (
              <form onSubmit={handleGithubSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 flex items-center bg-[#ECE5DA]/60 border border-[#C8BEB0] rounded-2xl px-3.5 py-2.5 focus-within:border-[#4C4FD6] focus-within:ring-2 focus-within:ring-[#4C4FD6]/20 transition-all">
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => {
                        setGithubUrl(e.target.value);
                        setUrlError(null);
                      }}
                      placeholder="https://github.com/owner/repository"
                      className="w-full bg-transparent text-sm text-[#181715] placeholder:text-[#7A7268] focus:outline-none font-mono"
                      disabled={isSubmitting || isLoading}
                    />
                    {githubUrl && (
                      <button
                        type="button"
                        onClick={() => setGithubUrl('')}
                        className="text-xs text-[#7A7268] hover:text-[#181715] px-1 font-mono"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handlePaste}
                      title="Paste from clipboard"
                      className="p-1.5 rounded-lg text-[#7A7268] hover:text-[#181715] hover:bg-[#FFFDFC] transition-colors border border-transparent hover:border-[#C8BEB0]"
                    >
                      <Clipboard className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading || !githubUrl.trim()}
                    className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-[#4C4FD6] hover:bg-[#3E41B8] disabled:opacity-40 shadow-sm transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#D9383A] bg-[#FDF0F0] border border-[#F5B8B9] rounded-xl px-3.5 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{urlError}</span>
                    </div>
                    {!isAuthenticated && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs">
                        <button
                          type="button"
                          onClick={() => navigateTo('/signin')}
                          className="font-semibold text-[#4C4FD6] hover:underline"
                        >
                          Sign In
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => onLoadDemo()}
                          className="font-semibold text-[#B88228] hover:underline"
                        >
                          Try Demo
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Repository Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1 px-1">
                  <span className="text-xs text-[#5C554D] font-medium mr-1 font-mono">Quick Benchmarks:</span>
                  {sampleRepos.map((repo) => (
                    <button
                      key={repo.name}
                      type="button"
                      onClick={() => {
                        setGithubUrl(repo.url);
                        setUrlError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-[#3B3733] bg-[#ECE5DA]/70 hover:bg-[#FFFDFC] hover:text-[#181715] border border-[#C8BEB0] hover:border-[#4C4FD6]/50 hover:shadow-xs transition-all"
                    >
                      <span className="font-semibold">{repo.name}</span>
                      <span className="text-[#7A7268] text-[11px] font-mono">({repo.desc})</span>
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleZipDrop}
                  className="border-2 border-dashed border-[#C8BEB0] hover:border-[#4C4FD6] bg-[#ECE5DA]/40 rounded-2xl p-6 sm:p-8 text-center transition-colors cursor-pointer"
                  onClick={() => document.getElementById('zip-file-input')?.click()}
                >
                  <input
                    id="zip-file-input"
                    type="file"
                    accept=".zip"
                    onChange={handleZipFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-[#FFFDFC] shadow-sm border border-[#C8BEB0] flex items-center justify-center mx-auto mb-3 text-[#4C4FD6]">
                    <Upload className="w-6 h-6" />
                  </div>
                  {selectedZip ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#181715] flex items-center justify-center gap-2 font-display">
                        <FileCode2 className="w-4 h-4 text-[#238636]" />
                        <span>{selectedZip.name}</span>
                      </p>
                      <p className="text-xs text-[#7A7268] font-mono">
                        {(selectedZip.size / (1024 * 1024)).toFixed(2)} MB archive ready for static inspection
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#181715]">
                        Drag and drop repository .zip here, or click to browse
                      </p>
                      <p className="text-xs text-[#7A7268]">Up to 200 MB archive, 10,000 files</p>
                    </div>
                  )}
                </div>

                {zipError && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#D9383A] bg-[#FDF0F0] border border-[#F5B8B9] rounded-xl px-3.5 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{zipError}</span>
                    </div>
                    {!isAuthenticated && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs">
                        <button
                          type="button"
                          onClick={() => navigateTo('/signin')}
                          className="font-semibold text-[#4C4FD6] hover:underline"
                        >
                          Sign In
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => onLoadDemo()}
                          className="font-semibold text-[#B88228] hover:underline"
                        >
                          Try Demo
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedZip && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleZipSubmit}
                      disabled={isSubmitting || isLoading}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4C4FD6] hover:bg-[#3E41B8] shadow-sm transition-all"
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

            {/* Analysis Stages Overlay */}
            {(isSubmitting || isLoading) && (
              <div className="mt-4 pt-4 border-t border-[#ECE5DA] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#181715] flex items-center gap-2 font-display">
                    <Loader2 className="w-3.5 h-3.5 text-[#4C4FD6] animate-spin" />
                    {ANALYSIS_STAGES[currentStageIndex]}
                  </span>
                  <span className="text-[#7A7268] font-mono">
                    Stage {currentStageIndex + 1} of {ANALYSIS_STAGES.length}
                  </span>
                </div>
                <div className="w-full bg-[#ECE5DA] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#4C4FD6] h-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStageIndex + 1) / ANALYSIS_STAGES.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Composer Security Footnote */}
            <div className="mt-4 pt-3 border-t border-[#ECE5DA] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#7A7268]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#238636]" />
                <span>Read-only static analysis — uploaded repository code is never executed.</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
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
    </>
  );
};

export default HeroSection;
