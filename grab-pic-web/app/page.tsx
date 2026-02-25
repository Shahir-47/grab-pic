"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Camera, Sparkles, Shield, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
				<Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
			{/* Hero */}
			<main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 space-y-8">
				<div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shadow-inner">
					<Camera className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
				</div>

				<div className="space-y-4 max-w-2xl">
					<h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
						GrabPic
					</h1>
					<p className="text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg mx-auto">
						Upload event photos, let AI find every guest, and share the right
						photos with the right people — automatically.
					</p>
				</div>

				<div className="flex gap-4 pt-4">
					<Button
						onClick={() => router.push("/signup")}
						className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-base font-bold shadow-xl shadow-indigo-500/20"
					>
						Get Started Free
					</Button>
					<Button
						variant="outline"
						onClick={() => router.push("/login")}
						className="px-8 py-6 text-base font-bold"
					>
						Sign In
					</Button>
				</div>

				{/* Feature pills */}
				<div className="flex flex-wrap justify-center gap-4 pt-8 max-w-xl">
					<div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-5 py-2.5 shadow-sm">
						<Sparkles className="w-4 h-4 text-indigo-500" />
						<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
							AI Face Recognition
						</span>
					</div>
					<div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-5 py-2.5 shadow-sm">
						<Shield className="w-4 h-4 text-emerald-500" />
						<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
							Privacy by Default
						</span>
					</div>
					<div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-5 py-2.5 shadow-sm">
						<Share2 className="w-4 h-4 text-blue-500" />
						<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
							One-Link Sharing
						</span>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="text-center py-6 text-xs text-zinc-400">
				© {new Date().getFullYear()} GrabPic. Built with AI.
			</footer>
		</div>
	);
}
