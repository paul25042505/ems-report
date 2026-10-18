import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homePathFor } from "@/lib/access";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homePathFor(session.role));

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-4xl text-red-700">✚</p>
          <h1 className="text-2xl">救護站回報系統</h1>
          <p className="text-sm text-slate-600">國防知性之旅</p>
        </div>
        <div className="card">
          <h2 className="mb-3">指揮中心／管理員登入</h2>
          <LoginForm />
        </div>
        <p className="text-center text-sm text-slate-600">站點人員請直接掃描各站的 QR Code 登入</p>
      </div>
    </main>
  );
}
