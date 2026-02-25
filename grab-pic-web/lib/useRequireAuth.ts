"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Hook that guards a page behind authentication.
 * Redirects unauthenticated users to /login.
 * Returns { isLoading, isAuthenticated } so the page can show a loading spinner.
 */
export function useRequireAuth() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		const check = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session) {
				router.replace("/login");
			} else {
				setIsAuthenticated(true);
			}
			setIsLoading(false);
		};
		check();
	}, [router]);

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
