import type { MetadataRoute } from "next";

/** 加入手機主畫面後以獨立 App 的方式開啟 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "救護站回報系統",
    short_name: "救護站回報",
    description: "國防知性之旅 救護站傷患、物資與支援即時回報",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5f9",
    theme_color: "#991b1b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
