"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
	UploadCloud,
	Lock,
	Globe,
	Maximize2,
	X,
	Info,
	CheckCircle2,
	Image as ImageIcon,
	AlertCircle,
	Loader2,
	ArrowLeft,
	Eye,
} from "lucide-react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

interface UploadPhoto {
	id: string;
	file: File;
	previewUrl: string;
	isPublic: boolean;
	status: "idle" | "uploading" | "success" | "error";
}

export default function AlbumUploadPage() {
	const { isLoading: isAuthLoading, isAuthenticated } = useRequireAuth();
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const albumId = params?.id || "unknown-album";

	const [photos, setPhotos] = useState<UploadPhoto[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	if (isAuthLoading || !isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
				<Loader2 className="w-10 h-10 animate-spin text-violet-600" />
			</div>
		);
	}

	//  Load files into browser memory and create preview URLs
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files) return;

		const newFiles = Array.from(e.target.files).map((file) => ({
			id: Math.random().toString(36).substring(7),
			file,
			previewUrl: URL.createObjectURL(file),
			isPublic: false,
			status: "idle" as const,
		}));

		setPhotos((prev) => [...prev, ...newFiles]);
		// Reset input so the same file can be selected again
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const togglePrivacy = (id: string) => {
		setPhotos((prev) =>
			prev.map((p) => (p.id === id ? { ...p, isPublic: !p.isPublic } : p)),
		);
	};

	const setAllPrivacy = (makePublic: boolean) => {
		setPhotos((prev) => prev.map((p) => ({ ...p, isPublic: makePublic })));
	};

	const removePhoto = (id: string) => {
		setPhotos((prev) => prev.filter((p) => p.id !== id));
	};

	const handleUploadToS3 = async () => {
		const pendingPhotos = photos.filter(
			(p) => p.status === "idle" || p.status === "error",
		);
		if (pendingPhotos.length === 0) return;

		setIsUploading(true);

		try {
			const response = await apiFetch(
				`/api/albums/${albumId}/upload-urls?count=${pendingPhotos.length}`,
			);
			if (!response.ok)
				throw new Error("Failed to get secure upload links from backend");

			const presignedUrls: string[] = await response.json();
			const uploadPromises = pendingPhotos.map(async (photo, index) => {
				setPhotos((prev) =>
					prev.map((p) =>
						p.id === photo.id ? { ...p, status: "uploading" } : p,
					),
				);

				try {
					const uploadUrl = presignedUrls[index];

					const uploadRes = await fetch(uploadUrl, {
						method: "PUT",
						body: photo.file,
						headers: {
							"Content-Type": photo.file.type,
						},
					});

					if (uploadRes.ok) {
						setPhotos((prev) =>
							prev.map((p) =>
								p.id === photo.id ? { ...p, status: "success" } : p,
							),
						);

						const urlObj = new URL(uploadUrl);
						const actualS3Key = urlObj.pathname.slice(1);

						return { ...photo, status: "success", actualS3Key };
					} else {
						throw new Error("S3 Upload Failed");
					}
				} catch {
					setPhotos((prev) =>
						prev.map((p) =>
							p.id === photo.id ? { ...p, status: "error" } : p,
						),
					);
					return null;
				}
			});

			const results = await Promise.all(uploadPromises);
			const successfulPhotos = results.filter((p) => p !== null);

			if (successfulPhotos.length > 0) {
				const payload = {
					photos: successfulPhotos.map((p) => ({
						storageUrl: p.actualS3Key,
						isPublic: p.isPublic,
					})),
				};

				const dbResponse = await apiFetch(`/api/albums/${albumId}/photos`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});

				if (!dbResponse.ok) {
					console.error("AWS Upload succeeded, but Database save failed.");
					alert("Photos uploaded to cloud, but failed to save to album.");
				} else {
					console.log("Successfully saved to database!");
					setPhotos([]);
					router.push(`/dashboard/albums/${albumId}/view`);
				}
			}
		} catch (error) {
			console.error("Upload process failed:", error);
			alert(
				"Failed to start uploads. Make sure Spring Boot is running on port 8080.",
			);
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 lg:p-10">
			<div className="max-w-6xl mx-auto space-y-6">
				{/* Back link — standalone */}
				<button
					onClick={() => router.push("/dashboard")}
					className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Dashboard
				</button>

				{/* Header & Privacy Explanation */}
				<div className="space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
							Add Photos to Album
						</h1>
						<Button
							variant="outline"
							onClick={() => router.push(`/dashboard/albums/${albumId}/view`)}
							className="w-full sm:w-auto"
						>
							<Eye className="w-4 h-4 mr-2" />
							View Album
						</Button>
					</div>

					<div className="bg-violet-50 dark:bg-violet-950 border border-violet-100 dark:border-violet-900 rounded-2xl p-6 flex gap-4 items-start">
						<Info className="w-6 h-6 text-violet-600 mt-1 shrink-0" />
						<div className="space-y-2 text-sm text-violet-900 dark:text-violet-200">
							<h3 className="font-bold text-base">How Album Privacy Works</h3>
							<p>
								<strong className="text-zinc-900 dark:text-white">
									<Lock className="w-3 h-3 inline pb-0.5" /> Protected
								</strong>{" "}
								(default) &mdash; These photos are only shown to the specific
								people in them, matched by facial recognition. Guests take a
								selfie and only see photos that match their face.
							</p>
							<p>
								<strong className="text-emerald-600 dark:text-emerald-400">
									<Globe className="w-3 h-3 inline pb-0.5" /> Public
								</strong>{" "}
								&mdash; Visible to anyone who has the album link. Great for
								landscape shots, venue pictures, or group photos you want
								everyone to see.
							</p>
						</div>
					</div>
				</div>

				{/* Toolbar */}
				<div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
					<div className="flex gap-2 w-full sm:w-auto">
						<input
							type="file"
							multiple
							accept="image/*"
							className="hidden"
							ref={fileInputRef}
							onChange={handleFileSelect}
						/>
						<Button
							onClick={() => fileInputRef.current?.click()}
							variant="outline"
							className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700"
						>
							<UploadCloud className="w-4 h-4 mr-2" />
							Select Photos
						</Button>
						<Button
							onClick={() => setAllPrivacy(true)}
							variant="secondary"
							className="hidden sm:flex text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
						>
							<Globe className="w-4 h-4 mr-2" /> Mark All Public
						</Button>
						<Button
							onClick={() => setAllPrivacy(false)}
							variant="secondary"
							className="hidden sm:flex text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
						>
							<Lock className="w-4 h-4 mr-2" /> Mark All Protected
						</Button>
					</div>

					<Button
						onClick={handleUploadToS3}
						disabled={photos.length === 0 || isUploading}
						className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 shadow-md transition-all"
					>
						{isUploading
							? "Uploading to AWS S3..."
							: `Upload ${photos.length} Photos`}
					</Button>
				</div>

				{/* Empty State */}
				{photos.length === 0 && (
					<div className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-20 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900">
						<ImageIcon className="w-12 h-12 text-zinc-300 mb-4" />
						<h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
							No photos selected
						</h3>
						<p className="text-zinc-500 mt-2 max-w-sm">
							Click the button above to select images from your computer to add
							to this album.
						</p>
					</div>
				)}

				{/* Photo Grid */}
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
					{photos.map((photo) => (
						<div
							key={photo.id}
							className="group relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm"
						>
							{/* Image Preview */}
							<Image
								src={photo.previewUrl}
								alt="Preview"
								fill
								className={`object-cover transition-all duration-300 ${photo.status === "uploading" ? "opacity-50 grayscale scale-105" : ""}`}
							/>

							{/* Status Overlays */}
							{photo.status === "uploading" && (
								<div className="absolute inset-0 flex items-center justify-center bg-zinc-900/20 backdrop-blur-[2px]">
									<div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
								</div>
							)}
							{photo.status === "success" && (
								<div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm transition-all">
									<CheckCircle2 className="w-10 h-10 text-emerald-500 bg-white rounded-full shadow-sm" />
								</div>
							)}
							{photo.status === "error" && (
								<div className="absolute inset-0 bg-red-500/20 flex items-center justify-center backdrop-blur-sm">
									<AlertCircle className="w-10 h-10 text-red-500 bg-white rounded-full shadow-sm" />
								</div>
							)}

							{/* Hover Controls (Only visible when idle) */}
							{photo.status === "idle" && (
								<>
									<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											onClick={() => setFullScreenImage(photo.previewUrl)}
											className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md backdrop-blur-md transition-colors"
											title="Full Screen"
										>
											<Maximize2 className="w-4 h-4" />
										</button>
										<button
											onClick={() => removePhoto(photo.id)}
											className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-md backdrop-blur-md transition-colors"
											title="Remove"
										>
											<X className="w-4 h-4" />
										</button>
									</div>

									{/* Privacy Toggle at bottom */}
									<div className="absolute bottom-2 left-2 right-2">
										<button
											onClick={() => togglePrivacy(photo.id)}
											className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition-all backdrop-blur-md shadow-sm border
                                                ${
																									photo.isPublic
																										? "bg-emerald-500/90 hover:bg-emerald-600 text-white border-emerald-400"
																										: "bg-zinc-900/80 hover:bg-zinc-900 text-zinc-100 border-zinc-700"
																								}`}
										>
											{photo.isPublic ? (
												<>
													<Globe className="w-3 h-3" /> Public
												</>
											) : (
												<>
													<Lock className="w-3 h-3" /> Protected
												</>
											)}
										</button>
									</div>
								</>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Full Screen Image Modal */}
			{fullScreenImage && (
				<div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
					<button
						onClick={() => setFullScreenImage(null)}
						className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
					>
						<X className="w-6 h-6" />
					</button>
					<div className="relative w-full max-w-5xl h-[85vh]">
						<Image
							src={fullScreenImage}
							alt="Full Screen Preview"
							fill
							className="object-contain"
							unoptimized // Important for local blob URLs to render sharply
						/>
					</div>
				</div>
			)}
		</div>
	);
}
