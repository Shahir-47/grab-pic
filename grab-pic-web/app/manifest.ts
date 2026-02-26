import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "GrabPic — AI Photo Sharing for Events",
		short_name: "GrabPic",
		description:
			"Upload event photos, share one link, and let each guest take a selfie to find every photo they appear in with public/protected privacy modes.",
		start_url: "/",
		display: "standalone",
		background_color: "#09090b",
		theme_color: "#7c3aed",
		icons: [
			{
				src: "/icon",
				sizes: "32x32",
				type: "image/png",
			},
			{
				src: "/apple-icon",
				sizes: "180x180",
				type: "image/png",
			},
		],
	};
}
