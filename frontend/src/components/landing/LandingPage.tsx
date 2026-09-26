import React from 'react';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import WhatIsCodeOracleSection from './WhatIsCodeOracleSection';
import ProductRevealSection from './ProductRevealSection';
import ProblemSection from './ProblemSection';
import MainProductStory from './MainProductStory';
import RiskSection from './RiskSection';
import ProtectionSection from './ProtectionSection';
import ModernizationSection from './ModernizationSection';
import ImpactSimulationSection from './ImpactSimulationSection';
import MigrationRoadmapSection from './MigrationRoadmapSection';
import CapabilityBento from './CapabilityBento';
import TrustSection from './TrustSection';
import FactStrip from './FactStrip';
import AudienceSection from './AudienceSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import LandingFooter from './LandingFooter';
import RecentProjectsSection from '../RecentProjectsSection';

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
      // Focus the input if available
      const input = el.querySelector<HTMLInputElement>('input[type="url"]');
      if (input) {
        setTimeout(() => input.focus(), 400);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-[#007AFF]/15 selection:text-[#007AFF] font-sans antialiased relative">
      {/* 01. Floating Apple-style Navbar */}
      <LandingNavbar
        onAnalyzeClick={scrollToComposer}
        onTryDemoClick={() => onLoadDemo()}
        isLoading={isLoading}
      />

      <main id="landing-content">
        {/* 02. Cinematic Hero + 03. Repository Composer */}
        <HeroSection
          onAnalyzeGithub={onAnalyzeGithub}
          onAnalyzeZip={onAnalyzeZip}
          onLoadDemo={onLoadDemo}
          isLoading={isLoading}
        />

        {/* Recent Projects Strip if available */}
        {onOpenProject && (
          <div className="max-w-[1020px] mx-auto px-4 sm:px-6 -mt-8 mb-16 relative z-10">
            <RecentProjectsSection onOpenProject={onOpenProject} disabled={isLoading} />
          </div>
        )}

        {/* 03b. Plain-Language "What is CodeOracle?" Definition */}
        <WhatIsCodeOracleSection />

        {/* 04. Immediate Repository Proof Reveal (145 files, 29k LOC) */}
        <ProductRevealSection onExploreDemo={() => onLoadDemo()} />

        {/* 05. Problem Section: "Old code rarely fails because one file is old" + 06. 4 Signals */}
        <ProblemSection />

        {/* 07. Main 7-Stage Interactive Story (Understand, Map, Prioritize, Protect, Modernize, Simulate, Plan) */}
        <MainProductStory />

        {/* 08. Risk Hotspots Section (Complexity vs Risk) */}
        <RiskSection />

        {/* 10. Safety Tests Section (Verification Ladder: Generated, Valid, Executed, Verified) */}
        <ProtectionSection />

        {/* 11. Modernization Pipeline (Horizontal Funnel: Findings -> Candidates -> Autofix -> Diffs -> Verified) */}
        <ModernizationSection />

        {/* 12. Impact Simulation (Interactive Ripple & Blast Radius) */}
        <ImpactSimulationSection />

        {/* 13. Migration Roadmap (Panoramic Waves W0 to W4) */}
        <MigrationRoadmapSection />

        {/* 14. Capability Bento (9 Varied Cards with Real UI Fragments) */}
        <CapabilityBento />

        {/* 15. Trust Section ("Every conclusion should show its evidence" + "What CodeOracle Does Not Claim") */}
        <TrustSection />

        {/* 16. Product Fact Strip (5 Grounded Metrics) */}
        <FactStrip />

        {/* 17. Audience Section (Developers, Tech Leads, Modernization Teams, Students, Reviewers) */}
        <AudienceSection />

        {/* 18. FAQ (12 Interactive Accordions) */}
        <FaqSection />

        {/* 19. Panoramic Final CTA */}
        <FinalCtaSection
          onAnalyzeClick={scrollToComposer}
          onTryDemoClick={() => onLoadDemo()}
          isLoading={isLoading}
        />
      </main>

      {/* 20. Minimal Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
