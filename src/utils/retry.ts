/**
 * TypeScript equivalent of the Go common.RetryOperation utility
 * Performs an operation with retry logic and timeout handling
 */
export async function retryOperation<T>(maxRetries: number, timeoutPerAttempt: number, operation: () => Promise<T>): Promise<T> {
	let lastError: Error | undefined

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		let timeoutId: ReturnType<typeof setTimeout> | undefined
		try {
			// Create a timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => reject(new Error("Operation timeout")), timeoutPerAttempt)
			})

			// Race the operation against timeout
			const result = await Promise.race([operation(), timeoutPromise])
			return result // Success - return result
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))

			if (attempt < maxRetries) {
				// Brief delay before retry
				await new Promise((resolve) => setTimeout(resolve, 500))
			}
		} finally {
			// Clear the timeout so it doesn't fire (and reject an unobserved promise) after
			// the operation has already settled, and so it doesn't keep the event loop alive.
			clearTimeout(timeoutId)
		}
	}

	throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError?.message}`)
}
