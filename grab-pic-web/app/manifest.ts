import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "GrabPic: Event Photo Sharing with Face Search",
		short_name: "GrabPic",
		description:
			"Upload the photos from your event and share one link. Guests take a selfie and get back the photos they appear in.",
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
