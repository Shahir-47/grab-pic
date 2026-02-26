import type { NextConfig } from "next";

const normalizeBaseUrl = (value: string) =>
	value.replace(/\/+$/, "").replace(/\/api$/i, "");

const API_URL = normalizeBaseUrl(
	process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
);
const AI_API_URL = normalizeBaseUrl(
	process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:5000",
);

const nextConfig: NextConfig = {
	async rewrites() {
		return [
			{
				source: "/api/ai/:path*",
				destination: `${AI_API_URL}/:path*`,
			},
			{
				source: "/api/:path*",
				destination: `${API_URL}/api/:path*`,
			},
		];
	},
};

export default nextConfig;
