import { db } from "@/lib/db";
import { requireReporter } from "@/lib/auth";
import { AddSupplyForm, SupplyRow } from "./supply-forms";

export default async function SuppliesPage() {
  const { station } = await requireReporter();
  const supplies = await db.supply.findMany({ where: { stationId: station.id }, orderBy: { name: "asc" } });

  return (
    <>
      <section className="card">
        <h1>物資存量</h1>
        <p className="text-sm text-slate-600">調整數量後按「儲存」。低於安全存量會通知指揮中心。</p>
        <ul className="divide-y divide-slate-100">
          {supplies.map((s) => (
            // key 帶數量：伺服器資料更新後重設輸入框
            <SupplyRow key={`${s.id}:${s.quantity}`} supply={s} />
          ))}
        </ul>
      </section>
      <section className="card">
        <h2 className="mb-3">新增物資品項</h2>
        <AddSupplyForm />
      </section>
    </>
  );
}
