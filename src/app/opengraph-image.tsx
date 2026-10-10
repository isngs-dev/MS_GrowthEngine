import { ImageResponse } from "next/og";

export const alt = "MS Growth Engine by iSN Business Solutions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          color: "white",
          background: "radial-gradient(90% 120% at 80% 30%, #4a2f20 0%, #2a1c13 45%, #1a120d 100%)",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 6, color: "#ffc4a0", display: "flex" }}>MS GROWTH ENGINE</div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, marginTop: 28, display: "flex", flexWrap: "wrap" }}>
          From First Click to Booked Call. Automatically.
        </div>
        <div style={{ fontSize: 30, marginTop: 40, color: "#cdb9a5", display: "flex" }}>by iSN Business Solutions</div>
      </div>
    ),
    size,
  );
}
