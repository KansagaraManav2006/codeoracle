import React from 'react';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import ScrollStorytellingSection from './ScrollStorytellingSection';
import FeaturesSection from './FeaturesSection';
import InteractivePreviewSection from './InteractivePreviewSection';
import AccurateAnalysisSection from './AccurateAnalysisSection';
import LandingFooter from './LandingFooter';
import RecentProjectsSection from '../RecentProjectsSection';
import { navigateTo } from '../../utils/navigation';

interface LandingPageProps {
  onAnalyzeGithub: (url: string) => void;
  onAnalyzeZip: (file: File) => void;
  onLoadDemo: (benchmarkName?: string) => void;
  onOpenProject?: (projectId: string) => void;
  isLoading?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onAnalyzeGithub,
  onAnalyzeZip,
  onLoadDemo,
  onOpenProject,
  isLoading = false,
}) => {
  const scrollToComposer = () => {
    const el = document.getElementById('repository-composer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.querySelector<HTMLInputElement>('input[type="url"]');
      if (input) {
        setTimeout(() => input.focus(), 300);
      }
    }
  };

  const handleOpenDemoInWorkspace = () => {
    onLoadDemo('pallets/flask');
    navigateTo('/workspace');
  };

  return (
    <div className="min-h-screen bg-[#F5F1E9] text-[#181715] selection:bg-[#4C4FD6]/20 selection:text-[#4C4FD6] font-sans antialiased relative">
      {/* 01. Sticky Header Navbar */}
      <LandingNavbar
        onAnalyzeClick={scrollToComposer}
        onTryDemoClick={handleOpenDemoInWorkspace}
        isLoading={isLoading}
      />

      <main id="landing-content" className="w-full">
        {/* 02. Two-Column Hero with 3D Architecture Scene & Repository Composer */}
        <HeroSection
          onAnalyzeGithub={onAnalyzeGithub}
          onAnalyzeZip={onAnalyzeZip}
          onLoadDemo={handleOpenDemoInWorkspace}
          isLoading={isLoading}
        />

        {/* Recent Projects Strip if available */}
        {onOpenProject && (
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-16 relative z-10">
            <RecentProjectsSection onOpenProject={onOpenProject} disabled={isLoading} />
          </div>
        )}

        {/* 03. Five Feature Pillars with Detailed Asymmetric Cards */}
        <FeaturesSection />

        {/* 04. Three-Stage Scroll Storytelling (Import → Understand → Modernize) */}
        <ScrollStorytellingSection />

        {/* 05. Interactive Preview with 5 Feature Tabs */}
        <InteractivePreviewSection onOpenDemo={handleOpenDemoInWorkspace} />

        {/* 06. Deterministic Static AST Explanation */}
        <AccurateAnalysisSection />
      </main>

      {/* 07. Minimal Working Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
