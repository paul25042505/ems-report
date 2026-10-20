"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

/** App 內建瀏覽器（LINE、Facebook、Instagram、WeChat 等）無法使用 Google 登入 */
const IN_APP_BROWSER = /Line\/|FBAN|FBAV|Instagram|MicroMessenger|; wv\)/i;

export function GoogleLoginButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    // LINE 支援 openExternalBrowser=1，會自動改用手機的預設瀏覽器開啟
    if (/Line\//i.test(ua) && !location.search.includes("openExternalBrowser")) {
      location.replace(`${location.origin}/login?openExternalBrowser=1`);
      return;
    }
    setInApp(IN_APP_BROWSER.test(ua));
  }, []);

  async function login() {
    setError("");
    setPending(true);
    const auth = clientAuth();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await cred.user.getIdToken() }),
      });
      // 伺服器已發 session cookie，瀏覽器端的 Firebase 登入狀態不再需要
      await signOut(auth);
      if (!res.ok) {
        setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "登入失敗");
        return;
      }
      const { approved } = (await res.json()) as { approved?: boolean };
      router.replace(approved ? "/" : "/apply");
      router.refresh();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError(`登入失敗，請再試一次（${code ?? (e as Error).message}）`);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {inApp && (
        <div role="alert" className="space-y-2 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-semibold">請用 Chrome 或 Safari 開啟</p>
          <p>目前是在 App 內建的瀏覽器（例如 LINE、Facebook），無法使用 Google 登入。請點右上角「⋮」或「分享」選擇「用瀏覽器開啟」，或複製網址貼到 Chrome／Safari。</p>
          <button
            type="button"
            className="btn-secondary btn-sm w-full"
            onClick={async () => {
              await navigator.clipboard?.writeText(`${location.origin}/login`).catch(() => {});
              setCopied(true);
            }}
          >
            {copied ? "已複製網址" : "複製網址"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
      <button type="button" onClick={login} disabled={pending} className="btn-secondary w-full py-4 text-lg">
        <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {pending ? "登入中…" : "使用 Google 帳號登入"}
      </button>
    </div>
  );
}
