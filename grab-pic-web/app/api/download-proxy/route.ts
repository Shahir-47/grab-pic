import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for downloading images from S3 presigned URLs.
 * This avoids CORS issues since the fetch happens on the server, not in the browser.
 */
export async function GET(request: NextRequest) {
	const url = request.nextUrl.searchParams.get("url");
	if (!url) {
		return NextResponse.json(
			{ error: "Missing url parameter" },
			{ status: 400 },
		);
	}

	try {
		const response = await fetch(url);
		if (!response.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch image" },
				{ status: response.status },
			);
		}

		const blob = await response.blob();
		const contentType = response.headers.get("Content-Type") || "image/jpeg";

		return new NextResponse(blob, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "no-store",
			},
		});
	} catch {
		return NextResponse.json({ error: "Proxy fetch failed" }, { status: 500 });
	}
}
