/**
 * Performs an async operation with retry logic and per-attempt timeout handling.
 *
 * Equivalent to the Go `common.RetryOperation` utility. Each attempt races the
 * operation against a timeout promise; if the operation resolves before the
 * timeout, its result is returned immediately. If the operation rejects or the
 * timeout fires, the attempt is counted as a failure. A fixed 500 ms delay is
 * inserted between consecutive attempts.
 *
 * @param maxRetries - Maximum number of attempts before giving up (must be >= 1).
 * @param timeoutPerAttempt - Milliseconds to wait for a single attempt before
 *   treating it as a timeout failure.
 * @param operation - Async factory that produces the work to perform. It is
 *   called once per attempt.
 * @returns The resolved value of the first successful attempt.
 * @throws {Error} If every attempt fails or times out, throws with a message
 *   that includes the attempt count and the last error message.
 */
export async function retryOperation<T>(maxRetries: number, timeoutPerAttempt: number, operation: () => Promise<T>): Promise<T> {
	let lastError: Error | undefined

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Create a timeout promise
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Operation timeout")), timeoutPerAttempt),
			)

			// Race the operation against timeout
			const result = await Promise.race([operation(), timeoutPromise])
			return result // Success - return result
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))

			if (attempt < maxRetries) {
				// Brief delay before retry
				await new Promise((resolve) => setTimeout(resolve, 500))
			}
		}
	}

	throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError?.message}`)
}
