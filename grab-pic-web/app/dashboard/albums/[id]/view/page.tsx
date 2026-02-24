"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
	Lock,
	Globe,
	Share2,
	UploadCloud,
	Loader2,
	X,
	UserSearch,
	Eye,
	EyeOff,
	Download,
	Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface Photo {
	id: string;
	viewUrl: string;
	isPublic: boolean;
	processed: boolean;
	faceCount: number;
	faceBoxes: string[];
}

export default function AlbumViewPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const albumId = params?.id || "";

	const [photos, setPhotos] = useState<Photo[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
	const [imageDims, setImageDims] = useState({ width: 1, height: 1 });

	const [showBoxes, setShowBoxes] = useState(true);

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

		const channel = supabase
			.channel(`album-updates-${albumId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "photos",
					filter: `album_id=eq.${albumId}`,
				},
				(payload) => {
					const updatedPhotoId = payload.new.id;
					const isNowProcessed = payload.new.processed;

					setPhotos((currentPhotos) =>
						currentPhotos.map((photo) =>
							photo.id === updatedPhotoId
								? { ...photo, processed: isNowProcessed }
								: photo,
						),
					);

					if (isNowProcessed) {
						fetchPhotos();
					}
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [albumId]);

	const copyShareLink = () => {
		// Later, this link will be the "Guest View" portal
		const url = `${window.location.origin}/albums/${albumId}/guest`;
		navigator.clipboard.writeText(url);
		alert("Guest link copied to clipboard!");
	};

	const handleDownload = async () => {
		if (!selectedPhoto) return;
		try {
			const response = await fetch(selectedPhoto.viewUrl);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `grabpic-${selectedPhoto.id}.jpg`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Download failed:", error);
			alert("Failed to download image.");
		}
	};

	const handleDelete = async () => {
		if (!selectedPhoto) return;
		const confirmDelete = window.confirm(
			"Are you sure you want to permanently remove this photo?",
		);
		if (!confirmDelete) return;

		try {
			const res = await apiFetch(
				`/api/albums/${albumId}/photos/${selectedPhoto.id}`,
				{
					method: "DELETE",
				},
			);
			if (res.ok) {
				setPhotos((prev) => prev.filter((p) => p.id !== selectedPhoto.id));
				setSelectedPhoto(null);
			} else {
				alert("Failed to delete photo from the server.");
			}
		} catch (error) {
			console.error("Delete failed:", error);
		}
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
									unoptimized
								/>

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

								<div className="absolute bottom-2 right-2 left-2 flex justify-center">
									{!photo.processed && !photo.isPublic ? (
										<span className="flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-white backdrop-blur-md shadow-sm border border-amber-400">
											<Loader2 className="w-3 h-3 animate-spin" /> Scanning
											Faces...
										</span>
									) : (
										photo.processed && (
											<button
												onClick={() => setSelectedPhoto(photo)}
												className="flex items-center gap-1.5 py-1 px-3 rounded-full text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg border border-indigo-400"
											>
												<UserSearch className="w-3 h-3" />
												Scanned ({photo.faceCount || 0}{" "}
												{photo.faceCount === 1 ? "Person" : "People"})
											</button>
										)
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{selectedPhoto && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
					<div className="relative max-w-5xl w-full bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col max-h-[90vh]">
						{/* Modal Header & Toolbar */}
						<div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-800">
							<div>
								<h3 className="text-white font-bold text-lg">
									AI Inspection Mode
								</h3>
								<p className="text-zinc-400 text-xs mt-0.5">
									{selectedPhoto.faceCount} signatures found.
								</p>
							</div>

							{/* ACTION BUTTONS */}
							<div className="flex items-center gap-2">
								<Button
									onClick={() => setShowBoxes(!showBoxes)}
									variant="secondary"
									size="sm"
									className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-zinc-700"
									title={
										showBoxes ? "Hide Bounding Boxes" : "Show Bounding Boxes"
									}
								>
									{showBoxes ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
									<span className="hidden sm:inline ml-2">
										{showBoxes ? "Hide Boxes" : "Show Boxes"}
									</span>
								</Button>

								<Button
									onClick={handleDownload}
									variant="secondary"
									size="sm"
									className="bg-zinc-800 text-zinc-300 hover:bg-indigo-600 hover:text-white border-zinc-700 hover:border-indigo-500"
									title="Download Original Photo"
								>
									<Download className="w-4 h-4" />
								</Button>

								<Button
									onClick={handleDelete}
									variant="secondary"
									size="sm"
									className="bg-zinc-800 text-zinc-300 hover:bg-red-600 hover:text-white border-zinc-700 hover:border-red-500"
									title="Delete Photo"
								>
									<Trash2 className="w-4 h-4" />
								</Button>

								<div className="w-px h-6 bg-zinc-700 mx-1"></div>

								<button
									onClick={() => {
										setSelectedPhoto(null);
										setImageDims({ width: 1, height: 1 });
										setShowBoxes(true); // Reset toggle on close
									}}
									className="p-2 bg-zinc-800 text-zinc-400 rounded-full hover:bg-zinc-700 hover:text-white transition-colors ml-1"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Image Canvas with Overlays */}
						<div className="relative flex-1 flex justify-center items-center bg-black overflow-hidden p-4 min-h-[50vh]">
							<div className="relative inline-block max-w-full max-h-full">
								<img
									src={selectedPhoto.viewUrl}
									alt="Inspection"
									className="max-w-full max-h-[65vh] w-auto h-auto block shadow-2xl rounded-sm"
									onLoad={(e) => {
										setImageDims({
											width: e.currentTarget.naturalWidth,
											height: e.currentTarget.naturalHeight,
										});
									}}
								/>

								{/* Draw AI Bounding Boxes ONLY if showBoxes is true */}
								{showBoxes &&
									selectedPhoto.faceBoxes?.map((boxStr, idx) => {
										const box = JSON.parse(boxStr);
										return (
											<div
												key={idx}
												className="absolute border-2 border-indigo-400 bg-indigo-500/10 rounded-lg shadow-[0_0_15px_rgba(129,140,248,0.5)] transition-all hover:bg-indigo-500/30"
												style={{
													left: `${(box.x / imageDims.width) * 100}%`,
													top: `${(box.y / imageDims.height) * 100}%`,
													width: `${(box.w / imageDims.width) * 100}%`,
													height: `${(box.h / imageDims.height) * 100}%`,
												}}
											>
												<span className="absolute -top-6 left-0 bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">
													ID: {idx + 1}
												</span>
											</div>
										);
									})}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
