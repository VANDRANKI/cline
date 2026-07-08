import prettyBytes from "pretty-bytes"

/**
 * Formats a large number using b/m/k suffixes (billions, millions, thousands).
 * @param num - The number to format
 * @returns The abbreviated number as a string, e.g. "1.5m"
 */
export function formatLargeNumber(num: number): string {
	if (num >= 1e9) {
		return (num / 1e9).toFixed(1) + "b"
	}
	if (num >= 1e6) {
		return (num / 1e6).toFixed(1) + "m"
	}
	if (num >= 1e3) {
		return (num / 1e3).toFixed(1) + "k"
	}
	return num.toString()
}

/**
 * Formats cents as a dollar amount with 2 decimal places.
 * @param cents - The amount in cents, or undefined
 * @returns The dollar amount as a string (e.g. "1.23"), or an empty string if `cents` is undefined
 */
export function formatDollars(cents?: number): string {
	if (cents === undefined) {
		return ""
	}

	return (cents / 100).toFixed(2)
}

/**
 * Converts microcredits to credits for display purposes.
 *
 * The backend stores credit balances in microcredits (1 credit = 10,000 microcredits)
 * to avoid floating point precision issues when performing calculations.
 * This function converts the microcredits back to the user-facing credit amount.
 *
 * @param microcredits - The balance in microcredits from the backend
 * @returns The balance in credits (typically displayed with 4 decimal places)
 *
 * @example
 * formatCreditsBalance(50000) // returns 5.0000 (credits)
 * formatCreditsBalance(12345) // returns 1.2345 (credits)
 */
export function formatCreditsBalance(microcredits: number): number {
	return microcredits / 10000
}

/**
 * Formats an ISO timestamp string as a localized date/time (e.g. "07/08/26, 1:23 PM").
 * @param timestamp - An ISO 8601 timestamp string
 * @returns The formatted date/time string
 */
export function formatTimestamp(timestamp: string): string {
	const date = new Date(timestamp)

	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		month: "2-digit",
		day: "2-digit",
		year: "2-digit",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	})

	return dateFormatter.format(date)
}

/**
 * Formats a byte count as a human-readable size string.
 * @param bytes - The size in bytes, or undefined
 * @returns The formatted size (e.g. "1.2 MB"), or "--kb" if `bytes` is undefined
 */
export function formatSize(bytes?: number) {
	if (bytes === undefined) {
		return "--kb"
	}

	return prettyBytes(bytes)
}

/**
 * Formats a duration in seconds as a "minutes:seconds" string.
 * @param seconds - The duration in seconds, or undefined
 * @returns The formatted duration (e.g. "1:05"), or "--:--" if `seconds` is undefined
 */
export function formatSeconds(seconds?: number): string {
	if (seconds === undefined) {
		return "--:--"
	}

	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0")

	return `${mins}:${secs}`
}
