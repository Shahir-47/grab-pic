"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Lock, Globe, Share2, UploadCloud, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Photo {
	id: string;
	viewUrl: string;
	isPublic: boolean;
	processed: boolean;
}

export default function AlbumViewPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const albumId = params?.id || "";

	const [photos, setPhotos] = useState<Photo[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchPhotos = async () => {
			try {
				const response = await apiFetch(`/api/albums/${albumId}/photos`);
				if (!response.ok) throw new Error("Failed to fetch photos");
				const data = await response.json();
				setPhotos(data);
			} catch (error) {
				console.error("Error loading album:", error);
			} finally {
				setIsLoading(false);
			}
		};

		if (albumId) fetchPhotos();
	}, [albumId]);

	const copyShareLink = () => {
		// Later, this link will be the "Guest View" portal
		const url = `${window.location.origin}/albums/${albumId}/guest`;
		navigator.clipboard.writeText(url);
		alert("Guest link copied to clipboard!");
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
				<Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 lg:p-10">
			<div className="max-w-7xl mx-auto space-y-8">
				{/* Header Controls */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
							Album Gallery
						</h1>
						<p className="text-zinc-500 mt-1">
							You are viewing as the Host. You can see all {photos.length}{" "}
							photos.
						</p>
					</div>

					<div className="flex gap-3 w-full sm:w-auto">
						<Button
							onClick={() => router.push(`/dashboard/albums/${albumId}`)}
							variant="outline"
							className="w-full sm:w-auto"
						>
							<UploadCloud className="w-4 h-4 mr-2" /> Add More
						</Button>
						<Button
							onClick={copyShareLink}
							className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
						>
							<Share2 className="w-4 h-4 mr-2" /> Share Album
						</Button>
					</div>
				</div>

				{/* Photo Grid */}
				{photos.length === 0 ? (
					<div className="text-center py-20 text-zinc-500">
						No photos found. Upload some to get started!
					</div>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						{photos.map((photo) => (
							<div
								key={photo.id}
								className="group relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm"
							>
								<Image
									src={photo.viewUrl}
									alt="Album Photo"
									fill
									className="object-cover transition-transform duration-500 group-hover:scale-105"
									unoptimized // Required for S3 Presigned URLs in Next.js
								/>

								{/* Top Badge: Privacy Status */}
								<div className="absolute top-2 left-2">
									<span
										className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border
                                        ${
																					photo.isPublic
																						? "bg-emerald-500/90 text-white border-emerald-400"
																						: "bg-zinc-900/80 text-zinc-100 border-zinc-700"
																				}`}
									>
										{photo.isPublic ? (
											<Globe className="w-3 h-3" />
										) : (
											<Lock className="w-3 h-3" />
										)}
										{photo.isPublic ? "Public" : "Protected"}
									</span>
								</div>

								{/* Bottom Badge: AI Processing Status */}
								<div className="absolute bottom-2 right-2">
									{!photo.processed && !photo.isPublic && (
										<span className="flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-white backdrop-blur-md shadow-sm border border-amber-400">
											<Loader2 className="w-3 h-3 animate-spin" /> Scanning
											Faces...
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
