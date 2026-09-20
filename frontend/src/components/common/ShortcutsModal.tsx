import React, { useEffect, useRef } from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: '1 – 5', description: 'Switch between workspace tabs in order' },
    { key: '/', description: 'Focus search input on active view' },
    { key: 'c', description: 'Copy code or proposal in active viewer' },
    { key: 'g', description: 'Toggle dependency cycle highlighting' },
    { key: '?', description: 'Open this keyboard shortcuts reference' },
    { key: 'Esc', description: 'Close modal or clear current selection' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-ink/40 backdrop-blur-[6px] animate-[fade-up_250ms_ease-sheet_both]"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[480px] bg-surface rounded-xl border border-line shadow-4 p-6 sm:p-7 relative"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-tile flex items-center justify-center text-ink-2">
              <Command className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h2 id="shortcuts-title" className="font-display font-bold text-lg text-ink">
              Keyboard Shortcuts
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-3 hover:text-ink hover:bg-tile transition-colors"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 border-b border-line/60 last:border-0"
            >
              <span className="text-[13px] text-ink-2 font-sans">{item.description}</span>
              <kbd className="px-2.5 py-1 bg-tile border border-line rounded-xs font-mono text-xs font-bold text-ink num shadow-1">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-line text-center text-xs text-ink-3">
          Shortcuts are automatically disabled while typing in text inputs.
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
