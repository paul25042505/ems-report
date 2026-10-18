import Link from "next/link";
import { getEvent, getStationByToken } from "@/lib/repo";
import { JoinForm } from "./join-form";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const station = await getStationByToken(token);
  const event = station && (await getEvent(station.eventId));

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-4xl text-red-700">✚</p>
          <h1 className="text-2xl">救護站登入</h1>
        </div>
        <div className="card">
          {station && event ? (
            <>
              <p className="text-sm text-slate-600">{event.name}</p>
              <h2 className="mb-4 text-2xl">{station.name}</h2>
              <JoinForm token={token} />
            </>
          ) : (
            <div className="space-y-3">
              <p className="font-semibold text-red-700">此 QR Code 已失效或不存在。</p>
              <p className="text-sm text-slate-600">請向指揮中心索取最新的站點 QR Code。</p>
              <Link href="/login" className="btn-secondary w-full">
                回登入頁
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
