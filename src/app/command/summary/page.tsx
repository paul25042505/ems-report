import { getEventDashboard, resolveEvent } from "@/lib/dashboard";
import {
  AGE_GROUPS,
  DEPARTMENTS,
  DISPOSITIONS,
  PATIENT_TYPES,
  SEXES,
  ageGroupLabel,
  departmentLabel,
  symptomLabel,
  symptomsOf,
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

function topSymptom(byCategory: Record<string, number>, dept: string) {
  return symptomsOf(dept)
    .filter((s) => byCategory[s.value])
    .sort((a, b) => byCategory[b.value] - byCategory[a.value])[0]?.value;
}

/** 傷病類別：內科、外科各自小計，下面列出有人數的症狀（由多到少） */
function DepartmentBreakdown({
  byDepartment,
  byCategory,
  total,
}: {
  byDepartment: Record<string, number>;
  byCategory: Record<string, number>;
  total: number;
}) {
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const depts = [...DEPARTMENTS.map((x) => x.value as string), ...(byDepartment.UNKNOWN ? ["UNKNOWN"] : [])];
  return (
    <section className="card">
      <h2 className="mb-2 text-base">傷病類別（內外科）</h2>
      <table className="table">
        <tbody>
          {depts.map((dept) => {
            const n = byDepartment[dept] ?? 0;
            const rows =
              dept === "UNKNOWN"
                ? []
                : symptomsOf(dept)
                    .filter((s) => byCategory[s.value])
                    .sort((a, b) => byCategory[b.value] - byCategory[a.value]);
            return [
              <tr key={dept} className="bg-slate-50 font-bold">
                <td>{departmentLabel(dept)} 小計</td>
                <td className="text-right tabular-nums">{n} 人</td>
                <td className="w-16 text-right tabular-nums">{pct(n)}%</td>
              </tr>,
              ...rows.map((s) => (
                <tr key={s.value}>
                  <td className="pl-8">{s.label}</td>
                  <td className="text-right tabular-nums">{byCategory[s.value]} 人</td>
                  <td className="w-16 text-right text-slate-500 tabular-nums">{pct(byCategory[s.value])}%</td>
                </tr>
              )),
            ];
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
              依科別分，
              {DEPARTMENTS.map((dept, i) => {
                const n = d.byDepartment[dept.value] ?? 0;
                const top = topSymptom(d.byCategory, dept.value);
                return (
                  <span key={dept.value}>
                    {i > 0 && "；"}
                    {dept.label} <strong>{n}</strong> 人（{Math.round((n / total) * 100)}%）
                    {top && `，最常見為「${symptomLabel(top)}」`}
                  </span>
                );
              })}
              。
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

      <DepartmentBreakdown byDepartment={d.byDepartment} byCategory={d.byCategory} total={total} />

      <div className="grid gap-3 md:grid-cols-2">
        <Breakdown title="去向" data={d.byDisposition} order={DISPOSITIONS.map((c) => c.value)} labelOf={dispositionLabel} total={total} />
        <Breakdown title="身分" data={d.byPatientType} order={PATIENT_TYPES.map((c) => c.value)} labelOf={patientTypeLabel} total={total} />
        <Breakdown title="年齡層" data={d.byAgeGroup} order={AGE_GROUPS.map((c) => c.value)} labelOf={ageGroupLabel} total={total} />
        <Breakdown title="性別" data={d.bySex} order={SEXES.map((c) => c.value)} labelOf={sexLabel} total={total} />
      </div>
    </>
  );
}
