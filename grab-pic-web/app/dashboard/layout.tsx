import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Dashboard",
	description:
		"Your GrabPic albums. Create an album, upload photos, and share the link with your guests.",
	robots: {
		index: false,
		follow: false,
	},
};

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
