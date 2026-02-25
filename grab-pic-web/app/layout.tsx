import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "GrabPic - Photo Sharing for Events",
		template: "%s | GrabPic",
	},
	description:
		"Upload event photos, share one link, and let each guest take a selfie to find the photos they're in. No tagging, no scrolling.",
	keywords: [
		"event photos",
		"AI photo sharing",
		"face recognition",
		"wedding photos",
		"photo sharing app",
		"GrabPic",
	],
	openGraph: {
		title: "GrabPic - Photo Sharing for Events",
		description:
			"Upload event photos, share one link, and each guest finds exactly the photos they're in.",
		type: "website",
		siteName: "GrabPic",
	},
	twitter: {
		card: "summary_large_image",
		title: "GrabPic - Photo Sharing for Events",
		description:
			"Upload event photos, share one link, and each guest finds exactly the photos they're in.",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
					}}
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Navbar />
				{children}
				<Analytics />
			</body>
		</html>
	);
}
