/**
 * Fetches an image blob through our server-side proxy to avoid CORS issues
 * with S3 presigned URLs.
 */
export async function fetchImageAsBlob(url: string): Promise<Blob> {
	const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(url)}`;
	const response = await fetch(proxyUrl);
	if (!response.ok) {
		throw new Error(`Proxy fetch failed: ${response.status}`);
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
