import React from 'react';
import { Eye, Sparkles } from 'lucide-react';
import HealthIndicator from './HealthIndicator';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400">
            <Eye className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-tight">CodeOracle</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Hackathon MVP
              </span>
            </div>
            <p className="text-xs text-slate-400">Legacy Codebase Intelligence & Refactoring Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
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
