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

const SITE_URL = "https://grab-pic.vercel.app";

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: "GrabPic — AI Photo Sharing for Events",
		template: "%s | GrabPic",
	},
	description:
		"Upload event photos, share one link, and let each guest take a selfie to instantly find every photo they appear in. Use public and protected privacy modes, and auto-scan newly protected photos with AI.",
	keywords: [
		"event photos",
		"AI photo sharing",
		"facial recognition photo app",
		"wedding photo sharing",
		"photo sharing app",
		"find my photos",
		"selfie photo finder",
		"event photography",
		"GrabPic",
		"face recognition",
		"bulk photo download",
		"guest photo sharing",
	],
	openGraph: {
		title: "GrabPic — AI Photo Sharing for Events",
		description:
			"Upload event photos, share one link, and each guest finds exactly the photos they appear in with a selfie. Public/protected modes included.",
		type: "website",
		siteName: "GrabPic",
		url: SITE_URL,
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: "GrabPic — AI Photo Sharing for Events",
		description:
			"Upload event photos, share one link, and each guest finds exactly the photos they appear in with a selfie. Public/protected modes included.",
		creator: "@grabpic",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	alternates: {
		canonical: SITE_URL,
	},
	category: "technology",
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
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "WebApplication",
							name: "GrabPic",
							url: "https://grab-pic.vercel.app",
							description:
								"AI-powered event photo sharing with facial recognition. Upload event photos, share one link, and each guest finds their photos with a selfie. Switch photos between public and protected anytime.",
							applicationCategory: "PhotographyApplication",
							operatingSystem: "Web",
							offers: {
								"@type": "Offer",
								price: "0",
								priceCurrency: "USD",
							},
							featureList: [
								"AI facial recognition photo matching",
								"Instant selfie-based photo search",
								"Bulk ZIP photo downloads",
								"Public and protected photo privacy modes",
								"Automatic AI re-queue when switching photos to protected",
								"Built-in selfie camera",
								"QR code album sharing",
								"No guest account required",
							],
						}),
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
