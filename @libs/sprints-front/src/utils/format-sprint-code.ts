export function formatSprintCode(number: number): string {
  return `sprint-${String(number).padStart(3, "0")}`;
}
