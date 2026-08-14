import React from 'react';
import { Eye, Sparkles } from 'lucide-react';
import HealthIndicator from './HealthIndicator';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-3 py-3 sm:px-4 lg:px-6 lg:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-600/20 p-2 text-indigo-400 sm:p-2.5">
            <Eye className="h-5 w-5 animate-pulse sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-tight sm:text-xl">CodeOracle</h1>
              <span className="hidden text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 sm:inline-flex">
                Hackathon MVP
              </span>
            </div>
            <p className="hidden truncate text-xs text-slate-400 md:block">Legacy Codebase Intelligence & Refactoring Engine</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center space-x-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deterministic AST Mode Active</span>
          </div>
          <HealthIndicator />
        </div>
      </div>
    </header>
  );
};

export default Header;
