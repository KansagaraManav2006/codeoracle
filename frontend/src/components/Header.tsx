import React from 'react';
import { Eye } from 'lucide-react';
import HealthIndicator from './HealthIndicator';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-3 py-3 sm:px-4 lg:px-6 lg:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-600/20 p-2 text-indigo-400 sm:p-2.5">
            <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight sm:text-xl">CodeOracle</h1>
            <p className="hidden truncate text-xs text-slate-400 md:block">Legacy Codebase Intelligence & Refactoring Engine</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <HealthIndicator />
        </div>
      </div>
    </header>
  );
};

export default Header;
