"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import {
	ScanFace,
	Upload,
	Loader2,
	Image as ImageIcon,
	Video,
	Images,
	UserSearch,
	X,
	Download,
	Check,
	CheckSquare,
	Maximize2,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import JSZip from "jszip";
import { fetchImageAsBlob, downloadImage } from "@/lib/download";

interface Photo {
	id: string;
	viewUrl: string;
	isPublic: boolean;
	processed: boolean;
}

export default function GuestWelcomePage() {
	const params = useParams<{ id: string }>();
	const albumId = params?.id || "";
	const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
	const isTurnstileEnabled = Boolean(turnstileSiteKey);
	const selfieUploadModeFlag =
		process.env.NEXT_PUBLIC_DEMO_SELFIE_UPLOAD?.toLowerCase() ?? "";
	const isSelfieUploadMode =
		selfieUploadModeFlag === "true" ||
		selfieUploadModeFlag === "1" ||
		selfieUploadModeFlag === "yes" ||
		selfieUploadModeFlag === "on";
	const aiServiceBaseUrl =
		process.env.NEXT_PUBLIC_AI_API_URL?.replace(/\/+$/, "") ?? "";
	const aiSearchEndpoint = aiServiceBaseUrl
		? `${aiServiceBaseUrl}/search`
		: "/api/ai/search";

	const [albumTitle, setAlbumTitle] = useState("");
	const [publicPhotos, setPublicPhotos] = useState<Photo[]>([]);
	const [matchedPhotos, setMatchedPhotos] = useState<Photo[]>([]);

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const [selfie, setSelfie] = useState<File | null>(null);
	const [isSearching, setIsSearching] = useState(false);

	const [fullScreenPhoto, setFullScreenPhoto] = useState<Photo | null>(null);
	const [fullScreenList, setFullScreenList] = useState<Photo[]>([]);
	const [isGuestSelecting, setIsGuestSelecting] = useState(false);
	const [guestSelectedIds, setGuestSelectedIds] = useState<string[]>([]);
	const [isDownloadingZip, setIsDownloadingZip] = useState(false);

	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0);

	const [isMobile, setIsMobile] = useState(true);
	const shouldUseFilePicker = isMobile || isSelfieUploadMode;
	const [isCameraOpen, setIsCameraOpen] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	useEffect(() => {
		const userAgent =
			typeof window.navigator === "undefined" ? "" : navigator.userAgent;
		const mobileRegex =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
		setIsMobile(mobileRegex.test(userAgent));
	}, []);

	useEffect(() => {
		const fetchAlbumDetails = async () => {
			try {
				const res = await fetch(`/api/albums/${albumId}/guest/details`);
				if (!res.ok) throw new Error("Album not found or private");

				const data = await res.json();
				setAlbumTitle(data.title);
				setPublicPhotos(data.publicPhotos || []);
			} catch {
				setError("This album doesn't exist or is unavailable.");
			} finally {
				setIsLoading(false);
			}
		};
		if (albumId) fetchAlbumDetails();
	}, [albumId]);

	useEffect(() => {
		if (isCameraOpen && videoRef.current && streamRef.current) {
			videoRef.current.srcObject = streamRef.current;
		}
	}, [isCameraOpen]);

	const stopCamera = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
		setIsCameraOpen(false);
	}, []);

	useEffect(() => {
		return () => stopCamera();
	}, [stopCamera]);

	const startDesktopCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false,
			});
			streamRef.current = stream;
			setIsCameraOpen(true);
		} catch (err) {
			console.error("Error accessing camera:", err);
			alert(
				"Could not access camera. Please check your permissions or upload a file instead.",
			);
		}
	};

	const takeDesktopPhoto = () => {
		if (!videoRef.current) return;
		const canvas = document.createElement("canvas");
		canvas.width = videoRef.current.videoWidth;
		canvas.height = videoRef.current.videoHeight;
		const ctx = canvas.getContext("2d");

		if (ctx) {
			ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
			canvas.toBlob(
				(blob) => {
					if (blob) {
						const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
						setSelfie(file);
						stopCamera();
					}
				},
				"image/jpeg",
				0.9,
			);
		}
	};

	const handleMobileSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setSelfie(e.target.files[0]);
		}
	};

	const openFullScreen = (photo: Photo, list: Photo[]) => {
		setFullScreenPhoto(photo);
		setFullScreenList(list);
	};

	const navigateFullScreen = (direction: "prev" | "next") => {
		if (!fullScreenPhoto) return;
		const idx = fullScreenList.findIndex((p) => p.id === fullScreenPhoto.id);
		const newIdx = direction === "prev" ? idx - 1 : idx + 1;
		if (newIdx >= 0 && newIdx < fullScreenList.length) {
			setFullScreenPhoto(fullScreenList[newIdx]);
		}
	};

	const handleDownloadSingle = async (photo: Photo) => {
		await downloadImage(photo.viewUrl, `grabpic-${photo.id}.jpg`);
	};

	const toggleGuestSelect = (photoId: string) => {
		setGuestSelectedIds((prev) =>
			prev.includes(photoId)
				? prev.filter((id) => id !== photoId)
				: [...prev, photoId],
		);
	};

	const handleGuestDownloadZip = async (photoList: Photo[]) => {
		const toDownload = photoList.filter((p) => guestSelectedIds.includes(p.id));
		if (toDownload.length === 0) return;

		setIsDownloadingZip(true);
		try {
			const zip = new JSZip();
			const fetchPromises = toDownload.map(async (photo, index) => {
				const blob = await fetchImageAsBlob(photo.viewUrl);
				const ext = blob.type.includes("png") ? "png" : "jpg";
				zip.file(`grabpic-${index + 1}.${ext}`, blob);
			});
			await Promise.all(fetchPromises);

			const zipBlob = await zip.generateAsync({ type: "blob" });
			const url = URL.createObjectURL(zipBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `grabpic-photos.zip`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Zip download failed:", error);
			alert("Failed to download photos.");
		} finally {
			setIsDownloadingZip(false);
		}
	};

	const resetTurnstile = () => {
		setTurnstileToken(null);
		setTurnstileWidgetKey((prev) => prev + 1);
	};

	const handleSearch = async () => {
		if (!selfie) return;
		if (isTurnstileEnabled && !turnstileToken) {
			alert("Please complete the bot check before searching.");
			return;
		}

		setIsSearching(true);
		setMatchedPhotos([]);

		const readErrorMessage = async (res: Response, fallback: string) => {
			const raw = await res.text();
			if (!raw) return fallback;
			try {
				const parsed = JSON.parse(raw) as { error?: unknown };
				if (typeof parsed.error === "string" && parsed.error.trim()) {
					return parsed.error;
				}
			} catch {
				return raw.startsWith("<!DOCTYPE") ? fallback : raw;
			}
			return fallback;
		};

		try {
			const formData = new FormData();
			formData.append("file", selfie);
			formData.append("album_id", albumId);
			const headers: Record<string, string> = {};
			if (turnstileToken) {
				headers["X-Turnstile-Token"] = turnstileToken;
			}

			const aiRes = await fetch(aiSearchEndpoint, {
				method: "POST",
				headers,
				body: formData,
			});
			if (isTurnstileEnabled) {
				resetTurnstile();
			}

			if (!aiRes.ok) {
				const msg = await readErrorMessage(
					aiRes,
					"Face search service is unavailable. Please try again.",
				);
				throw new Error(msg);
			}

			let aiData: { matched_photo_ids?: string[] };
			try {
				aiData = await aiRes.json();
			} catch {
				throw new Error(
					"Face search service returned an invalid response. Please try again.",
				);
			}
			const photoIds = aiData.matched_photo_ids;

			if (!photoIds || photoIds.length === 0) {
				alert("We couldn't find any photos of you in this album!");
				setIsSearching(false);
				return;
			}

			const sbRes = await fetch(`/api/albums/${albumId}/guest/search-results`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(photoIds),
			});

			if (!sbRes.ok) {
				const msg = await readErrorMessage(
					sbRes,
					"Failed to retrieve your photos.",
				);
				throw new Error(msg);
			}

			const finalPhotos = await sbRes.json();
			setMatchedPhotos(finalPhotos);
		} catch (err: unknown) {
			console.error(err);
			alert(
				err instanceof Error ? err.message : "An error occurred during search.",
			);
		} finally {
			setIsSearching(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
				<Loader2 className="w-10 h-10 animate-spin text-violet-600" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
				<div>
					<ImageIcon className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
					<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
						Oops!
					</h1>
					<p className="text-zinc-500">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:flex-row">
			<div className="w-full lg:w-112.5 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center p-8 lg:p-10 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
				<div className="w-full max-w-sm space-y-8 text-center">
					<div>
						<div className="w-16 h-16 bg-violet-100 dark:bg-violet-900 rounded-xl flex items-center justify-center mx-auto mb-4">
							<ScanFace className="w-8 h-8 text-violet-600 dark:text-violet-400" />
						</div>
						<h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
							{albumTitle}
						</h1>
						<p className="text-zinc-500 mt-3 text-sm leading-relaxed">
							Browse the public gallery below, or take a selfie to find
							protected photos that match your face.
						</p>
					</div>

					<div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-6">
						<div className="flex items-center justify-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
							<UserSearch className="w-4 h-4 text-violet-500" />
							AI Photo Finder
						</div>

						{isCameraOpen && !selfie ? (
							<div className="space-y-4">
								<div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-violet-300 dark:border-violet-700 shadow-lg bg-black">
									<video
										ref={videoRef}
										autoPlay
										playsInline
										muted
										className="w-full h-full object-cover transform scale-x-[-1]"
									/>
								</div>
								<div className="flex gap-3 justify-center">
									<Button
										onClick={stopCamera}
										variant="outline"
										className="flex-1"
									>
										Cancel
									</Button>
									<Button
										onClick={takeDesktopPhoto}
										className="flex-1 bg-violet-600 hover:bg-violet-700"
									>
										Snap Photo
									</Button>
								</div>
							</div>
						) : selfie ? (
							<div className="space-y-4">
								<div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-violet-100 dark:border-violet-900 shadow-xl ring-4 ring-white dark:ring-zinc-900">
									<img
										src={URL.createObjectURL(selfie)}
										alt="Your selfie"
										className="w-full h-full object-cover"
									/>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setSelfie(null);
										if (!isMobile && !isSelfieUploadMode) startDesktopCamera();
									}}
									className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
								>
									Retake Selfie
								</Button>
							</div>
						) : (
							<div className="relative group cursor-pointer">
								{shouldUseFilePicker ? (
									<input
										type="file"
										accept="image/*"
										{...(!isSelfieUploadMode && isMobile
											? { capture: "user" as const }
											: {})}
										onChange={handleMobileSelfieSelect}
										className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
									/>
								) : (
									<div
										onClick={startDesktopCamera}
										className="absolute inset-0 w-full h-full cursor-pointer z-10"
									/>
								)}

								<div className="border-2 border-dashed border-violet-200 dark:border-violet-800 rounded-2xl p-8 bg-white dark:bg-zinc-800 group-hover:bg-violet-50 dark:group-hover:bg-violet-950 transition-all flex flex-col items-center justify-center gap-3">
									<div className="p-3 bg-violet-100 dark:bg-violet-900 rounded-full text-violet-600 dark:text-violet-400">
										{shouldUseFilePicker ? (
											<Upload className="w-6 h-6" />
										) : (
											<Video className="w-6 h-6" />
										)}
									</div>
									<div className="text-center">
										<p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
											{shouldUseFilePicker
												? isMobile
													? "Tap to upload a selfie"
													: "Click to upload a selfie"
												: "Click to take a selfie"}
										</p>
										<p className="text-xs text-zinc-400 mt-1">
											We don&apos;t save your face data.
										</p>
									</div>
								</div>
							</div>
						)}

						{isTurnstileEnabled && (
							<div className="flex justify-center my-4">
								<Turnstile
									key={turnstileWidgetKey}
									siteKey={turnstileSiteKey!}
									onSuccess={(token) => setTurnstileToken(token)}
									onExpire={() => setTurnstileToken(null)}
									onError={() => setTurnstileToken(null)}
								/>
							</div>
						)}

						<Button
							onClick={handleSearch}
							disabled={!selfie || isSearching || (isTurnstileEnabled && !turnstileToken)}
							className="w-full bg-violet-600 hover:bg-violet-700 text-white py-6 text-base font-bold shadow-lg transition-all"
						>
							{isSearching ? (
								<>
									<Loader2 className="w-5 h-5 mr-2 animate-spin" /> Scanning
									Album...
								</>
							) : (
								"Find My Photos"
							)}
						</Button>
					</div>
				</div>
			</div>

			<div className="flex-1 px-6 py-6 lg:px-12 lg:py-7 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
				<div className="max-w-6xl mx-auto space-y-12">
					{matchedPhotos.length > 0 && (
						<div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
							<div className="flex items-center gap-3 border-b border-violet-100 dark:border-violet-900 pb-4">
								<UserSearch className="w-6 h-6 text-violet-500" />
								<h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
									Your Photos
								</h2>
								<span className="bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400 text-sm font-bold px-4 py-1.5 rounded-full shadow-sm ml-auto">
									{matchedPhotos.length} Match
									{matchedPhotos.length === 1 ? "" : "es"}
								</span>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<Button
									variant={isGuestSelecting ? "secondary" : "outline"}
									size="sm"
									onClick={() => {
										setIsGuestSelecting(!isGuestSelecting);
										setGuestSelectedIds([]);
									}}
								>
									<CheckSquare className="w-4 h-4 mr-1.5" />
									{isGuestSelecting ? "Cancel" : "Select"}
								</Button>
								{isGuestSelecting && (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												if (guestSelectedIds.length === matchedPhotos.length) {
													setGuestSelectedIds([]);
												} else {
													setGuestSelectedIds(matchedPhotos.map((p) => p.id));
												}
											}}
										>
											{guestSelectedIds.length === matchedPhotos.length
												? "Deselect All"
												: "Select All"}
										</Button>
										<span className="text-sm text-zinc-500 font-medium">
											{guestSelectedIds.length} selected
										</span>
										<Button
											size="sm"
											disabled={
												guestSelectedIds.length === 0 || isDownloadingZip
											}
											onClick={() => handleGuestDownloadZip(matchedPhotos)}
											className="bg-violet-600 hover:bg-violet-700 text-white"
										>
											{isDownloadingZip ? (
												<Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
											) : (
												<Download className="w-4 h-4 mr-1.5" />
											)}
											Download Zip
										</Button>
									</>
								)}
							</div>

							<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
								{matchedPhotos.map((photo) => (
									<div
										key={photo.id}
										className={`group relative aspect-[4/5] bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg cursor-pointer transition-all duration-300
									${isGuestSelecting && guestSelectedIds.includes(photo.id) ? "ring-4 ring-violet-500 scale-[0.98]" : "border-2 border-violet-400 dark:border-violet-600"}`}
										onClick={() => {
											if (isGuestSelecting) {
												toggleGuestSelect(photo.id);
											} else {
												openFullScreen(photo, matchedPhotos);
											}
										}}
									>
										<img
											src={photo.viewUrl}
											alt="Matched Photo"
											className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
										/>

										{isGuestSelecting && (
											<div className="absolute top-3 right-3 z-10">
												<div
													className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md
													${guestSelectedIds.includes(photo.id) ? "bg-violet-600 border-violet-600" : "bg-black/30 border-white/80"}`}
												>
													{guestSelectedIds.includes(photo.id) && (
														<Check className="w-4 h-4 text-white" />
													)}
												</div>
											</div>
										)}

										{!isGuestSelecting && (
											<div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
												<div className="flex gap-2">
													<button
														onClick={(e) => {
															e.stopPropagation();
															openFullScreen(photo, matchedPhotos);
														}}
														className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
														title="View Full Screen"
													>
														<Maximize2 className="w-4 h-4 text-zinc-800" />
													</button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															handleDownloadSingle(photo);
														}}
														className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
														title="Download"
													>
														<Download className="w-4 h-4 text-zinc-800" />
													</button>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					<div className="space-y-6">
						<div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-7">
							<div className="flex items-center gap-3">
								<Images className="w-6 h-6 text-zinc-400" />
								<h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
									Album Gallery
								</h2>
							</div>
							<span className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">
								{publicPhotos.length}{" "}
								{publicPhotos.length === 1 ? "Photo" : "Photos"}
							</span>
						</div>

						{publicPhotos.length === 0 ? (
							<div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 border-dashed">
								<ImageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
								<h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-1">
									No public photos yet
								</h3>
								<p className="text-zinc-500 text-sm max-w-xs mx-auto">
									The host hasn&apos;t shared any photos publicly yet. Take a
									selfie above to find protected photos that match your face!
								</p>
							</div>
						) : (
							<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
								{publicPhotos.map((photo) => (
									<div
										key={photo.id}
										className="group relative aspect-[4/5] bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-all duration-300"
										onClick={() => openFullScreen(photo, publicPhotos)}
									>
										<img
											src={photo.viewUrl}
											alt="Public Album Photo"
											className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
										/>
										<div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
											<div className="flex gap-2">
												<button
													onClick={(e) => {
														e.stopPropagation();
														openFullScreen(photo, publicPhotos);
													}}
													className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
													title="View Full Screen"
												>
													<Maximize2 className="w-4 h-4 text-zinc-800" />
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleDownloadSingle(photo);
													}}
													className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
													title="Download"
												>
													<Download className="w-4 h-4 text-zinc-800" />
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{fullScreenPhoto && (
				<div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
					<button
						onClick={() => setFullScreenPhoto(null)}
						className="absolute top-5 right-5 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
					>
						<X className="w-6 h-6" />
					</button>

					<button
						onClick={() => handleDownloadSingle(fullScreenPhoto)}
						className="absolute top-5 right-20 p-3 bg-white/10 hover:bg-violet-600 rounded-full text-white transition-colors z-10"
						title="Download this photo"
					>
						<Download className="w-5 h-5" />
					</button>

					{fullScreenList.findIndex((p) => p.id === fullScreenPhoto.id) > 0 && (
						<button
							onClick={() => navigateFullScreen("prev")}
							className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
						>
							<ChevronLeft className="w-6 h-6" />
						</button>
					)}

					{fullScreenList.findIndex((p) => p.id === fullScreenPhoto.id) <
						fullScreenList.length - 1 && (
						<button
							onClick={() => navigateFullScreen("next")}
							className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
						>
							<ChevronRight className="w-6 h-6" />
						</button>
					)}

					<div className="relative max-w-6xl w-full h-[85vh] flex items-center justify-center p-4">
						<img
							src={fullScreenPhoto.viewUrl}
							alt="Full Screen"
							className="max-w-full max-h-full object-contain rounded-sm shadow-2xl"
						/>
					</div>

					<div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
						{fullScreenList.findIndex((p) => p.id === fullScreenPhoto.id) + 1} /{" "}
						{fullScreenList.length}
					</div>
				</div>
			)}
		</div>
	);
}
