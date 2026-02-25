"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Always return true on client, false during SSR
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function getIsDark() {
	if (typeof document === "undefined") return false;
	return document.documentElement.classList.contains("dark");
}

export default function ThemeToggle() {
	const mounted = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);
	const dark = getIsDark();

	const toggle = () => {
		const next = !document.documentElement.classList.contains("dark");
		if (next) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
	};

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
