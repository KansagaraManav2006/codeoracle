/**
 * Dialog – shared accessible modal primitive.
 *
 * Features:
 *  • Escape closes the dialog
 *  • Focus is trapped within the dialog while open
 *  • On open, focus is moved to the first focusable child
 *  • On close, focus is restored to the element that triggered the dialog
 *  • Backdrop click closes (opt-out with closeOnBackdrop={false})
 *  • Body scroll is locked while the dialog is open
 *  • Supports aria-labelledby + aria-describedby via titleId/descriptionId props
 *  • Renders into a portal (document.body) so z-index stacking is reliable
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.closest('[aria-hidden="true"]') && el.offsetParent !== null
  );
}

export interface DialogProps {
  /** Whether the dialog is currently open */
  isOpen: boolean;
  /** Called to request the dialog to close */
  onClose: () => void;
  /** Dialog panel content */
  children: ReactNode;
  /**
   * Element id that labels the dialog (matches the id on your heading element).
   * Passed as aria-labelledby on the dialog role element.
   */
  titleId?: string;
  /**
   * Element id that describes the dialog.
   * Passed as aria-describedby on the dialog role element.
   */
  descriptionId?: string;
  /** Additional className for the outer backdrop/overlay div */
  backdropClassName?: string;
  /** Additional className for the inner panel div */
  panelClassName?: string;
  /**
   * If false, clicking the backdrop will NOT close the dialog.
   * Defaults to true.
   */
  closeOnBackdrop?: boolean;
  /**
   * aria-label for cases where there is no visible title element and
   * titleId cannot be used.
   */
  ariaLabel?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  children,
  titleId,
  descriptionId,
  backdropClassName,
  panelClassName,
  closeOnBackdrop = true,
  ariaLabel,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // Track the element that had focus when the dialog opened so we can restore it
  const triggerRef = useRef<Element | null>(null);

  // --- Focus management & scroll lock ---
  useEffect(() => {
    if (!isOpen) return;

    // Capture trigger
    triggerRef.current = document.activeElement;

    // Lock body scroll
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog on next frame so the panel is rendered
    const frameId = requestAnimationFrame(() => {
      if (!panelRef.current) return;
      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        panelRef.current.focus();
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      // Restore focus to the trigger element
      if (triggerRef.current && (triggerRef.current as HTMLElement).focus) {
        (triggerRef.current as HTMLElement).focus();
      }
    };
  }, [isOpen]);

  // --- Escape key ---
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // --- Focus trap ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  if (!isOpen) return null;

  const dialog = (
    // Backdrop
    <div
      className={
        backdropClassName ??
        'fixed inset-0 z-modal flex items-center justify-center p-4 bg-ink/50 backdrop-blur-[6px] animate-[fade-in_150ms_ease-out]'
      }
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-label={!titleId ? ariaLabel : undefined}
        // tabIndex so the panel itself is focusable when there are no focusable children
        tabIndex={-1}
        className={panelClassName}
        onKeyDown={handleKeyDown}
        // Stop clicks inside the panel from hitting the backdrop
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default Dialog;
