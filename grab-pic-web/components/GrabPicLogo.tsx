"use client";

/**
 * GrabPic brand logo — a distinctive aperture/viewfinder mark
 * that reflects the AI-powered photo recognition identity.
 */

interface GrabPicLogoProps {
	size?: "sm" | "md" | "lg" | "xl";
	showText?: boolean;
	className?: string;
}

const sizeMap = {
	sm: { icon: "w-7 h-7", pad: "p-1.5", text: "text-lg", ring: 1.5 },
	md: { icon: "w-8 h-8", pad: "p-2", text: "text-xl", ring: 2 },
	lg: { icon: "w-10 h-10", pad: "p-2.5", text: "text-2xl", ring: 2.5 },
	xl: { icon: "w-16 h-16", pad: "p-4", text: "text-4xl", ring: 3 },
};

export default function GrabPicLogo({
	size = "md",
	showText = true,
	className = "",
}: GrabPicLogoProps) {
	const s = sizeMap[size];

	return (
		<div className={`flex items-center gap-2.5 ${className}`}>
			{/* The Mark — a stylized viewfinder/aperture with inner dot */}
			<div
				className={`${s.pad} rounded-xl bg-violet-600 dark:bg-violet-500 relative overflow-hidden`}
			>
				<svg
					viewBox="0 0 32 32"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={s.icon}
				>
					{/* Outer ring */}
					<circle
						cx="16"
						cy="16"
						r="13"
						stroke="white"
						strokeWidth={s.ring}
						strokeLinecap="round"
						strokeDasharray="6 4"
						opacity="0.5"
					/>
					{/* Inner lens */}
					<circle cx="16" cy="16" r="8" stroke="white" strokeWidth={s.ring} />
					{/* Aperture blades — 3 lines converging */}
					<line
						x1="16"
						y1="3"
						x2="16"
						y2="8"
						stroke="white"
						strokeWidth={s.ring}
						strokeLinecap="round"
					/>
					<line
						x1="4.74"
						y1="22.5"
						x2="9.07"
						y2="18.5"
						stroke="white"
						strokeWidth={s.ring}
						strokeLinecap="round"
					/>
					<line
						x1="27.26"
						y1="22.5"
						x2="22.93"
						y2="18.5"
						stroke="white"
						strokeWidth={s.ring}
						strokeLinecap="round"
					/>
					{/* Center dot — the "eye" */}
					<circle cx="16" cy="16" r="2.5" fill="white" />
				</svg>
			</div>

			{showText && (
				<span
					className={`${s.text} font-black tracking-tighter text-zinc-900 dark:text-zinc-50 select-none`}
				>
					Grab
					<span className="text-violet-600 dark:text-violet-400">Pic</span>
				</span>
			)}
		</div>
	);
}
