"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, LayoutDashboard, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GrabPicLogo from "@/components/GrabPicLogo";

export default function Navbar() {
	const router = useRouter();
	const pathname = usePathname();
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [userEmail, setUserEmail] = useState<string | null>(null);

	useEffect(() => {
		const checkSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setIsLoggedIn(!!session);
			setUserEmail(session?.user?.email ?? null);
		};
		checkSession();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setIsLoggedIn(!!session);
			setUserEmail(session?.user?.email ?? null);
		});

		return () => subscription.unsubscribe();
	}, []);

	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.push("/login");
	};

	// Don't show the navbar on the guest album page
	const isGuestPage = pathname?.includes("/guest");
	if (isGuestPage) return null;

	return (
		<nav className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
			<div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
				{/* Logo / Brand */}
				<Link
					href={isLoggedIn ? "/dashboard" : "/"}
					className="group transition-transform hover:scale-[1.02] active:scale-[0.98]"
				>
					<GrabPicLogo size="sm" />
				</Link>

				{/* Right side */}
				<div className="flex items-center gap-2">
					{isLoggedIn ? (
						<>
							{userEmail && (
								<span className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-44 bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1.5 rounded-full">
									{userEmail}
								</span>
							)}

							{!pathname?.startsWith("/dashboard") && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => router.push("/dashboard")}
									className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
								>
									<LayoutDashboard className="w-4 h-4 mr-1.5" />
									Dashboard
								</Button>
							)}

							<Button
								variant="ghost"
								size="sm"
								onClick={handleLogout}
								className="text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
							>
								<LogOut className="w-4 h-4 mr-1.5" />
								Logout
							</Button>
						</>
					) : (
						<>
							{pathname !== "/login" && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => router.push("/login")}
									className="text-zinc-600 dark:text-zinc-300"
								>
									<LogIn className="w-4 h-4 mr-1.5" />
									Sign In
								</Button>
							)}
							{pathname !== "/signup" && (
								<Button
									size="sm"
									onClick={() => router.push("/signup")}
									className="bg-violet-600 hover:bg-violet-700 text-white"
								>
									Get Started
								</Button>
							)}
						</>
					)}
				</div>
			</div>
		</nav>
	);
}
