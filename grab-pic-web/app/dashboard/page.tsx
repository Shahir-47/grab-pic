"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Plus,
	Image as ImageIcon,
	Loader2,
	Calendar,
	ChevronRight,
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
			const res = await fetch("http://localhost:8080/api/albums");
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
			const res = await fetch("http://localhost:8080/api/albums", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: newAlbumTitle }),
			});

			if (res.ok) {
				const newAlbum = await res.json();
				// Instantly redirect the user to their newly created album's upload page!
				router.push(`/dashboard/albums/${newAlbum.id}`);
			}
		} catch (error) {
			console.error("Failed to create album", error);
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
							Manage your events and upload photos.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Create New Album Card */}
					<div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-6 flex flex-col justify-center items-center text-center transition-hover hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20">
						<div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
							<Plus className="w-6 h-6" />
						</div>
						<h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
							Create New Album
						</h3>
						<form onSubmit={handleCreateAlbum} className="w-full space-y-3">
							<input
								type="text"
								placeholder="e.g., Sarah's Wedding 2026"
								className="w-full text-sm px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-md bg-transparent dark:text-white"
								value={newAlbumTitle}
								onChange={(e) => setNewAlbumTitle(e.target.value)}
								disabled={isCreating}
							/>
							<Button
								type="submit"
								className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
								disabled={isCreating || !newAlbumTitle}
							>
								{isCreating ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									"Create & Upload"
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

					{/* Existing Albums List */}
					{!isLoading &&
						albums.map((album) => (
							<div
								key={album.id}
								onClick={() =>
									router.push(`/dashboard/albums/${album.id}/view`)
								}
								className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between cursor-pointer hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
							>
								<div>
									<div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
										<ImageIcon className="w-5 h-5 text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
									</div>
									<h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 line-clamp-1">
										{album.title}
									</h3>
									<p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-2">
										<Calendar className="w-3.5 h-3.5" />
										{new Date(album.createdAt).toLocaleDateString()}
									</p>
								</div>

								<div className="mt-6 flex gap-2">
									<Button
										variant="outline"
										className="w-full text-xs"
										onClick={(e) => {
											e.stopPropagation(); // Prevent card click
											router.push(`/dashboard/albums/${album.id}`);
										}}
									>
										Upload More
									</Button>
									<Button
										variant="secondary"
										className="w-full text-xs bg-zinc-100 dark:bg-zinc-800"
									>
										View Gallery <ChevronRight className="w-3 h-3 ml-1" />
									</Button>
								</div>
							</div>
						))}
				</div>
			</div>
		</div>
	);
}
