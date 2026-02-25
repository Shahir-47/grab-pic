"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Camera,
	Upload,
	Loader2,
	Image as ImageIcon,
	Video,
	Images,
	UserSearch,
} from "lucide-react";

interface Photo {
	id: string;
	viewUrl: string;
	isPublic: boolean;
	processed: boolean;
}

export default function GuestWelcomePage() {
	const params = useParams<{ id: string }>();
	const albumId = params?.id || "";

	const [albumTitle, setAlbumTitle] = useState("");
	const [publicPhotos, setPublicPhotos] = useState<Photo[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const [selfie, setSelfie] = useState<File | null>(null);
	const [isSearching, setIsSearching] = useState(false);

	const [isMobile, setIsMobile] = useState(true);
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

	const handleSearch = async () => {
		if (!selfie) return;
		setIsSearching(true);
		setTimeout(() => {
			alert("Ready to build the AI Search Engine backend!");
			setIsSearching(false);
		}, 1500);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
				<Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
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
			{/* LEFT SIDEBAR: The Scanner */}
			<div className="w-full lg:w-[450px] shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col items-center justify-center p-8 lg:p-10 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
				<div className="w-full max-w-sm space-y-8 text-center">
					<div>
						<div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
							<Camera className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
						</div>
						<h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
							{albumTitle}
						</h1>
						<p className="text-zinc-500 mt-3 text-sm leading-relaxed">
							Welcome! You can browse the public gallery, or use our AI to
							instantly find all the hidden photos you are in.
						</p>
					</div>

					<div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-6">
						<div className="flex items-center justify-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
							<UserSearch className="w-4 h-4 text-indigo-500" />
							AI Photo Finder
						</div>

						{isCameraOpen && !selfie ? (
							<div className="space-y-4">
								<div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-indigo-500/30 shadow-lg bg-black">
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
										className="flex-1 bg-indigo-600 hover:bg-indigo-700"
									>
										Snap Photo
									</Button>
								</div>
							</div>
						) : selfie ? (
							<div className="space-y-4">
								<div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-900 shadow-xl ring-4 ring-white dark:ring-zinc-900">
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
										if (!isMobile) startDesktopCamera();
									}}
									className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
								>
									Retake Selfie
								</Button>
							</div>
						) : (
							<div className="relative group cursor-pointer">
								{isMobile ? (
									<input
										type="file"
										accept="image/*"
										capture="user"
										onChange={handleMobileSelfieSelect}
										className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
									/>
								) : (
									<div
										onClick={startDesktopCamera}
										className="absolute inset-0 w-full h-full cursor-pointer z-10"
									/>
								)}

								<div className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-8 bg-white dark:bg-zinc-800/50 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-all flex flex-col items-center justify-center gap-3">
									<div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-600 dark:text-indigo-400">
										{isMobile ? (
											<Upload className="w-6 h-6" />
										) : (
											<Video className="w-6 h-6" />
										)}
									</div>
									<div className="text-center">
										<p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
											{isMobile
												? "Tap to open camera"
												: "Click to take a selfie"}
										</p>
										<p className="text-xs text-zinc-400 mt-1">
											We don&apos;t save your face data.
										</p>
									</div>
								</div>
							</div>
						)}

						<Button
							onClick={handleSearch}
							disabled={!selfie || isSearching}
							className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-base font-bold shadow-xl shadow-indigo-500/20 transition-all"
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

			{/* RIGHT MAIN AREA: The Public Gallery */}
			<div className="flex-1 p-6 lg:p-12 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50">
				<div className="max-w-6xl mx-auto space-y-8">
					<div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
						<div className="flex items-center gap-3">
							<Images className="w-6 h-6 text-zinc-400" />
							<h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
								Event Gallery
							</h2>
						</div>
						<span className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">
							{publicPhotos.length}{" "}
							{publicPhotos.length === 1 ? "Photo" : "Photos"}
						</span>
					</div>

					{publicPhotos.length === 0 ? (
						<div className="text-center py-32 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 border-dashed">
							<ImageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
							<h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-1">
								No public photos yet
							</h3>
							<p className="text-zinc-500 text-sm max-w-xs mx-auto">
								The host hasn&apos;t made any photos public. Take a selfie to
								find your private photos!
							</p>
						</div>
					) : (
						<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
							{publicPhotos.map((photo) => (
								<div
									key={photo.id}
									className="group relative aspect-[4/5] bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-all duration-300"
									onClick={() => window.open(photo.viewUrl, "_blank")}
								>
									<img
										src={photo.viewUrl}
										alt="Public Event Photo"
										className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
									/>
									<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
