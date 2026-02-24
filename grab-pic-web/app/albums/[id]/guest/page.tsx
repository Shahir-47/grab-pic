"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Image as ImageIcon } from "lucide-react";

export default function GuestWelcomePage() {
	const params = useParams<{ id: string }>();
	const albumId = params?.id || "";

	const [albumTitle, setAlbumTitle] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const [selfie, setSelfie] = useState<File | null>(null);
	const [isSearching, setIsSearching] = useState(false);

	useEffect(() => {
		const fetchAlbumDetails = async () => {
			try {
				const res = await fetch(
					`http://localhost:8080/api/albums/${albumId}/guest/details`,
				);

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

	const handleSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setSelfie(e.target.files[0]);
		}
	};

	const handleSearch = async () => {
		if (!selfie) return;
		setIsSearching(true);

		// --- NEXT STEP LOGIC GOES HERE ---
		// 1. Upload this selfie to a temporary bucket
		// 2. Extract the 128-D face embedding
		// 3. PostgreSQL vector search (Cosine Distance)
		// 4. Show the matching photos!

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

				{/* Selfie Upload Area */}
				<div className="space-y-4">
					{!selfie ? (
						<div className="relative group cursor-pointer">
							<input
								type="file"
								accept="image/*"
								// MAGIC TRICK: "capture=user" forces mobile devices to instantly open the front-facing selfie camera!
								capture="user"
								onChange={handleSelfieSelect}
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
							/>
							<div className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-8 bg-indigo-50/50 dark:bg-indigo-900/10 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors flex flex-col items-center justify-center gap-3">
								<Upload className="w-6 h-6 text-indigo-500" />
								<span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
									Tap to take a selfie
								</span>
							</div>
						</div>
					) : (
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
								onClick={() => setSelfie(null)}
								className="text-xs"
							>
								Retake Selfie
							</Button>
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
