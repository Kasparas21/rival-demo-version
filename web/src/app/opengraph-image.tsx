import { ImageResponse } from "next/og";

export const alt = "Spy Rival — AI Competitor Ad Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(145deg, #f8f9fc 0%, #eef2f8 55%, #e8edf6 100%)",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#1a1a2e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            R
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#1a1a2e", letterSpacing: -1 }}>
            Spy Rival
          </div>
        </div>
        <div style={{ fontSize: 34, color: "#475569", maxWidth: 820, lineHeight: 1.35 }}>
          AI competitor ad intelligence — track creatives, funnels, and strategy shifts.
        </div>
        <div style={{ marginTop: 36, fontSize: 24, color: "#64748b" }}>spy-rival.com</div>
      </div>
    ),
    { ...size }
  );
}
