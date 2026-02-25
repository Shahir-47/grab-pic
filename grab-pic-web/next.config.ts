import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		return [
			{
				source: "/api/ai/:path*",
				destination: "http://10.0.2.2:5000/:path*",
			},
			{
				source: "/api/:path*",
				destination: "http://localhost:8080/api/:path*",
			},
		];
	},
};

export default nextConfig;
