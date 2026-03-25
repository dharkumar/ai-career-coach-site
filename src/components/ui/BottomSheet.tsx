'use client';

import { motion } from "motion/react";

interface OverlayProps {
  modal?: false;
  children: React.ReactNode;
  /** Distance from the bottom of the screen in px. Default 88 (above BottomNav). */
  bottomOffset?: number;
  /** Called when the area outside the card is tapped. */
  onClose?: () => void;
}

interface ModalProps {
  modal: true;
  children: React.ReactNode;
  /** Called when the backdrop is tapped. */
  onClose?: () => void;
  bottomOffset?: never;
}

type BottomSheetProps = OverlayProps | ModalProps;

/**
 * Shared bottom sheet primitive.
 *
 * Two variants:
 *
 * - **Overlay** (`modal={false}`, default) — `absolute inset-0 pointer-events-none`
 *   wrapper; the card floats at `bottom: bottomOffset` (default 88px, above BottomNav)
 *   and slides in from `y: 60`. Card styling is left entirely to the children.
 *
 * - **Modal** (`modal={true}`) — `fixed inset-0` dark backdrop with blur; the sheet
 *   slides in from `y: "100%"`. Includes a drag handle above the children. Closes on
 *   backdrop tap if `onClose` is provided.
 *
 * Used by: ProfileSheet (overlay), CandidateSheet (overlay), JobDetailSheet (modal).
 */
export function BottomSheet(props: BottomSheetProps) {
  if (props.modal) {
    const { children, onClose } = props;

    return (
      <motion.div
        data-testid="bottom-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
        onClick={onClose}
      >
        <motion.div
          data-testid="bottom-sheet-modal"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.45 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
          </div>
          {children}
        </motion.div>
      </motion.div>
    );
  }

  const { children, bottomOffset = 88, onClose } = props;

  return (
    <motion.div
      data-testid="bottom-sheet-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`absolute inset-0 ${onClose ? "pointer-events-auto" : "pointer-events-none"}`}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
        className="absolute left-4 right-4 pointer-events-auto"
        style={{ bottom: bottomOffset }}
        onClick={onClose ? (e) => e.stopPropagation() : undefined}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
