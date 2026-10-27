import type { NextConfig } from "next";

const securityHeaders = [
  // SAMEORIGIN：Firebase 登入元件會以同網域的 iframe（/__/auth/iframe）運作
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

// Google 登入改走自己的網域：把 /__/auth/* 轉到 Firebase 的登入處理頁。
// Safari 會擋第三方網域的登入狀態，同網域才能可靠地使用整頁跳轉登入。
const firebaseAuthHost = `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-ems"}.firebaseapp.com`;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: `${firebaseAuthHost}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `${firebaseAuthHost}/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;
