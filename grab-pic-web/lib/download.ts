/**
 * Fetches an image blob directly from S3 (CORS is configured on the bucket).
 * No Vercel proxy needed — data flows straight from S3 to the browser.
 */
export async function fetchImageAsBlob(url: string): Promise<Blob> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Image fetch failed: ${response.status}`);
	}
	return response.blob();
}

/**
 * Triggers a browser download for a single image URL.
 */
export async function downloadImage(url: string, filename: string) {
	try {
		const blob = await fetchImageAsBlob(url);
		const blobUrl = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = blobUrl;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(blobUrl);
	} catch {
		// Fallback: open in a new tab so the user can right-click → save
		window.open(url, "_blank");
	}
}
