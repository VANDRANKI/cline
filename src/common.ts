import * as vscode from "vscode"
import {
	cleanupMcpMarketplaceCatalogFromGlobalState,
	migrateCustomInstructionsToGlobalRules,
	migrateHooksEnabledToBoolean,
	migrateTaskHistoryToFile,
	migrateWelcomeViewCompleted,
	migrateWorkspaceToGlobalStorage,
} from "./core/storage/state-migrations"
import { WebviewProvider } from "./core/webview"
import { Logger } from "./services/logging/Logger"
import "./utils/path" // necessary to have access to String.prototype.toPosix

import { HostProvider } from "@/hosts/host-provider"
import { FileContextTracker } from "./core/context/context-tracking/FileContextTracker"
import { StateManager } from "./core/storage/StateManager"
import { ExtensionRegistryInfo } from "./registry"
import { BannerService } from "./services/banner/BannerService"
import { audioRecordingService } from "./services/dictation/AudioRecordingService"
import { ErrorService } from "./services/error"
import { featureFlagsService } from "./services/feature-flags"
import { initializeDistinctId } from "./services/logging/distinctId"
import { telemetryService } from "./services/telemetry"
import { PostHogClientProvider } from "./services/telemetry/providers/posthog/PostHogClientProvider"
import { ShowMessageType } from "./shared/proto/host/window"
import { getLatestAnnouncementId } from "./utils/announcements"

/**
 * Performs initialization for Cline that is common to all platforms.
 *
 * This function runs the full startup sequence:
 * 1. Initializes persistent state via `StateManager`
 * 2. Sets up telemetry and feature flags
 * 3. Runs all one-time data migrations (custom instructions, task history, hooks, etc.)
 * 4. Creates and returns the webview provider used to render the Cline panel
 * 5. Displays a version-update announcement if the extension was just updated
 * 6. Fetches active banners from the remote API
 *
 * If `StateManager` initialization fails (e.g., corrupted global state), the function
 * shows an error notification and continues rather than throwing, so the extension can
 * still partially load.
 *
 * @param context - The VS Code extension context provided by the activation event.
 *   Used to read/write global and workspace state, register disposables, and
 *   resolve extension URIs.
 * @returns A promise that resolves to the {@link WebviewProvider} instance responsible
 *   for managing the Cline sidebar panel and its associated controller.
 */
export async function initialize(context: vscode.ExtensionContext): Promise<WebviewProvider> {
	try {
		await StateManager.initialize(context)
	} catch (error) {
		console.error("[Controller] CRITICAL: Failed to initialize StateManager - extension may not function properly:", error)
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Failed to initialize Cline's application state. Please restart the extension.",
		})
	}

	// Set the distinct ID for logging and telemetry
	await initializeDistinctId(context)

	// Initialize PostHog client provider
	PostHogClientProvider.getInstance()

	// Setup the external services
	await ErrorService.initialize()
	await featureFlagsService.poll()

	// Migrate custom instructions to global Cline rules (one-time cleanup)
	await migrateCustomInstructionsToGlobalRules(context)

	// Migrate welcomeViewCompleted setting based on existing API keys (one-time cleanup)
	await migrateWelcomeViewCompleted(context)

	// Migrate workspace storage values back to global storage (reverting previous migration)
	await migrateWorkspaceToGlobalStorage(context)

	// Ensure taskHistory.json exists and migrate legacy state (runs once)
	await migrateTaskHistoryToFile(context)

	// Migrate hooksEnabled from ClineFeatureSetting to boolean (one-time cleanup)
	await migrateHooksEnabledToBoolean(context)

	// Clean up MCP marketplace catalog from global state (moved to disk cache)
	await cleanupMcpMarketplaceCatalogFromGlobalState(context)

	// Clean up orphaned file context warnings (startup cleanup)
	await FileContextTracker.cleanupOrphanedWarnings(context)

	const webview = HostProvider.get().createWebviewProvider()

	await showVersionUpdateAnnouncement(context)

	// Initialize banner service and fetch banners from the API.
	BannerService.initialize(webview.controller).getActiveBanners(true)

	telemetryService.captureExtensionActivated()

	return webview
}

/**
 * Shows a notification to the user when the extension has been updated to a new version.
 *
 * Compares the current extension version (from the extension manifest) against the
 * version stored in global state from the previous session. If they differ — or if no
 * previous version is stored (fresh install) — the function checks whether there is a
 * new announcement to surface. When a new announcement exists, it displays either a
 * "Welcome" message (first install) or an "Updated" message (upgrade), then persists
 * the current version so the notification is not shown again until the next update.
 *
 * @param context - The VS Code extension context used to read and write global state
 *   keys `"clineVersion"` and `"lastShownAnnouncementId"`.
 * @returns A promise that resolves once the version check and any state updates are
 *   complete. Errors during the check are caught and logged; they do not propagate.
 */
async function showVersionUpdateAnnouncement(context: vscode.ExtensionContext): Promise<void> {
	// Version checking for autoupdate notification
	const currentVersion = ExtensionRegistryInfo.version
	const previousVersion = context.globalState.get<string>("clineVersion")
	// Perform post-update actions if necessary
	try {
		if (!previousVersion || currentVersion !== previousVersion) {
			Logger.log(`Cline version changed: ${previousVersion} -> ${currentVersion}. First run or update detected.`)

			// Check if there's a new announcement to show
			const lastShownAnnouncementId = context.globalState.get<string>("lastShownAnnouncementId")
			const latestAnnouncementId = getLatestAnnouncementId()

			if (lastShownAnnouncementId !== latestAnnouncementId) {
				// Show notification when there's a new announcement (major/minor updates or fresh installs)
				const message = previousVersion
					? `Cline has been updated to v${currentVersion}`
					: `Welcome to Cline v${currentVersion}`
				HostProvider.window.showMessage({
					type: ShowMessageType.INFORMATION,
					message,
				})
			}
			// Always update the main version tracker for the next launch.
			await context.globalState.update("clineVersion", currentVersion)
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error(`Error during post-update actions: ${errorMessage}, Stack trace: ${error.stack}`)
	}
}

/**
 * Performs cleanup when Cline is deactivated that is common to all platforms.
 *
 * This function is called by each platform's `deactivate()` hook (VS Code extension
 * host, standalone server, etc.) and ensures resources are released in a consistent
 * order:
 *
 * 1. Stops the audio recording service to prevent orphaned microphone processes.
 * 2. Disposes the PostHog analytics client.
 * 3. Flushes and disposes the telemetry service.
 * 4. Disposes the error reporting service.
 * 5. Stops the feature flags polling loop.
 * 6. Disposes all active {@link WebviewProvider} instances and their associated
 *    controllers, closing any open Cline panels.
 *
 * @returns A promise that resolves once all async disposal steps are complete.
 */
export async function tearDown(): Promise<void> {
	// Clean up audio recording service to ensure no orphaned processes
	audioRecordingService.cleanup()

	PostHogClientProvider.getInstance().dispose()
	telemetryService.dispose()
	ErrorService.get().dispose()
	featureFlagsService.dispose()
	// Dispose all webview instances
	await WebviewProvider.disposeAllInstances()
}
