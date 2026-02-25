"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
	const [dark, setDark] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		// Check localStorage first, then system preference
		const stored = localStorage.getItem("theme");
		if (stored === "dark") {
			setDark(true);
			document.documentElement.classList.add("dark");
		} else if (stored === "light") {
			setDark(false);
			document.documentElement.classList.remove("dark");
		} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
			setDark(true);
			document.documentElement.classList.add("dark");
		}
	}, []);

	const toggle = () => {
		const next = !dark;
		setDark(next);
		if (next) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
	};

	// Avoid hydration mismatch — render nothing until mounted
	if (!mounted) return null;

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={toggle}
			className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
			title={dark ? "Switch to light mode" : "Switch to dark mode"}
			aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
		</Button>
	);
}
