import React from 'react';
import { Download, ChevronRight, X } from 'lucide-react';
import { GeneratedTestFile } from '../../types';
import Button from '../common/Button';
import Dialog from '../common/Dialog';

interface TestDownloadModalProps {
  open: boolean;
  onClose: () => void;
  totalGenFiles: number;
  protectedModulesCount: number;
  frameworks?: string[];
  activeFile?: GeneratedTestFile;
  onDownload: (scope: 'all' | 'protected' | 'selected') => void;
}

export const TestDownloadModal: React.FC<TestDownloadModalProps> = ({
  open,
  onClose,
  totalGenFiles,
  protectedModulesCount,
  frameworks,
  activeFile,
  onDownload,
}) => {
  if (!open) return null;

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      ariaLabel="Download Characterization Test Suites"
      backdropClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      panelClassName="bg-surface border border-line rounded-xl max-w-lg w-full p-5 shadow-2 space-y-4"
    >
      <>
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo" />
            <h3 id="test-download-title" className="font-display font-bold text-base text-ink">Export Generated Test Suites</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-3 hover:text-ink p-1 rounded transition-colors"
            aria-label="Close download dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Manifest Summary */}
        <div className="p-3 bg-tile rounded-lg border border-line space-y-1.5 text-xs">
          <div className="font-bold text-ink flex items-center justify-between">
            <span>Archive Manifest:</span>
            <span className="font-mono text-indigo font-semibold">{totalGenFiles} files</span>
          </div>
          <p className="text-ink-3 leading-relaxed">
            Includes test suites, <code className="font-mono text-ink">manifest.json</code> metadata, and{' '}
            <code className="font-mono text-ink">README.md</code> execution instructions.
          </p>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-ink-2 font-mono">
            <span>Frameworks: {frameworks?.join(', ') || 'vitest, pytest'}</span>
            <span>Runtime: Locked</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onDownload('all')}
            className="w-full text-left p-3 rounded-lg border border-line hover:border-indigo/50 hover:bg-indigo-surface/20 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="font-bold text-xs text-ink group-hover:text-indigo">
                Download All Generated Tests ({totalGenFiles} files)
              </div>
              <div className="text-[11px] text-ink-3 mt-0.5">
                Complete suite containing all characterization tests and smoke imports.
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-indigo shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onDownload('protected')}
            className="w-full text-left p-3 rounded-lg border border-line hover:border-indigo/50 hover:bg-indigo-surface/20 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="font-bold text-xs text-ink group-hover:text-indigo">
                Download Protected Contract Set ({protectedModulesCount} files)
              </div>
              <div className="text-[11px] text-ink-3 mt-0.5">
                Excludes import-only smoke tests; includes only contract assertion suites.
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-indigo shrink-0" />
          </button>

          {activeFile && (
            <button
              type="button"
              onClick={() => onDownload('selected')}
              className="w-full text-left p-3 rounded-lg border border-line hover:border-indigo/50 hover:bg-indigo-surface/20 transition-all flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-xs text-ink group-hover:text-indigo">
                  Download Selected Test File Only
                </div>
                <div className="text-[11px] text-ink-3 mt-0.5 font-mono truncate max-w-sm">
                  {activeFile.display_name || activeFile.safe_test_path}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-indigo shrink-0" />
            </button>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </>
    </Dialog>
  );
};

export default TestDownloadModal;
