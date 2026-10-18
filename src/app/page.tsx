import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-5xl text-red-700">✚</p>
          <h1 className="text-2xl">救護站回報系統</h1>
          <p className="text-sm text-slate-600">國防知性之旅</p>
        </div>
        <div className="grid gap-4">
          <Link href="/station" className="btn-primary py-8 text-2xl">
            站點人員
          </Link>
          <Link href="/command" className="btn-dark py-8 text-2xl">
            指揮中心
          </Link>
        </div>
      </div>
    </main>
  );
}
