'use client';

import { getFitInfo, type FitCategory } from "@/utils/categorizeFit";

interface FitCategoryPillProps {
  category: FitCategory;
}

export function FitCategoryPill({ category }: FitCategoryPillProps) {
  const { label, color, bgColor, borderColor } = getFitInfo(category);

  return (
    <span
      data-testid="fit-category-pill"
      className="inline-flex items-center justify-center text-[12px] font-medium leading-4 px-[10px] py-[5px] rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      {label}
    </span>
  );
}
