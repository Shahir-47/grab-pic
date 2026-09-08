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
		default: "GrabPic: Event Photo Sharing with Face Search",
		template: "%s | GrabPic",
	},
	description:
		"Upload the photos from your event and share one link. Guests take a selfie and get back the photos they appear in. Photos are protected by default, or public if you want everyone to see them.",
	keywords: [
		"event photos",
		"photo sharing app",
		"wedding photo sharing",
		"find my photos",
		"selfie photo finder",
		"face recognition",
		"event photography",
		"GrabPic",
	],
	openGraph: {
		title: "GrabPic: Event Photo Sharing with Face Search",
		description:
			"Upload the photos from your event, share one link, and each guest finds the photos they appear in with a selfie.",
		type: "website",
		siteName: "GrabPic",
		url: SITE_URL,
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: "GrabPic: Event Photo Sharing with Face Search",
		description:
			"Upload the photos from your event, share one link, and each guest finds the photos they appear in with a selfie.",
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
								"Event photo sharing with face search. Upload the photos, share one link, and each guest finds their own with a selfie. Photos can be switched between public and protected at any time.",
							applicationCategory: "PhotographyApplication",
							operatingSystem: "Web",
							offers: {
								"@type": "Offer",
								price: "0",
								priceCurrency: "USD",
							},
							featureList: [
								"Photo matching by facial recognition",
								"Selfie-based photo search",
								"Bulk ZIP photo downloads",
								"Public and protected photo privacy modes",
								"Re-queues photos for scanning when switched to protected",
								"Selfie camera in the browser",
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
