'use client';

import { Fragment } from "react";

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
}

/**
 * Clickable breadcrumb navigation.
 *
 * All segments except the last are rendered as muted, clickable links.
 * The last segment is the current page (white, non-interactive).
 */
export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-base">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && (
              <span className="text-[var(--text-subtle)] select-none">/</span>
            )}
            {isLast ? (
              <span className="text-white">{seg.label}</span>
            ) : (
              <button
                type="button"
                onClick={seg.onClick}
                className="text-[var(--text-subtle)] hover:text-white transition-colors"
              >
                {seg.label}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
