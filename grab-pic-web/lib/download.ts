const IMAGE_PROXY_PATH = "/proxy-image";

async function fetchImageDirect(url: string): Promise<Blob> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Image fetch failed: ${response.status}`);
	}
	return response.blob();
}

async function fetchImageViaProxy(url: string): Promise<Blob> {
	const response = await fetch(IMAGE_PROXY_PATH, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url }),
	});
	if (!response.ok) {
		throw new Error(`Image proxy fetch failed: ${response.status}`);
	}
	return response.blob();
}

export async function fetchImageAsBlob(url: string): Promise<Blob> {
	try {
		return await fetchImageDirect(url);
	} catch {
		return fetchImageViaProxy(url);
	}
}

export async function downloadImage(url: string, filename: string) {
	const blob = await fetchImageAsBlob(url);
	const blobUrl = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = blobUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(blobUrl);
}
