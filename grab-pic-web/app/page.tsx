"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
	Shield,
	Share2,
	Loader2,
	ScanFace,
	Download,
	Upload,
	Camera,
	Users,
	Lock,
	Globe,
	ArrowRight,
	CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GrabPicLogo from "@/components/GrabPicLogo";

export default function Home() {
	const router = useRouter();
	const [isChecking, setIsChecking] = useState(true);

	useEffect(() => {
		const check = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (session) {
				router.replace("/dashboard");
			} else {
				setIsChecking(false);
			}
		};
		check();
	}, [router]);

	if (isChecking) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
				<Loader2 className="w-10 h-10 animate-spin text-violet-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
			{/* ── HERO ── */}
			<section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 space-y-10">
				<GrabPicLogo size="xl" showText={false} />

				<div className="space-y-5 max-w-2xl">
					<h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-[1.05]">
						The smartest way to{" "}
						<span className="text-violet-600 dark:text-violet-400">
							share event photos
						</span>
					</h1>
					<p className="text-lg sm:text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto">
						Upload your event photos and GrabPic finds every face. Each guest
						gets a link, takes a quick selfie, and sees just the photos
						they&apos;re in.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 pt-2">
					<Button
						onClick={() => router.push("/signup")}
						className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-6 text-base font-bold shadow-lg"
					>
						Get Started Free
						<ArrowRight className="w-4 h-4 ml-2" />
					</Button>
					<Button
						variant="outline"
						onClick={() => router.push("/login")}
						className="px-8 py-6 text-base font-bold border-zinc-300 dark:border-zinc-700"
					>
						Sign In
					</Button>
				</div>

				<p className="text-xs text-zinc-400 dark:text-zinc-500">
					Free for up to 500 photos per album. No watermarks.
				</p>
			</section>

			{/* ── HOW IT WORKS ── */}
			<section className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
				<div className="max-w-5xl mx-auto px-6 py-20">
					<div className="text-center mb-14">
						<p className="text-sm font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
							How it works
						</p>
						<h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
							Three steps. Done in minutes.
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{[
							{
								step: "1",
								icon: Upload,
								title: "Upload your photos",
								desc: "Drag and drop all photos from your event into an album. Set each photo as public or AI-protected.",
							},
							{
								step: "2",
								icon: ScanFace,
								title: "AI scans every face",
								desc: "GrabPic picks up every face in every photo on its own. You don't have to tag anything.",
							},
							{
								step: "3",
								icon: Share2,
								title: "Share a single link",
								desc: "Send one link to all your guests. Each person takes a selfie and instantly sees only the photos they appear in.",
							},
						].map((item) => (
							<div
								key={item.step}
								className="relative bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 text-center space-y-4"
							>
								<div className="w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center mx-auto text-sm font-black">
									{item.step}
								</div>
								<item.icon className="w-8 h-8 text-violet-500 mx-auto" />
								<h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
									{item.title}
								</h3>
								<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
									{item.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── FEATURES ── */}
			<section className="max-w-5xl mx-auto px-6 py-20">
				<div className="text-center mb-14">
					<p className="text-sm font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
						Built for real events
					</p>
					<h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
						Simple tools for a real problem
					</h2>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{[
						{
							icon: ScanFace,
							title: "AI Face Matching",
							desc: "Guests take one selfie and GrabPic pulls up every photo they appear in across the whole album.",
							color: "text-violet-500",
						},
						{
							icon: Lock,
							title: "Privacy by Default",
							desc: "Every photo is protected by default. Only the people actually in a photo can see it.",
							color: "text-emerald-500",
						},
						{
							icon: Globe,
							title: "Public & Protected Modes",
							desc: "Mark landscape shots or group photos as Public for everyone to see. Keep candid shots AI-protected.",
							color: "text-blue-500",
						},
						{
							icon: Download,
							title: "Bulk Zip Downloads",
							desc: "Guests can select their photos and download them all at once as a zip file. No sign-up required for guests.",
							color: "text-amber-500",
						},
						{
							icon: Camera,
							title: "Built-in Selfie Camera",
							desc: "Guests don't need to upload a file. They can take a selfie right from the browser on any device.",
							color: "text-pink-500",
						},
						{
							icon: Users,
							title: "Unlimited Guests",
							desc: "Share one link. Every guest gets their own personalized experience without creating an account.",
							color: "text-cyan-500",
						},
					].map((feature) => (
						<div
							key={feature.title}
							className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3"
						>
							<feature.icon className={`w-6 h-6 ${feature.color}`} />
							<h3 className="font-bold text-zinc-900 dark:text-zinc-50">
								{feature.title}
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
								{feature.desc}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* ── USE CASES ── */}
			<section className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
				<div className="max-w-4xl mx-auto px-6 py-20 text-center">
					<p className="text-sm font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
						Perfect for
					</p>
					<h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mb-10">
						Any event with a camera
					</h2>

					<div className="flex flex-wrap justify-center gap-3">
						{[
							"Weddings",
							"Birthday Parties",
							"Corporate Events",
							"Conferences",
							"Graduations",
							"Family Reunions",
							"Concerts & Festivals",
							"Team Retreats",
						].map((useCase) => (
							<span
								key={useCase}
								className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
							>
								<CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
								{useCase}
							</span>
						))}
					</div>
				</div>
			</section>

			{/* ── FINAL CTA ── */}
			<section className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
				<h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
					Stop texting photos one by one
				</h2>
				<p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
					Set up your first album in under a minute. Your guests will love it.
				</p>
				<Button
					onClick={() => router.push("/signup")}
					className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-6 text-base font-bold shadow-lg"
				>
					Get Started Free
					<ArrowRight className="w-4 h-4 ml-2" />
				</Button>
			</section>

			{/* ── FOOTER ── */}
			<footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-2">
				<GrabPicLogo size="sm" className="justify-center" />
				<p>© {new Date().getFullYear()} GrabPic. Photo sharing for events.</p>
			</footer>
		</div>
	);
}
