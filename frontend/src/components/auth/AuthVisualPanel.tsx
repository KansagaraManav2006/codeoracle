import React from 'react';
import { navigateTo } from '../../utils/navigation';

interface AuthVisualPanelProps {
  headline: string;
  subheadline: string;
  activeMode: 'signin' | 'register';
}

export const AuthVisualPanel: React.FC<AuthVisualPanelProps> = ({ headline, subheadline, activeMode }) => {
  return (
    <div className="relative w-full h-full bg-[#181715] text-[#FFFDFC] p-8 lg:p-12 xl:p-16 flex flex-col justify-between overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#4C4FD6]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#B88228]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Subtle architectural dot grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #ECE5DA 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Header / Branding */}
      <div className="relative z-10">
        <button
          onClick={() => navigateTo('/')}
          className="group inline-flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-[#4C4FD6] rounded-lg p-1 -m-1 transition-all"
          title="Return to CodeOracle Home"
        >
          <div className="w-10 h-10 rounded-xl bg-[#23211E] border border-[#3B3733] flex items-center justify-center shadow-md group-hover:border-[#4C4FD6] transition-colors">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M16 6L25 11.2V20.8L16 26L7 20.8V11.2L16 6Z" stroke="#4C4FD6" strokeWidth="2.2" strokeLinejoin="round"/>
              <circle cx="16" cy="16" r="3.5" fill="#4C4FD6"/>
              <circle cx="21" cy="13" r="1.5" fill="#B88228"/>
              <circle cx="11" cy="19" r="1.5" fill="#B88228"/>
            </svg>
          </div>
          <div>
            <span className="font-display font-bold text-lg text-[#FFFDFC] tracking-tight">CodeOracle</span>
            <span className="block text-[11px] font-mono text-[#A39888] tracking-wider uppercase">Codebase Intelligence</span>
          </div>
        </button>
      </div>

      {/* Center Context & Preview Showcase */}
      <div className="relative z-10 my-auto py-8">
        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4C4FD6]/15 border border-[#4C4FD6]/30 text-[#EAE9FB] text-xs font-mono font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4C4FD6] animate-pulse" />
            {activeMode === 'signin' ? 'Session Gateway' : 'Private Workspace'}
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-[#FFFDFC] tracking-tight leading-tight mb-3">
            {headline}
          </h1>
          <p className="text-sm lg:text-base text-[#C8BEB0] leading-relaxed mb-8">
            {subheadline}
          </p>
        </div>

        {/* 3 Interactive Architecture Artifact Cards */}
        <div className="space-y-3.5 max-w-lg">
          {/* Card 1: Code Explanation Preview */}
          <div className="bg-[#23211E]/90 backdrop-blur-sm border border-[#3B3733] hover:border-[#4C4FD6]/60 rounded-xl p-4 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4C4FD6]" />
                <span className="font-mono text-xs text-[#EAE9FB] font-medium">app/security/session.py</span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-[#181715] text-[#B88228] px-2 py-0.5 rounded border border-[#3B3733]">
                Full AST
              </span>
            </div>
            <p className="text-xs text-[#C8BEB0] leading-relaxed">
              Manages persistent cryptographic sessions with HTTP-only cookies and cross-origin resource isolation.
            </p>
          </div>

          {/* Card 2: Dependency Connection Preview */}
          <div className="bg-[#23211E]/90 backdrop-blur-sm border border-[#3B3733] hover:border-[#4C4FD6]/60 rounded-xl p-4 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-[#A39888]">Dependency Pipeline</span>
              <span className="text-[10px] font-mono text-[#3FB950] bg-[#238636]/15 px-2 py-0.5 rounded">0 cycles detected</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="bg-[#181715] border border-[#3B3733] px-2.5 py-1 rounded text-[#FFFDFC]">api/routes</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4C4FD6" strokeWidth="2.5" className="shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="bg-[#181715] border border-[#3B3733] px-2.5 py-1 rounded text-[#EAE9FB]">services/auth</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4C4FD6" strokeWidth="2.5" className="shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="bg-[#181715] border border-[#3B3733] px-2.5 py-1 rounded text-[#B88228]">storage/db</span>
            </div>
          </div>

          {/* Card 3: Proposed Modernization Diff */}
          <div className="bg-[#23211E]/90 backdrop-blur-sm border border-[#3B3733] hover:border-[#4C4FD6]/60 rounded-xl p-4 shadow-xl transition-all font-mono text-xs">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#3B3733]/60">
              <span className="text-[11px] text-[#A39888]">Proposed Modernization Proposal</span>
              <span className="text-[10px] text-[#4C4FD6] font-semibold">Reviewable Diff</span>
            </div>
            <div className="space-y-1">
              <div className="text-[#F87171] bg-[#D9383A]/10 px-2 py-0.5 rounded flex items-center gap-2">
                <span>-</span>
                <span>session = query_legacy_session(raw_token)</span>
              </div>
              <div className="text-[#3FB950] bg-[#238636]/10 px-2 py-0.5 rounded flex items-center gap-2">
                <span>+</span>
                <span>session = await auth_service.validate_and_refresh(token)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="relative z-10 pt-4 border-t border-[#3B3733]/60 flex items-center justify-between text-xs text-[#A39888]">
        <span>Deterministic AST Engine</span>
        <span>Zero-leak project isolation</span>
      </div>
    </div>
  );
};
