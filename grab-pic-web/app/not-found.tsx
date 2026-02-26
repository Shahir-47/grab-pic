"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import GrabPicLogo from "@/components/GrabPicLogo";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
	const router = useRouter();

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
			<div className="max-w-md w-full text-center space-y-8">
				{/* Big 404 */}
				<div className="space-y-2">
					<p className="text-8xl font-black tracking-tighter text-zinc-200 dark:text-zinc-800 select-none">
						404
					</p>
					<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						Page not found
					</h1>
					<p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
						The page you&apos;re looking for doesn&apos;t exist or may have been
						moved. Double-check the URL or head back home.
					</p>
				</div>

				{/* Actions */}
				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Button
						onClick={() => router.back()}
						variant="outline"
						className="px-6 py-5 font-semibold"
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Go Back
					</Button>
					<Button
						onClick={() => router.push("/")}
						className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-5 font-semibold"
					>
						<Home className="w-4 h-4 mr-2" />
						Back to Home
					</Button>
				</div>

				{/* Branding */}
				<div className="pt-4">
					<GrabPicLogo size="sm" className="justify-center opacity-40" />
				</div>
			</div>
		</main>
	);
}
