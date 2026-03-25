export type FitCategory = "good-fit" | "stretch" | "grow-into";

export interface FitInfo {
  category: FitCategory;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const FIT_MAP: Record<FitCategory, FitInfo> = {
  "good-fit": {
    category: "good-fit",
    label: "Good fit",
    color: "#00d492",
    bgColor: "rgba(0, 188, 125, 0.1)",
    borderColor: "rgba(0, 188, 125, 0.2)",
  },
  stretch: {
    category: "stretch",
    label: "Worth the stretch",
    color: "#51a2ff",
    bgColor: "rgba(81, 162, 255, 0.12)",
    borderColor: "rgba(81, 162, 255, 0.3)",
  },
  "grow-into": {
    category: "grow-into",
    label: "Grow into",
    color: "#a78bfa",
    bgColor: "rgba(167, 139, 250, 0.12)",
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
};

export function categorizeFit(score: number): FitInfo {
  if (score >= 75) return FIT_MAP["good-fit"];
  if (score >= 55) return FIT_MAP["stretch"];
  return FIT_MAP["grow-into"];
}

export function getFitInfo(category: FitCategory): FitInfo {
  return FIT_MAP[category];
}
