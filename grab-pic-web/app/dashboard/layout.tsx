import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Dashboard",
	description:
		"Manage your GrabPic photo albums. Create new albums, upload photos, and share them with guests.",
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
