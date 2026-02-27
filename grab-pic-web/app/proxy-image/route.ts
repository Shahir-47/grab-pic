import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ALLOWED_HOSTS = [
	"amazonaws.com",
	"cloudfront.net",
	"sslip.io",
	"localhost",
	"127.0.0.1",
];

const IMAGE_PROXY_ALLOWED_HOSTS = (
	process.env.IMAGE_PROXY_ALLOWED_HOSTS ||
	process.env.NEXT_PUBLIC_IMAGE_PROXY_ALLOWED_HOSTS ||
	DEFAULT_ALLOWED_HOSTS.join(",")
)
	.split(",")
	.map((host) => host.trim().toLowerCase())
	.filter(Boolean);

function isAllowedHost(hostname: string): boolean {
	const normalized = hostname.toLowerCase();
	return IMAGE_PROXY_ALLOWED_HOSTS.some((allowed) => {
		if (normalized === allowed) return true;
		return normalized.endsWith(`.${allowed}`);
	});
}

function parseAndValidateUrl(rawUrl: unknown): URL | null {
	if (typeof rawUrl !== "string" || rawUrl.trim() === "") return null;

	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return null;
	}

	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
	if (!isAllowedHost(parsed.hostname)) return null;

	if (process.env.NODE_ENV === "production" && parsed.protocol === "http:") {
		const host = parsed.hostname.toLowerCase();
		const isLocalHost = host === "localhost" || host === "127.0.0.1";
		if (!isLocalHost) return null;
	}

	return parsed;
}

export async function POST(request: NextRequest) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	const parsedUrl = parseAndValidateUrl((body as { url?: unknown })?.url);
	if (!parsedUrl) {
		return NextResponse.json({ error: "Invalid or disallowed image URL." }, { status: 400 });
	}

	let upstream: Response;
	try {
		upstream = await fetch(parsedUrl.toString(), {
			method: "GET",
			redirect: "follow",
			cache: "no-store",
		});
	} catch {
		return NextResponse.json({ error: "Upstream fetch failed." }, { status: 502 });
	}

	if (!upstream.ok) {
		return NextResponse.json(
			{ error: `Upstream image request failed with ${upstream.status}.` },
			{ status: 502 },
		);
	}

	const contentType =
		upstream.headers.get("content-type") || "application/octet-stream";
	const contentLength = upstream.headers.get("content-length");
	const bytes = await upstream.arrayBuffer();

	return new NextResponse(bytes, {
		status: 200,
		headers: {
			"Content-Type": contentType,
			...(contentLength ? { "Content-Length": contentLength } : {}),
			"Cache-Control": "private, no-store, max-age=0",
		},
	});
}
