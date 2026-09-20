import React from 'react';
import { Eye } from 'lucide-react';
import StatusPill, { ServiceStatus } from './common/StatusPill';

interface HeaderProps {
  onStatusChange?: (status: ServiceStatus) => void;
}

export const Header: React.FC<HeaderProps> = ({ onStatusChange }) => {
  return (
    <header
      className="sticky top-0 z-sticky h-[68px] bg-header text-white"
      style={{ boxShadow: 'inset 0 2px 0 var(--header-line)' }}
    >
      <div className="max-w-header h-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Group */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-[12px] bg-indigo flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}
            aria-hidden="true"
          >
            <Eye className="w-5 h-5 sm:w-[22px] sm:h-[22px]" strokeWidth={1.75} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-[18px] sm:text-[20px] leading-tight tracking-[-0.01em] text-white">
                CodeOracle
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-indigo-deep text-indigo-badge-text font-sans text-[11px] leading-none font-bold tracking-[0.06em] uppercase select-none">
                PRO ENGINE
              </span>
            </div>
            <p className="hidden sm:block text-[12px] leading-[1.3] text-header-muted mt-0.5 font-sans">
              Legacy Codebase Intelligence &amp; Refactoring Engine
            </p>
          </div>
        </div>

        {/* Header Right: Status */}
        <div className="flex items-center gap-3">
          <StatusPill onStatusChange={onStatusChange} />
        </div>
      </div>
    </header>
  );
};

export default Header;
