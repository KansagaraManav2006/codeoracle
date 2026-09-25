import React from 'react';
import { Eye } from 'lucide-react';
import StatusPill, { ServiceStatus } from './common/StatusPill';

interface HeaderProps {
  onStatusChange?: (status: ServiceStatus) => void;
}

export const Header: React.FC<HeaderProps> = ({ onStatusChange }) => {
  return (
    <header
      className="w-full border-b border-line bg-surface/80 backdrop-blur-sm transition-colors"
      aria-label="Application Header"
    >
      <div className="w-full h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Compact Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg bg-indigo flex items-center justify-center text-white shrink-0 shadow-xs"
            aria-hidden="true"
          >
            <Eye className="w-4 h-4" strokeWidth={1.75} />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-base sm:text-lg leading-tight tracking-[-0.01em] text-ink">
              CodeOracle
            </span>
          </div>
        </div>

        {/* Header Right: Service Status */}
        <div className="flex items-center gap-3">
          <StatusPill onStatusChange={onStatusChange} />
        </div>
      </div>
    </header>
  );
};

export default Header;

