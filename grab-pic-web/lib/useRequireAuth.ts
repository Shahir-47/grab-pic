"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Hook that guards a page behind authentication.
 * Redirects unauthenticated users to /login?redirect=<current_path>
 * so they return to the right page after signing in.
 */
export function useRequireAuth() {
	const router = useRouter();
	const pathname = usePathname();
	const [isLoading, setIsLoading] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		const check = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session) {
				const redirectUrl =
					pathname && pathname !== "/"
						? `/login?redirect=${encodeURIComponent(pathname)}`
						: "/login";
				router.replace(redirectUrl);
			} else {
				setIsAuthenticated(true);
			}
			setIsLoading(false);
		};
		check();
	}, [router, pathname]);

	return { isLoading, isAuthenticated };
}

/**
 * Hook that redirects already-authenticated users away from public pages
 * (login, signup, home). Redirects to /dashboard if logged in.
 */
export function useRedirectIfAuth() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		const check = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (session) {
				setIsAuthenticated(true);
				router.replace("/dashboard");
			}
			setIsLoading(false);
		};
		check();
	}, [router]);

	return { isLoading, isAuthenticated };
}
