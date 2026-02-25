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
	CheckSquare,
	Check,
	Copy,
	SquareCheckBig,
	ArrowLeft,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/lib/useRequireAuth";
import JSZip from "jszip";
import { fetchImageAsBlob, downloadImage } from "@/lib/download";

interface Photo {
	id: string;
	viewUrl: string;
	isPublic: boolean;
	processed: boolean;
	faceCount: number;
	faceBoxes: string[];
}

export default function AlbumViewPage() {
	const { isLoading: isAuthLoading, isAuthenticated } = useRequireAuth();
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const albumId = params?.id || "";

	const [photos, setPhotos] = useState<Photo[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
	const [imageDims, setImageDims] = useState({ width: 1, height: 1 });
	const [showBoxes, setShowBoxes] = useState(false); // Default changed to false

	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [isDownloadingZip, setIsDownloadingZip] = useState(false);

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
					const isNowPublic = payload.new.access_mode === "PUBLIC";

					setPhotos((currentPhotos) =>
						currentPhotos.map((photo) =>
							photo.id === updatedPhotoId
								? { ...photo, processed: isNowProcessed, isPublic: isNowPublic }
								: photo,
						),
					);

					if (isNowProcessed) fetchPhotos();
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [albumId]);

	const handleShareClick = () => {
		setIsShareModalOpen(true);
		setIsCopied(false);
	};

	const handleCopyLink = () => {
		const url = `${window.location.origin}/albums/${albumId}/guest`;
		navigator.clipboard.writeText(url);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const toggleSelection = (photoId: string) => {
		setSelectedPhotoIds((prev) =>
			prev.includes(photoId)
				? prev.filter((id) => id !== photoId)
				: [...prev, photoId],
		);
	};

	const handleDeleteSelected = async () => {
		if (selectedPhotoIds.length === 0) return;
		const count = selectedPhotoIds.length;
		const photoWord = count === 1 ? "photo" : "photos";
		const confirmDelete = window.confirm(
			`Permanently delete ${count} ${photoWord}?\n\nThis cannot be undone.`,
		);
		if (!confirmDelete) return;

		try {
			for (const id of selectedPhotoIds) {
				await apiFetch(`/api/albums/${albumId}/photos/${id}`, {
					method: "DELETE",
				});
			}
			setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.includes(p.id)));
			setSelectedPhotoIds([]);
			setIsSelectionMode(false);
		} catch (error) {
			console.error("Batch delete failed:", error);
			alert("Failed to delete some photos.");
		}
	};

	const handleSelectAll = () => {
		if (selectedPhotoIds.length === photos.length) {
			setSelectedPhotoIds([]);
		} else {
			setSelectedPhotoIds(photos.map((p) => p.id));
		}
	};

	const handleDownloadSelectedZip = async () => {
		const idsToDownload = selectedPhotoIds.length > 0 ? selectedPhotoIds : [];
		if (idsToDownload.length === 0) return;

		setIsDownloadingZip(true);
		try {
			const zip = new JSZip();
			const photosToDownload = photos.filter((p) =>
				idsToDownload.includes(p.id),
			);

			const fetchPromises = photosToDownload.map(async (photo, index) => {
				const blob = await fetchImageAsBlob(photo.viewUrl);
				const ext = blob.type.includes("png") ? "png" : "jpg";
				zip.file(`grabpic-${index + 1}.${ext}`, blob);
			});

			await Promise.all(fetchPromises);

			const zipBlob = await zip.generateAsync({ type: "blob" });
			const url = URL.createObjectURL(zipBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `grabpic-album-${albumId}.zip`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Zip download failed:", error);
			alert("Failed to download photos as zip.");
		} finally {
			setIsDownloadingZip(false);
		}
	};

	const handleTogglePrivacySelected = async (makePublic: boolean) => {
		if (selectedPhotoIds.length === 0) return;

		const count = selectedPhotoIds.length;
		const photoWord = count === 1 ? "photo" : "photos";
		const message = makePublic
			? `Make ${count} ${photoWord} public?\n\nPublic photos are visible to anyone with the album link.`
			: `Make ${count} ${photoWord} protected?\n\nProtected photos are only shown to the people in them, matched by facial recognition.`;
		const confirmToggle = window.confirm(message);
		if (!confirmToggle) return;

		try {
			for (const id of selectedPhotoIds) {
				await apiFetch(
					`/api/albums/${albumId}/photos/${id}/privacy?makePublic=${makePublic}`,
					{ method: "PUT" },
				);
			}
			setPhotos((prev) =>
				prev.map((p) =>
					selectedPhotoIds.includes(p.id) ? { ...p, isPublic: makePublic } : p,
				),
			);
			setSelectedPhotoIds([]);
			setIsSelectionMode(false);
		} catch (error) {
			console.error("Batch privacy toggle failed:", error);
			alert("Failed to update privacy settings.");
		}
	};

	const handleTogglePrivacySingle = async () => {
		if (!selectedPhoto) return;
		const newStatus = !selectedPhoto.isPublic;

		try {
			const res = await apiFetch(
				`/api/albums/${albumId}/photos/${selectedPhoto.id}/privacy?makePublic=${newStatus}`,
				{ method: "PUT" },
			);
			if (res.ok) {
				setPhotos((prev) =>
					prev.map((p) =>
						p.id === selectedPhoto.id ? { ...p, isPublic: newStatus } : p,
					),
				);
				setSelectedPhoto({ ...selectedPhoto, isPublic: newStatus });
			}
		} catch (error) {
			console.error("Privacy toggle failed:", error);
		}
	};

	const handleDeleteAlbum = async () => {
		const confirmDelete = window.confirm(
			"WARNING: Are you sure you want to permanently delete this ENTIRE album and all its photos? This cannot be undone.",
		);
		if (!confirmDelete) return;

		try {
			const res = await apiFetch(`/api/albums/${albumId}`, {
				method: "DELETE",
			});
			if (res.ok) {
				router.push("/dashboard");
			} else {
				alert("Failed to delete album from the server.");
			}
		} catch (error) {
			console.error("Delete album failed:", error);
		}
	};

	const handleDownload = async () => {
		if (!selectedPhoto) return;
		await downloadImage(
			selectedPhoto.viewUrl,
			`grabpic-${selectedPhoto.id}.jpg`,
		);
	};

	const handleDeleteSingle = async () => {
		if (!selectedPhoto) return;
		const confirmDelete = window.confirm(
			"Are you sure you want to permanently remove this photo?",
		);
		if (!confirmDelete) return;

		try {
			const res = await apiFetch(
				`/api/albums/${albumId}/photos/${selectedPhoto.id}`,
				{ method: "DELETE" },
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

	if (isAuthLoading || !isAuthenticated || isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
				<Loader2 className="w-10 h-10 animate-spin text-violet-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 lg:p-10">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Back link — standalone with proper spacing */}
				<button
					onClick={() => router.push("/dashboard")}
					className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Dashboard
				</button>

				{/* Header Controls */}
				<div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
					{/* Top row: title + action buttons */}
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6">
						<div>
							<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
								Album Gallery
							</h1>
							<p className="text-zinc-500 mt-1">
								Viewing as Host · {photos.length}{" "}
								{photos.length === 1 ? "photo" : "photos"}
							</p>
						</div>

						{!isSelectionMode && (
							<div className="flex gap-2 w-full sm:w-auto flex-wrap">
								<Button
									onClick={() => setIsSelectionMode(true)}
									variant="outline"
									disabled={photos.length === 0}
								>
									<CheckSquare className="w-4 h-4 mr-2" /> Select
								</Button>
								<Button
									onClick={() => router.push(`/dashboard/albums/${albumId}`)}
									variant="outline"
								>
									<UploadCloud className="w-4 h-4 mr-2" /> Add More
								</Button>
								<Button
									onClick={handleShareClick}
									className="bg-violet-600 hover:bg-violet-700 text-white"
								>
									<Share2 className="w-4 h-4 mr-2" /> Share
								</Button>
								<Button
									onClick={handleDeleteAlbum}
									variant="outline"
									className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 px-3"
									title="Delete Entire Album"
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							</div>
						)}
					</div>

					{/* Selection toolbar */}
					{isSelectionMode && (
						<div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-6 py-4">
							{/* Single row on desktop, stacks cleanly on mobile */}
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								{/* Left: count + select all */}
								<div className="flex items-center gap-3">
									<span className="text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900 px-3 py-1 rounded-full">
										{selectedPhotoIds.length} selected
									</span>
									<Button onClick={handleSelectAll} variant="outline" size="sm">
										<SquareCheckBig className="w-4 h-4 mr-2" />
										{selectedPhotoIds.length === photos.length
											? "Deselect All"
											: "Select All"}
									</Button>
								</div>

								{/* Center: action buttons */}
								<div className="flex items-center gap-2 flex-wrap">
									<Button
										onClick={handleDownloadSelectedZip}
										variant="outline"
										size="sm"
										disabled={selectedPhotoIds.length === 0 || isDownloadingZip}
									>
										{isDownloadingZip ? (
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										) : (
											<Download className="w-4 h-4 mr-2" />
										)}
										{isDownloadingZip ? "Zipping..." : "Download"}
									</Button>
									<Button
										onClick={() => handleTogglePrivacySelected(true)}
										variant="outline"
										size="sm"
										disabled={selectedPhotoIds.length === 0}
										title="Visible to anyone with the album link"
									>
										<Globe className="w-4 h-4 mr-2" /> Make Public
									</Button>
									<Button
										onClick={() => handleTogglePrivacySelected(false)}
										variant="outline"
										size="sm"
										disabled={selectedPhotoIds.length === 0}
										title="Only shown to matched faces via facial recognition"
									>
										<Lock className="w-4 h-4 mr-2" /> Make Protected
									</Button>
									<Button
										onClick={handleDeleteSelected}
										variant="outline"
										size="sm"
										disabled={selectedPhotoIds.length === 0}
										className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300"
									>
										<Trash2 className="w-4 h-4 mr-2" /> Delete
									</Button>
								</div>

								{/* Right: cancel */}
								<Button
									onClick={() => {
										setIsSelectionMode(false);
										setSelectedPhotoIds([]);
									}}
									variant="ghost"
									size="sm"
									className="text-zinc-500 hover:text-zinc-700 shrink-0"
								>
									<X className="w-4 h-4 mr-1.5" /> Done
								</Button>
							</div>
						</div>
					)}
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
								onClick={() => {
									if (isSelectionMode) {
										toggleSelection(photo.id);
									} else {
										// Clicking the generic image background opens it clean (no faces)
										setSelectedPhoto(photo);
										setShowBoxes(false);
									}
								}}
								className={`group relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm transition-all cursor-pointer
                                    ${selectedPhotoIds.includes(photo.id) ? "ring-4 ring-violet-500 scale-[0.98]" : "border border-zinc-200 dark:border-zinc-700 hover:border-violet-400"}`}
							>
								<Image
									src={photo.viewUrl}
									alt="Album Photo"
									fill
									className="object-cover transition-transform duration-500 group-hover:scale-105"
									unoptimized
								/>

								{isSelectionMode && (
									<div className="absolute top-2 right-2 z-10">
										<div
											className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-md
                                            ${selectedPhotoIds.includes(photo.id) ? "bg-violet-600 border-violet-600" : "bg-black/30 border-white/80 hover:border-white"}`}
										>
											{selectedPhotoIds.includes(photo.id) && (
												<Check className="w-4 h-4 text-white" />
											)}
										</div>
									</div>
								)}

								<div className="absolute top-2 left-2">
									<span
										className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border transition-colors duration-300
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
											<Loader2 className="w-3 h-3 animate-spin" /> Scanning...
										</span>
									) : (
										photo.processed && (
											<button
												onClick={(e) => {
													// Prevent the parent DIV click from firing
													e.stopPropagation();
													if (isSelectionMode) {
														toggleSelection(photo.id);
													} else {
														setSelectedPhoto(photo);
														setShowBoxes(true);
													}
												}}
												className="flex items-center gap-1.5 py-1 px-3 rounded-full text-[10px] font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg border border-violet-400"
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

			{/* --- SHARE MODAL --- */}
			{isShareModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 relative">
						<button
							onClick={() => setIsShareModalOpen(false)}
							className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
						>
							<X className="w-5 h-5" />
						</button>

						<div className="text-center space-y-4 mb-6 mt-2">
							<div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center mx-auto">
								<Share2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
							</div>
							<h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
								Share with Guests
							</h3>
							<p className="text-zinc-500 text-sm">
								Send this link to your guests so they can take a selfie and find
								their photos.
							</p>
						</div>

						<div className="flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700">
							<div className="flex-1 truncate text-sm text-zinc-600 dark:text-zinc-300 px-2 font-mono">
								{`${window.location.origin}/albums/${albumId}/guest`}
							</div>
							<Button
								onClick={handleCopyLink}
								size="sm"
								className={`shrink-0 transition-all ${isCopied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-violet-600 hover:bg-violet-700"}`}
							>
								{isCopied ? (
									<Check className="w-4 h-4 mr-1.5" />
								) : (
									<Copy className="w-4 h-4 mr-1.5" />
								)}
								{isCopied ? "Copied!" : "Copy Link"}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* --- INSPECTION MODAL --- */}
			{selectedPhoto && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
					<div className="relative max-w-5xl w-full bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col max-h-[90vh]">
						<div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-800">
							<div>
								<h3 className="text-white font-bold text-lg">
									AI Inspection Mode
								</h3>
								<p className="text-zinc-400 text-xs mt-0.5">
									{selectedPhoto.faceCount} signatures found.
								</p>
							</div>

							<div className="flex items-center gap-2">
								<Button
									onClick={handleTogglePrivacySingle}
									variant="secondary"
									size="sm"
									className={`text-white hover:text-white border-transparent 
                                        ${
																					selectedPhoto.isPublic
																						? "bg-emerald-600 hover:bg-emerald-700"
																						: "bg-amber-600 hover:bg-amber-700"
																				}`}
									title={
										selectedPhoto.isPublic
											? "Currently Public (visible to anyone with the link). Click to protect."
											: "Currently Protected (only shown to matched faces). Click to make public."
									}
								>
									{selectedPhoto.isPublic ? (
										<>
											<Globe className="w-4 h-4 mr-2" /> Public
										</>
									) : (
										<>
											<Lock className="w-4 h-4 mr-2" /> Protected
										</>
									)}
								</Button>

								<div className="w-px h-6 bg-zinc-700 mx-1"></div>

								<Button
									onClick={() => setShowBoxes(!showBoxes)}
									variant="secondary"
									size="sm"
									className={`border-zinc-700 transition-colors ${showBoxes ? "bg-violet-950 text-violet-400 hover:bg-violet-900" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"}`}
									title={showBoxes ? "Hide Face Scans" : "Show Face Scans"}
								>
									{showBoxes ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
									<span className="hidden sm:inline ml-2">
										{showBoxes ? "Hide Face Scans" : "Show Face Scans"}
									</span>
								</Button>

								<Button
									onClick={handleDownload}
									variant="secondary"
									size="sm"
									className="bg-zinc-800 text-zinc-300 hover:bg-violet-600 hover:text-white border-zinc-700 hover:border-violet-500"
									title="Download Original Photo"
								>
									<Download className="w-4 h-4" />
								</Button>

								<Button
									onClick={handleDeleteSingle}
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
									}}
									className="p-2 bg-zinc-800 text-zinc-400 rounded-full hover:bg-zinc-700 hover:text-white transition-colors ml-1"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

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

								{showBoxes &&
									selectedPhoto.faceBoxes?.map((boxStr, idx) => {
										const box = JSON.parse(boxStr);
										return (
											<div
												key={idx}
												className="absolute border-2 border-violet-400 bg-violet-500/10 rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all hover:bg-violet-500/30"
												style={{
													left: `${(box.x / imageDims.width) * 100}%`,
													top: `${(box.y / imageDims.height) * 100}%`,
													width: `${(box.w / imageDims.width) * 100}%`,
													height: `${(box.h / imageDims.height) * 100}%`,
												}}
											>
												<span className="absolute -top-6 left-0 bg-violet-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">
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
