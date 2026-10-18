import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { PrintButton } from "@/app/command/summary/print-button";
import { deleteStation, regenerateToken } from "../../actions";
import { StationForm } from "../../admin-forms";

export const dynamic = "force-dynamic";

async function baseUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function StationAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const station = await db.station.findUnique({
    where: { id },
    include: { event: true, _count: { select: { patients: true } } },
  });
  if (!station) notFound();

  const joinUrl = `${await baseUrl()}/join/${station.joinToken}`;
  const qr = await QRCode.toDataURL(joinUrl, { width: 480, margin: 1, errorCorrectionLevel: "M" });

  return (
    <>
      <Link href={`/admin?event=${station.eventId}`} className="no-print text-sm text-red-700 hover:underline">
        ← 返回 {station.event.name}
      </Link>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 text-center">
          <p className="text-sm text-slate-600">{station.event.name}</p>
          <h1 className="text-3xl">{station.name}</h1>
          <p className="text-slate-600">站點人員請掃描下方 QR Code 登入回報</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`${station.name} 登入 QR Code`} className="mx-auto w-64 sm:w-80" />
          <p className="text-xs break-all text-slate-500">{joinUrl}</p>
          <div className="no-print flex flex-wrap justify-center gap-2">
            <PrintButton />
            <form action={regenerateToken.bind(null, station.id)}>
              <button className="btn-secondary btn-sm">重新產生 QR Code</button>
            </form>
          </div>
          <p className="no-print text-xs text-slate-500">QR Code 外流時請重新產生，舊的 QR Code 與已登入的裝置會立即失效。</p>
        </section>

        <div className="no-print space-y-4">
          <section className="card">
            <h2 className="mb-2">站點資料</h2>
            <StationForm eventId={station.eventId} station={station} />
          </section>
          {station._count.patients === 0 && (
            <section className="card">
              <h2 className="mb-2 text-base">刪除救護站</h2>
              <p className="mb-2 text-sm text-slate-600">此站尚無傷患紀錄，可以刪除。已有紀錄的站請改為「已撤站」。</p>
              <form action={deleteStation.bind(null, station.id)}>
                <button className="btn btn-sm bg-red-100 text-red-800 hover:bg-red-200">刪除此站</button>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
