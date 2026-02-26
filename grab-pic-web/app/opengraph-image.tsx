import { ImageResponse } from "next/og";

export const alt = "GrabPic — AI Photo Sharing for Events";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					background: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)",
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 80,
						height: 80,
						borderRadius: 20,
						background: "#7c3aed",
						marginBottom: 32,
					}}
				>
					<svg
						viewBox="0 0 32 32"
						width="52"
						height="52"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle
							cx="16"
							cy="16"
							r="13"
							stroke="white"
							strokeWidth="2"
							strokeLinecap="round"
							strokeDasharray="6 4"
							opacity="0.5"
						/>
						<circle cx="16" cy="16" r="8" stroke="white" strokeWidth="2" />
						<line x1="16" y1="3" x2="16" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
						<line x1="4.74" y1="22.5" x2="9.07" y2="18.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
						<line x1="27.26" y1="22.5" x2="22.93" y2="18.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
						<circle cx="16" cy="16" r="3" fill="white" />
					</svg>
				</div>

				<div
					style={{
						fontSize: 64,
						fontWeight: 900,
						color: "white",
						letterSpacing: "-0.04em",
						marginBottom: 16,
					}}
				>
					GrabPic
				</div>

				<div
					style={{
						fontSize: 28,
						color: "#a78bfa",
						fontWeight: 600,
						marginBottom: 24,
					}}
				>
					AI Photo Sharing for Events
				</div>

				<div
					style={{
						fontSize: 20,
						color: "#a1a1aa",
						maxWidth: 640,
						textAlign: "center",
						lineHeight: 1.5,
					}}
				>
					Upload event photos. Share one link. Each guest takes a selfie and
					instantly finds every photo they appear in.
				</div>
			</div>
		),
		{ ...size }
	);
}
