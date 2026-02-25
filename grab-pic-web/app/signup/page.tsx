"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useRedirectIfAuth } from "@/lib/useRequireAuth";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import GrabPicLogo from "@/components/GrabPicLogo";

export default function SignUpPage() {
	const { isLoading: isAuthChecking, isAuthenticated } = useRedirectIfAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);

	const handleEmailSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setMessage(null);

		const { error } = await supabase.auth.signUp({
			email,
			password,
		});

		if (error) {
			setMessage({ text: error.message, type: "error" });
		} else {
			setMessage({
				text: "Success! Please check your email for a verification link.",
				type: "success",
			});
			setEmail("");
			setPassword("");
		}
		setLoading(false);
	};

	const handleOAuth = async (provider: "google" | "github") => {
		const { error } = await supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `${window.location.origin}/dashboard`,
			},
		});
		if (error) {
			console.error(`${provider} Auth Error:`, error.message);
			setMessage({
				text: `Failed to connect with ${provider}.`,
				type: "error",
			});
		}
	};

	if (isAuthChecking || isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
				<Loader2 className="w-10 h-10 animate-spin text-violet-600" />
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
			<div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
				{/* Branding Section */}
				<div className="flex flex-col items-center text-center space-y-3">
					<GrabPicLogo size="md" />
					<p className="text-zinc-500 dark:text-zinc-400 max-w-72 text-sm">
						Share event photos and let your guests find themselves with a
						selfie.
					</p>
				</div>

				{/* OAuth Providers */}
				<div className="grid grid-cols-2 gap-3">
					<Button
						variant="outline"
						onClick={() => handleOAuth("google")}
						className="rounded-xl border-zinc-200"
					>
						<svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="currentColor"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="currentColor"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="currentColor"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Google
					</Button>
					<Button
						variant="outline"
						onClick={() => handleOAuth("github")}
						className="rounded-xl border-zinc-200"
					>
						<svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
							/>
						</svg>
						GitHub
					</Button>
				</div>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t border-zinc-200 dark:border-zinc-700" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">
							Or use email
						</span>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleEmailSignUp} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="shahir@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="rounded-xl"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="rounded-xl"
						/>
					</div>

					{message && (
						<div
							className={`text-sm p-3 rounded-xl border ${message.type === "error" ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-600 border-green-200"}`}
						>
							{message.text}
						</div>
					)}

					<Button
						type="submit"
						className="w-full h-11 rounded-xl font-semibold bg-violet-600 hover:bg-violet-700 text-white"
						disabled={loading}
					>
						{loading ? "Creating account..." : "Join GrabPic"}
					</Button>
				</form>

				<div className="text-center text-sm text-zinc-500">
					Already part of the party?{" "}
					<Link
						href="/login"
						className="font-bold text-zinc-900 dark:text-zinc-50 hover:underline"
					>
						Log in
					</Link>
				</div>
			</div>
		</div>
	);
}
