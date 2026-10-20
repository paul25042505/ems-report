import { GoogleLoginButton } from "./login-button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-5xl text-red-700">✚</p>
          <h1 className="text-2xl">救護站回報系統</h1>
          <p className="text-sm text-slate-600">國防知性之旅</p>
        </div>
        <div className="card space-y-3">
          <GoogleLoginButton />
          <p className="text-center text-xs text-slate-500">第一次使用請先登入，再填寫申請資料，經管理員核准後即可使用</p>
        </div>
      </div>
    </main>
  );
}
