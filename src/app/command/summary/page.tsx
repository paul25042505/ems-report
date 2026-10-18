import { getEventDashboard, resolveEvent } from "@/lib/dashboard";
import {
  AGE_GROUPS,
  CATEGORIES,
  DISPOSITIONS,
  PATIENT_TYPES,
  SEXES,
  ageGroupLabel,
  categoryLabel,
  dispositionLabel,
  patientTypeLabel,
  sexLabel,
} from "@/lib/constants";
import { formatDateTime, toLocalDateInput } from "@/lib/time";
import { HourlyChart } from "@/components/charts";
import { NoEvent } from "../no-event";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function Breakdown({
  title,
  data,
  order,
  labelOf,
  total,
}: {
  title: string;
  data: Record<string, number>;
  order: readonly (string | number)[];
  labelOf: (k: string) => string;
  total: number;
}) {
  return (
    <section className="card">
      <h2 className="mb-2 text-base">{title}</h2>
      <table className="table">
        <tbody>
          {order.map((k) => {
            const v = data[String(k)] ?? 0;
            return (
              <tr key={k}>
                <td>{labelOf(String(k))}</td>
                <td className="text-right tabular-nums">{v} 人</td>
                <td className="w-16 text-right text-slate-500 tabular-nums">{total ? Math.round((v / total) * 100) : 0}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default async function SummaryPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: eventId } = await searchParams;
  const event = await resolveEvent(eventId);
  if (!event) return <NoEvent />;
  const d = await getEventDashboard(event.id);
  const total = d.totals.total;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1>醫療救護成果報告</h1>
          <p className="text-slate-700">{event.name}</p>
          <p className="text-sm text-slate-500">
            {event.venue}｜{toLocalDateInput(event.startDate)} ~ {toLocalDateInput(event.endDate)}｜產製時間 {formatDateTime(new Date())}
          </p>
        </div>
        <PrintButton />
      </div>

      <section className="card">
        <h2 className="mb-2 text-base">總覽</h2>
        <p className="leading-relaxed">
          本場次共設置救護站 <strong>{d.stations.length}</strong> 處，累計服務 <strong>{total}</strong> 人次；
          其中處置後離站 <strong>{d.totals.released}</strong> 人、後送醫院 <strong>{d.totals.transferred}</strong> 人、
          拒絕就醫 <strong>{d.totals.refused}</strong> 人、仍留站觀察 <strong>{d.totals.observing}</strong> 人。
          {total > 0 && (
            <>
              最常見傷病為「{categoryLabel(Object.entries(d.byCategory).sort((a, b) => b[1] - a[1])[0][0])}」。
            </>
          )}
        </p>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-2 text-base">各站統計</h2>
        <table className="table">
          <thead>
            <tr>
              <th>站點</th>
              <th className="text-right">人次</th>
              <th className="text-right">離站</th>
              <th className="text-right">後送</th>
              <th className="text-right">拒絕就醫</th>
              <th className="text-right">留觀</th>
            </tr>
          </thead>
          <tbody>
            {d.stations.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="text-right tabular-nums">{s.totals.total}</td>
                <td className="text-right tabular-nums">{s.totals.released}</td>
                <td className="text-right tabular-nums">{s.totals.transferred}</td>
                <td className="text-right tabular-nums">{s.totals.refused}</td>
                <td className="text-right tabular-nums">{s.totals.observing}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td>合計</td>
              <td className="text-right tabular-nums">{total}</td>
              <td className="text-right tabular-nums">{d.totals.released}</td>
              <td className="text-right tabular-nums">{d.totals.transferred}</td>
              <td className="text-right tabular-nums">{d.totals.refused}</td>
              <td className="text-right tabular-nums">{d.totals.observing}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <HourlyChart data={d.hourly} />

      <div className="grid gap-3 md:grid-cols-2">
        <Breakdown title="傷病類別" data={d.byCategory} order={CATEGORIES.map((c) => c.value)} labelOf={categoryLabel} total={total} />
        <Breakdown title="去向" data={d.byDisposition} order={DISPOSITIONS.map((c) => c.value)} labelOf={dispositionLabel} total={total} />
        <Breakdown title="身分" data={d.byPatientType} order={PATIENT_TYPES.map((c) => c.value)} labelOf={patientTypeLabel} total={total} />
        <Breakdown title="年齡層" data={d.byAgeGroup} order={AGE_GROUPS.map((c) => c.value)} labelOf={ageGroupLabel} total={total} />
        <Breakdown title="性別" data={d.bySex} order={SEXES.map((c) => c.value)} labelOf={sexLabel} total={total} />
      </div>
    </>
  );
}
