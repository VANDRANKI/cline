/**
 * Text processing utilities for Cline.
 */

export function truncate(
  text: string,
  maxLength: number = 200,
  ellipsis: string = "…"
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

export function approximateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
