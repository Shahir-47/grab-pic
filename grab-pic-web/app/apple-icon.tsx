import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
	return new ImageResponse(
		(
			<div
				style={{
					width: 180,
					height: 180,
					borderRadius: 36,
					background: "#7c3aed",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<svg
					viewBox="0 0 32 32"
					width="120"
					height="120"
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
					<line
						x1="16"
						y1="3"
						x2="16"
						y2="8"
						stroke="white"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<line
						x1="4.74"
						y1="22.5"
						x2="9.07"
						y2="18.5"
						stroke="white"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<line
						x1="27.26"
						y1="22.5"
						x2="22.93"
						y2="18.5"
						stroke="white"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<circle cx="16" cy="16" r="3" fill="white" />
				</svg>
			</div>
		),
		{ ...size }
	);
}
