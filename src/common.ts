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
 * Performs initialisation for Cline that is common to all host platforms
 * (VS Code desktop, VS Code web, standalone server, etc.).
 *
 * Runs one-time data migrations, wires up external services, and creates
 * the root {@link WebviewProvider} that owns the chat UI.  The function is
 * intentionally idempotent — calling it more than once per process is safe
 * but wasteful.
 *
 * Migration order matters: {@link StateManager.initialize} must complete
 * before any other service reads global state, and
 * {@link migrateWorkspaceToGlobalStorage} must run before
 * {@link migrateTaskHistoryToFile} because the history migration reads the
 * value moved in the workspace migration.
 *
 * @param context - The VS Code extension context provided by the
 *   `activate()` entry-point.  Used to access global/workspace storage and
 *   subscriptions.
 * @returns A promise that resolves to the fully initialised
 *   {@link WebviewProvider}.  Callers should register it with VS Code
 *   immediately so the sidebar panel can be revealed.
 *
 * @example
 * ```typescript
 * export async function activate(context: vscode.ExtensionContext) {
 *   const webview = await initialize(context);
 *   context.subscriptions.push(
 *     vscode.window.registerWebviewViewProvider('cline.SidebarProvider', webview)
 *   );
 * }
 * ```
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
 * Shows a version-update announcement in the VS Code notification area
 * when the installed extension version differs from the previously stored
 * version, or when the extension is launched for the first time.
 *
 * The announcement is suppressed if the latest announcement ID has already
 * been shown to the user (to avoid repeatedly notifying on the same build).
 *
 * @param context - The VS Code extension context used to read and write
 *   persistent global state keys (`clineVersion`,
 *   `lastShownAnnouncementId`).
 * @returns A promise that resolves when the announcement logic completes.
 *   Errors are caught internally and logged; they do not propagate.
 */
async function showVersionUpdateAnnouncement(context: vscode.ExtensionContext) {
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
 * Performs cleanup when Cline is deactivated — common to all host platforms.
 *
 * Should be called from the extension's `deactivate()` hook.  Disposes
 * services in reverse-dependency order: audio first (no dependents),
 * then telemetry/error services, then the webview instances which may
 * flush pending messages before closing.
 *
 * @returns A promise that resolves when all cleanup tasks have settled.
 *   Individual failures are swallowed by each service's own `dispose()`
 *   implementation to avoid blocking the deactivation sequence.
 *
 * @example
 * ```typescript
 * export async function deactivate() {
 *   await tearDown();
 * }
 * ```
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
