"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
	Shield,
	Share2,
	ScanFace,
	Download,
	Upload,
	Camera,
	Users,
	Lock,
	Globe,
	ArrowRight,
	CheckCircle2,
	LayoutDashboard,
	Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GrabPicLogo from "@/components/GrabPicLogo";

export default function Home() {
	const router = useRouter();
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	useEffect(() => {
		const check = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setIsLoggedIn(!!session);
		};
		check();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setIsLoggedIn(!!session);
		});

		return () => subscription.unsubscribe();
	}, []);

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
			<section aria-label="Hero" className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 space-y-10">
				<GrabPicLogo size="xl" showText={false} />

				<div className="space-y-5 max-w-2xl">
					<h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-[1.05]">
						Everyone gets{" "}
						<span className="text-violet-600 dark:text-violet-400">
							their own photos
						</span>
					</h1>
					<p className="text-lg sm:text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto">
						Upload the photos from your event, then send one link. Guests take a
						selfie and get back the shots they&apos;re actually in, without
						digging through the other four hundred.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 pt-2">
					{isLoggedIn ? (
						<>
							<Button
								onClick={() => router.push("/dashboard")}
								className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-6 text-base font-bold shadow-lg"
							>
								<LayoutDashboard className="w-4 h-4 mr-2" />
								Go to Dashboard
							</Button>
							<Button
								variant="outline"
								onClick={() => router.push("/dashboard")}
								className="px-8 py-6 text-base font-bold border-zinc-300 dark:border-zinc-700"
							>
								<Plus className="w-4 h-4 mr-2" />
								Create an Album
							</Button>
						</>
					) : (
						<>
							<Button
								onClick={() => router.push("/signup")}
								className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-6 text-base font-bold shadow-lg"
							>
								Create an account
								<ArrowRight className="w-4 h-4 ml-2" />
							</Button>
							<Button
								variant="outline"
								onClick={() => router.push("/login")}
								className="px-8 py-6 text-base font-bold border-zinc-300 dark:border-zinc-700"
							>
								Sign In
							</Button>
						</>
					)}
				</div>

				<p className="text-xs text-zinc-400 dark:text-zinc-500">
					Free up to 500 photos. No watermarks.
				</p>
			</section>

			<section aria-label="How it works" className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
				<div className="max-w-5xl mx-auto px-6 py-20">
					<div className="text-center mb-14">
						<h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
							How it works
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{[
							{
								step: "1",
								icon: Upload,
								title: "Upload the photos",
								desc: "Drop the whole event into an album. Each photo is either public, meaning anyone with the link sees it, or protected, meaning only the people in it do. You can switch a photo over later and it gets scanned then.",
							},
							{
								step: "2",
								icon: ScanFace,
								title: "Faces get matched",
								desc: "A background job finds the faces in each photo as it lands. There is nothing to tag and nothing to sort.",
							},
							{
								step: "3",
								icon: Share2,
								title: "Send one link",
								desc: "Everyone gets the same link. They take a selfie, and what comes back is only the photos with them in it.",
							},
						].map((item) => (
							<div
								key={item.step}
								className="relative bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 text-center space-y-5"
							>
								<div className="relative w-16 h-16 mx-auto">
									<div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center">
										<item.icon className="w-7 h-7 text-violet-600 dark:text-violet-400" />
									</div>
									<span className="absolute -top-2 -right-2 w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-md">
										{item.step}
									</span>
								</div>
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

			<section aria-label="Features" className="max-w-5xl mx-auto px-6 py-20">
				<div className="text-center mb-14">
					<h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
						What you get
					</h2>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{[
						{
							icon: ScanFace,
							title: "Face search",
							desc: "One selfie is enough. It runs against every face in the album and returns the matches.",
							color: "text-violet-500",
						},
						{
							icon: Lock,
							title: "Protected by default",
							desc: "A photo you upload is private until someone's face matches it. You have to opt a photo out, not in.",
							color: "text-emerald-500",
						},
						{
							icon: Globe,
							title: "Public photos too",
							desc: "Venue shots and wide crowd shots can be public, visible to anyone with the link. Flip a photo back to protected and it gets queued for scanning again.",
							color: "text-blue-500",
						},
						{
							icon: Download,
							title: "Zip downloads",
							desc: "Select a few photos or take the lot, and they come down as one zip.",
							color: "text-amber-500",
						},
						{
							icon: Camera,
							title: "Camera in the browser",
							desc: "Nothing to install and no file to find. The selfie is taken on the page, on a phone or a laptop.",
							color: "text-pink-500",
						},
						{
							icon: Users,
							title: "No guest accounts",
							desc: "Guests never sign up for anything. Share the link with as many people as you like.",
							color: "text-cyan-500",
						},
					].map((feature) => (
						<div
							key={feature.title}
							className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4"
						>
							<div className="w-11 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
								<feature.icon className={`w-5 h-5 ${feature.color}`} />
							</div>
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

			<section aria-label="Use cases" className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
				<div className="max-w-4xl mx-auto px-6 py-20 text-center">
					<h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mb-10">
						Where people use it
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

			<section aria-label="Call to action" className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
				<h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
					{isLoggedIn
						? "Got another event coming up?"
						: "Stop texting photos one by one"}
				</h2>
				<p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
					{isLoggedIn
						? "Make an album, upload, send the link."
						: "Making the first album takes about a minute."}
				</p>
				<Button
					onClick={() => router.push(isLoggedIn ? "/dashboard" : "/signup")}
					className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-6 text-base font-bold shadow-lg"
				>
					{isLoggedIn ? (
						<>
							<Plus className="w-4 h-4 mr-2" />
							Create an Album
						</>
					) : (
						<>
							Create an account
							<ArrowRight className="w-4 h-4 ml-2" />
						</>
					)}
				</Button>
			</section>

			<footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-2">
				<GrabPicLogo size="sm" className="justify-center" />
				<p>© {new Date().getFullYear()} GrabPic. Photo sharing for events.</p>
			</footer>
		</main>
	);
}
