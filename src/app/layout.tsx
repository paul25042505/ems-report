import type { Metadata, Viewport } from "next";
import { NoZoom } from "@/components/no-zoom";
import "./globals.css";

export const metadata: Metadata = {
  title: "救護站回報系統｜國防知性之旅",
  description: "國防知性之旅 救護站傷患、物資與支援即時回報",
  applicationName: "救護站回報",
  // 加入主畫面後以全螢幕開啟，像手機 App 一樣
  appleWebApp: { capable: true, title: "救護站回報", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 固定畫面比例，不能放大縮小
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#991b1b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen">
        <NoZoom />
        {children}
      </body>
    </html>
  );
}
