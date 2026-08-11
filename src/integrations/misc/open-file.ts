import { writeFile } from "@utils/fs"
import * as os from "os"
import * as path from "path"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"

/**
 * Decodes a base64 image data URI, writes it to a temporary file, and opens it
 * in the host's default viewer for that file type.
 * @param dataUri A base64-encoded image data URI (e.g. `data:image/png;base64,...`)
 */
export async function openImage(dataUri: string) {
	const matches = dataUri.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
	if (!matches) {
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Invalid data URI format",
		})
		return
	}
	const [, format, base64Data] = matches
	const imageBuffer = Buffer.from(base64Data, "base64")
	const tempFilePath = path.join(os.tmpdir(), `temp_image_${Date.now()}.${format}`)
	try {
		await writeFile(tempFilePath, new Uint8Array(imageBuffer))
		await HostProvider.window.openFile({
			filePath: tempFilePath,
		})
	} catch (error) {
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Error opening image: ${error}`,
		})
	}
}

/**
 * Opens a file in the host editor at the given absolute path.
 * @param absolutePath Absolute path to the file to open
 * @param preserveFocus Whether to keep focus on the current editor instead of the newly opened one
 * @param preview Whether to open the file in preview mode
 */
export async function openFile(absolutePath: string, preserveFocus: boolean = false, preview: boolean = false) {
	try {
		await HostProvider.window.showTextDocument({
			path: absolutePath,
			options: { preserveFocus, preview },
		})
	} catch (_error) {
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Could not open file!`,
		})
	}
}
