import { ImageResponse } from "next/og";

// iPhone 加入主畫面時使用的圖示
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#b91c1c" }}>
        <div style={{ position: "absolute", width: 36, height: 110, background: "white" }} />
        <div style={{ position: "absolute", width: 110, height: 36, background: "white" }} />
      </div>
    ),
    size,
  );
}
