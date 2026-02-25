"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
	Image as ImageIcon,
	Loader2,
	Calendar,
	ChevronRight,
	Plus,
	FolderOpen,
} from "lucide-react";

interface Album {
	id: string;
	title: string;
	createdAt: string;
}

export default function DashboardPage() {
	const router = useRouter();
	const [albums, setAlbums] = useState<Album[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isCreating, setIsCreating] = useState(false);
	const [newAlbumTitle, setNewAlbumTitle] = useState("");

	// Fetch all albums when the dashboard loads
	useEffect(() => {
		fetchAlbums();
	}, []);

	const fetchAlbums = async () => {
		try {
			const res = await apiFetch("/api/albums");
			if (res.ok) {
				const data = await res.json();
				setAlbums(data);
			}
		} catch (error) {
			console.error("Failed to fetch albums", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateAlbum = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newAlbumTitle.trim()) return;

		setIsCreating(true);
		try {
			const res = await apiFetch("/api/albums", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: newAlbumTitle }),
			});

			if (res.ok) {
				const newAlbum = await res.json();
				router.push(`/dashboard/albums/${newAlbum.id}`);
			} else {
				console.error("Server error. Status:", res.status);
				alert("Failed to create album. Are you fully logged in?");
				setIsCreating(false);
			}
		} catch (error) {
			console.error("Network failed to connect to Spring Boot:", error);
			alert("Network error. Is your Spring Boot server running?");
			setIsCreating(false);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 lg:p-10">
			<div className="max-w-6xl mx-auto space-y-8">
				{/* Header */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
							My Albums
						</h1>
						<p className="text-zinc-500 mt-1">
							Create and manage your photo albums.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{/* Create New Album Card */}
					<div className="bg-indigo-50 dark:bg-indigo-950/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 flex flex-col justify-center">
						<div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center mb-3">
							<Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
						</div>
						<h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 mb-1">
							Create New Album
						</h3>
						<p className="text-sm text-indigo-700/70 dark:text-indigo-300/70 mb-4">
							Give your album a name to start uploading.
						</p>
						<form onSubmit={handleCreateAlbum} className="w-full space-y-3">
							<input
								type="text"
								placeholder="e.g., Sarah's Wedding 2026"
								className="w-full text-sm px-4 py-3 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
								value={newAlbumTitle}
								onChange={(e) => setNewAlbumTitle(e.target.value)}
								disabled={isCreating}
							/>
							<Button
								type="submit"
								className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-5"
								disabled={isCreating || !newAlbumTitle}
							>
								{isCreating ? (
									<Loader2 className="w-5 h-5 animate-spin" />
								) : (
									"Create & Upload Photos"
								)}
							</Button>
						</form>
					</div>

					{/* Loading State */}
					{isLoading && (
						<div className="col-span-2 flex items-center justify-center">
							<Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
						</div>
					)}

					{/* Empty State */}
					{!isLoading && albums.length === 0 && (
						<div className="col-span-1 sm:col-span-1 lg:col-span-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center">
							<FolderOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4" />
							<h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
								No albums yet
							</h3>
							<p className="text-sm text-zinc-500 max-w-xs">
								Create your first album to start uploading and sharing photos
								with guests.
							</p>
						</div>
					)}

					{/* Existing Albums List */}
					{!isLoading &&
						albums.map((album) => (
							<div
								key={album.id}
								onClick={() =>
									router.push(`/dashboard/albums/${album.id}/view`)
								}
								className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
							>
								{/* Color accent bar */}
								<div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />

								<div className="p-6 flex flex-col justify-between">
									<div>
										<div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
											<ImageIcon className="w-5 h-5 text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
										</div>
										<h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 line-clamp-1">
											{album.title}
										</h3>
										<p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-2">
											<Calendar className="w-3.5 h-3.5" />
											{new Date(album.createdAt).toLocaleDateString(undefined, {
												year: "numeric",
												month: "short",
												day: "numeric",
											})}
										</p>
									</div>

									<div className="mt-6 flex gap-2">
										<Button
											variant="outline"
											className="w-full text-xs h-9"
											onClick={(e) => {
												e.stopPropagation();
												router.push(`/dashboard/albums/${album.id}`);
											}}
										>
											Upload More
										</Button>
										<Button
											variant="secondary"
											className="w-full text-xs h-9 bg-zinc-100 dark:bg-zinc-800"
										>
											View Gallery <ChevronRight className="w-3 h-3 ml-1" />
										</Button>
									</div>
								</div>
							</div>
						))}
				</div>
			</div>
		</div>
	);
}
