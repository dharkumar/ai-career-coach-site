'use client';

import { motion } from "motion/react";

interface QuestionBubbleProps {
  text: string;
  className?: string;
}

export function QuestionBubble({ text, className = "" }: QuestionBubbleProps) {
  return (
    <motion.div
      data-testid="question-bubble"
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      /* Figma: bg-[rgba(39,39,42,0.5)], rounded-[100px], px-[16px] py-[12px], inline-flex centered */
      className={`inline-flex items-center justify-center bg-[var(--surface-muted)]/60 rounded-[100px] px-[16px] py-[12px] mx-auto ${className}`}
      style={{ display: "flex" }}
    >
      <p data-testid="question-bubble-text" className="text-[var(--text-secondary)] text-[16px] font-normal leading-5 text-center whitespace-wrap">
        {text}
      </p>
    </motion.div>
  );
}
