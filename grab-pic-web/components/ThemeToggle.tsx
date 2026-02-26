"use client";

import { useSyncExternalStore, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

let listeners: (() => void)[] = [];
function emitChange() {
	for (const l of listeners) l();
}

function subscribe(listener: () => void) {
	listeners = [...listeners, listener];
	return () => {
		listeners = listeners.filter((l) => l !== listener);
	};
}

function getSnapshot() {
	if (typeof document === "undefined") return false;
	return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
	return false;
}

export default function ThemeToggle() {
	const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	const toggle = useCallback(() => {
		const next = !document.documentElement.classList.contains("dark");
		if (next) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
		emitChange();
	}, []);

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
