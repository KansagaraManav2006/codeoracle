import React from 'react';
import { X, Target } from 'lucide-react';
import { ChangeImpact, TabType } from '../../types';
import ChangeImpactView from './ChangeImpactView';

export interface ChangeImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string | null;
  targetFile?: string | null;
  impact?: ChangeImpact | null;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const ChangeImpactModal: React.FC<ChangeImpactModalProps> = ({
  isOpen,
  onClose,
  projectId,
  targetFile,
  impact,
  onSelectFile,
  onFocusInGraph,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6 bg-ink/60 backdrop-blur-[6px] animate-[fade-in_150ms_ease-out]"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-surface rounded-2xl border border-line shadow-4 flex flex-col overflow-hidden animate-[scale-up_150ms_ease-out]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-tile/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-indigo-surface text-indigo flex items-center justify-center border border-indigo/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-ink">
                What Breaks If I Change This?
              </h3>
              <p className="text-xs text-ink-3">
                Static blast radius, downstream ripple, entry point disruption, and protection test requirements.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md border border-line bg-surface hover:bg-tile text-ink-3 hover:text-ink flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
            title="Close impact modal"
            aria-label="Close impact modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <ChangeImpactView
            projectId={projectId}
            targetFile={targetFile}
            impact={impact}
            onSelectFile={onSelectFile}
            onFocusInGraph={(file) => {
              onClose();
              onFocusInGraph?.(file);
            }}
            onNavigateTab={(tab) => {
              onClose();
              onNavigateTab?.(tab);
            }}
            showHeroAction={false}
          />
        </div>
      </div>
    </div>
  );
};

export default ChangeImpactModal;
