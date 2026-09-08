import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Find Your Photos",
	description:
		"Take a selfie to find the photos you appear in. Your face is matched against the whole album, and you can download what comes back as a ZIP.",
	openGraph: {
		title: "Find Your Photos | GrabPic",
		description:
			"Take a selfie to find the event photos you appear in.",
	},
	twitter: {
		card: "summary_large_image",
		title: "Find Your Photos | GrabPic",
		description:
			"Take a selfie to find the event photos you appear in.",
	},
};

export default function GuestLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
