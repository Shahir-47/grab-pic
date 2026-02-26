import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: ["/", "/login", "/signup"],
				disallow: ["/dashboard", "/api/"],
			},
		],
		sitemap: "https://grab-pic.vercel.app/sitemap.xml",
	};
}
