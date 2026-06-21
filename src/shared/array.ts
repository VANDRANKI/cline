/**
 * Returns the index of the last element in the array where predicate is true, and -1
 * otherwise.
 * @param array The source array to search in
 * @param predicate find calls predicate once for each element of the array, in descending
 * order, until it finds one where predicate returns true. If such an element is found,
 * findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.
 */
export function findLastIndex<T>(array: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean): number {
	let l = array.length
	while (l--) {
		if (predicate(array[l], l, array)) {
			return l
		}
	}
	return -1
}

/**
 * Returns the last element in the array where predicate is true, or `undefined`
 * if no such element exists.
 *
 * Iterates the array in descending order and returns the first element for which
 * `predicate` returns `true`. This is the value-returning counterpart to
 * {@link findLastIndex}.
 *
 * @param array The source array to search in.
 * @param predicate Called once per element in descending order. The search stops
 *   at the first element for which this returns `true`.
 * @returns The matched element, or `undefined` if none matched.
 */
export function findLast<T>(array: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined {
	const index = findLastIndex(array, predicate)
	return index === -1 ? undefined : array[index]
}

/**
 * Converts a partial or complete stringified JSON array into an actual string array.
 *
 * First attempts a full `JSON.parse`. If that fails (e.g. the string is an
 * incomplete streaming fragment), falls back to a best-effort heuristic:
 * strips the leading `["` and trailing `"]` delimiters, then splits on the
 * JSON array element separator `", "` to recover individual items.
 *
 * @param arrayString A string representation of a JSON string array, which may
 *   be a partial/incomplete fragment from a streaming response.
 * @returns Array of strings parsed from the input. Returns an empty array when
 *   the input is not recognisable as an array fragment.
 */
export function parsePartialArrayString(arrayString: string): string[] {
	try {
		// Try parsing as complete JSON first
		return JSON.parse(arrayString)
	} catch {
		// If JSON parsing fails, handle as partial string
		const trimmed = arrayString.trim()
		if (!trimmed.startsWith('["')) {
			return []
		}

		// Remove leading ["
		let content = trimmed.slice(2)
		// Remove trailing "] if it exists
		content = content.replace(/"]$/, "")
		if (!content) {
			return []
		}

		// Split on ", " token and handle the parts
		return content
			.split('", "')
			.map((item) => item.trim())
			.filter(Boolean)
	}
}
