import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Log In",
	description:
		"Log in to GrabPic to manage your event photo albums. Sign in with email, Google, or GitHub.",
	openGraph: {
		title: "Log In | GrabPic",
		description:
			"Log in to GrabPic to manage your event photo albums.",
	},
	alternates: {
		canonical: "/login",
	},
};

export default function LoginLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
