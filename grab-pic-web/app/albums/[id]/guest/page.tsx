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
} from "lucide-react";

export default function GuestWelcomePage() {
	const params = useParams<{ id: string }>();
	const albumId = params?.id || "";

	const [albumTitle, setAlbumTitle] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const [selfie, setSelfie] = useState<File | null>(null);
	const [isSearching, setIsSearching] = useState(false);

	const [isMobile, setIsMobile] = useState(true);
	const [isCameraOpen, setIsCameraOpen] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	// Check if the user is on a mobile device on load
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

	// Clean up camera on unmount
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
			// Draw the current video frame onto the canvas
			ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

			// Convert the canvas to a JPEG Blob, then to a File object
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
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 lg:p-10">
			<div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-8">
				{/* Header */}
				<div>
					<div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
						<Camera className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
						{albumTitle}
					</h1>
					<p className="text-zinc-500 mt-2 text-sm">
						Take a quick selfie to instantly find all the photos you are in from
						this event.
					</p>
				</div>

				{/* Camera / Upload Area */}
				<div className="space-y-4">
					{isCameraOpen && !selfie ? (
						<div className="space-y-4">
							<div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-900 shadow-lg bg-black">
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted
									className="w-full h-full object-cover transform scale-x-[-1]"
								/>
							</div>
							<div className="flex gap-2 justify-center">
								<Button onClick={stopCamera} variant="outline" size="sm">
									Cancel
								</Button>
								<Button
									onClick={takeDesktopPhoto}
									className="bg-indigo-600 hover:bg-indigo-700"
								>
									Snap Photo
								</Button>
							</div>
						</div>
					) : selfie ? (
						<div className="space-y-4">
							<div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-900 shadow-lg">
								<img
									src={URL.createObjectURL(selfie)}
									alt="Your selfie"
									className="w-full h-full object-cover"
								/>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setSelfie(null);
									if (!isMobile) startDesktopCamera();
								}}
								className="text-xs"
							>
								Retake Selfie
							</Button>
						</div>
					) : (
						<div className="relative group cursor-pointer">
							{isMobile ? (
								/* Mobile Input Overlay */
								<input
									type="file"
									accept="image/*"
									capture="user"
									onChange={handleMobileSelfieSelect}
									className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
								/>
							) : (
								/* Desktop Click Handler */
								<div
									onClick={startDesktopCamera}
									className="absolute inset-0 w-full h-full cursor-pointer z-10"
								/>
							)}

							<div className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-8 bg-indigo-50/50 dark:bg-indigo-900/10 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors flex flex-col items-center justify-center gap-3">
								{isMobile ? (
									<Upload className="w-6 h-6 text-indigo-500" />
								) : (
									<Video className="w-6 h-6 text-indigo-500" />
								)}
								<span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
									{isMobile ? "Tap to open camera" : "Click to take a selfie"}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Action Button */}
				<Button
					onClick={handleSearch}
					disabled={!selfie || isSearching}
					className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg shadow-xl shadow-indigo-500/20"
				>
					{isSearching ? (
						<>
							<Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing
							Face...
						</>
					) : (
						"Find My Photos"
					)}
				</Button>
			</div>
		</div>
	);
}
