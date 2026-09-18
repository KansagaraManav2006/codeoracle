import React from 'react';
import { Eye, Menu, UserCheck, Sparkles, Search, Command } from 'lucide-react';
import HealthIndicator from './HealthIndicator';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
  activeProjectName?: string;
  onViewChange?: (view: any) => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  activeProjectName,
  onViewChange,
  onOpenCommandPalette,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2D2A26] bg-[#181715] text-white shadow-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side: Branding & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="rounded-xl border border-[#3A3632] bg-[#23211E] p-2 text-[#C9C1B5] hover:bg-[#2D2A26] hover:text-white lg:hidden"
              title="Toggle Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div
            onClick={() => onViewChange?.('dashboard')}
            className="flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#4C4FD6] text-white shadow-sm ring-2 ring-indigo-400/30">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  CodeOracle
                </h1>
                <span className="hidden sm:inline-block rounded-full bg-[#383BA8] px-2.5 py-0.5 text-[9px] font-bold tracking-widest uppercase text-indigo-200">
                  PRO ENGINE
                </span>
              </div>
              <p className="hidden text-[11px] font-semibold text-[#A3998E] md:block">
                Developer Platform & Modernizing Engine
              </p>
            </div>
          </div>
        </div>

        {/* Center: Command Palette Search Bar & Active Project Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#23211E] hover:bg-[#2D2A26] border border-[#3A3632] text-[#C9C1B5] rounded-xl text-xs transition-colors shadow-inner"
            title="Search pages and commands (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-[#C7953D]" />
            <span className="hidden sm:inline text-[#A3998E]">Search commands...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#181715] text-[#C7953D] border border-[#3A3632] rounded">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>

          {activeProjectName && (
            <div className="hidden items-center gap-2 rounded-full border border-[#3A3632] bg-[#23211E] px-3.5 py-1 text-xs font-bold text-[#E5DFD5] md:flex">
              <Sparkles className="h-3.5 w-3.5 text-[#C7953D]" />
              <span className="text-[#A3998E]">Active:</span>
              <span className="max-w-[180px] truncate text-white">{activeProjectName}</span>
            </div>
          )}
        </div>

        {/* Right Side: Service Status & Profile */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <HealthIndicator />
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#3A3632] bg-[#23211E] px-3 py-1 text-xs font-extrabold text-[#E5DFD5]">
            <UserCheck className="h-3.5 w-3.5 text-[#4C4FD6]" />
            <span>Developer Profile</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
