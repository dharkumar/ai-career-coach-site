export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function levelLabel(level: string): string {
  return capitalize(level.replace(/_/g, " "));
}
