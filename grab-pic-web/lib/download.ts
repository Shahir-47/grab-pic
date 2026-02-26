export async function fetchImageAsBlob(url: string): Promise<Blob> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Image fetch failed: ${response.status}`);
	}
	return response.blob();
}

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
		window.open(url, "_blank");
	}
}
