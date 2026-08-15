import React from 'react';
import { Eye } from 'lucide-react';
import HealthIndicator from './HealthIndicator';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-[#2D2A26] bg-[#181715] text-white sticky top-0 z-50 px-4 py-3 sm:px-6 lg:px-8 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <div className="flex shrink-0 items-center justify-center rounded-2xl bg-[#4C4FD6] p-2 text-white sm:p-2.5 shadow-sm ring-2 ring-indigo-400/30">
            <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white tracking-tight sm:text-xl font-sans">
                CodeOracle
              </h1>
              <span className="hidden sm:inline-block rounded-full bg-[#383BA8] px-2.5 py-0.5 text-[9px] font-bold tracking-widest uppercase text-indigo-200">
                PRO ENGINE
              </span>
            </div>
            <p className="hidden truncate text-xs font-medium text-[#A3998E] md:block">
              Legacy Codebase Intelligence & Refactoring Engine
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <HealthIndicator />
        </div>
      </div>
    </header>
  );
};

export default Header;
