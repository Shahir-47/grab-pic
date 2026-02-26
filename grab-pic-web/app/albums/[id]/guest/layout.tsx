import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Find Your Photos",
	description:
		"Take a selfie to instantly find every photo you appear in. AI-powered facial recognition matches your face across the entire album. Download your photos as a ZIP.",
	openGraph: {
		title: "Find Your Photos | GrabPic",
		description:
			"Take a selfie to instantly find every event photo you appear in. Powered by AI facial recognition.",
	},
	twitter: {
		card: "summary_large_image",
		title: "Find Your Photos | GrabPic",
		description:
			"Take a selfie to instantly find every event photo you appear in. Powered by AI facial recognition.",
	},
};

export default function GuestLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
