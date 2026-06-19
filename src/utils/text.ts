/**
 * Text processing utilities for Cline.
 *
 * Lightweight string helpers used across the extension host and webview.
 */

/**
 * Truncate a string to a maximum length, appending an ellipsis if cut.
 *
 * @param text - The input string.
 * @param maxLength - Maximum character count (default: 200).
 * @param ellipsis - String appended on truncation (default: "…").
 * @returns The original string if short enough, or a truncated version.
 */
export function truncate(
  text: string,
  maxLength: number = 200,
  ellipsis: string = "…"
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Count the approximate number of tokens in a string.
 *
 * Uses a simple heuristic: 1 token ≈ 4 characters. Sufficient for
 * budget checks; use a real tokenizer for precise counts.
 *
 * @param text - The text to measure.
 * @returns Approximate token count.
 */
export function approximateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Escape special characters in a string for safe inclusion in a regex.
 *
 * @param text - The string to escape.
 * @returns A regex-safe version of the input.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
