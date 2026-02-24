import { supabase } from "@/lib/supabase"; // <-- Import the initialized instance directly!

const API_BASE_URL = "http://localhost:8080";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	const headers = new Headers(options.headers);

	if (session?.access_token) {
		headers.set("Authorization", `Bearer ${session.access_token}`);
	}

	if (
		!headers.has("Content-Type") &&
		options.body &&
		typeof options.body === "string"
	) {
		headers.set("Content-Type", "application/json");
	}

	const isFullUrl = endpoint.startsWith("http");
	const url = isFullUrl ? endpoint : `${API_BASE_URL}${endpoint}`;

	return fetch(url, {
		...options,
		headers,
	});
}
