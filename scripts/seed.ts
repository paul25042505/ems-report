// 用法（需先設定 FIRESTORE_EMULATOR_HOST 指向模擬器，或在可存取 Firestore 的環境執行）：
//   npm run db:seed        若沒有任何帳號，依 ADMIN_USERNAME / ADMIN_PASSWORD 建立管理員
//   npm run db:seed:demo   另外建立示範場次、3 個救護站、示範傷患與申請（開發／教育訓練用）
// 正式環境不需要執行：第一次登入時會自動建立初始管理員。
import bcrypt from "bcryptjs";
import { ensureInitialAdmin } from "../src/lib/bootstrap";
import { DEFAULT_SUPPLIES } from "../src/lib/constants";
import * as repo from "../src/lib/repo";

async function ensureAdmin() {
  if (await ensureInitialAdmin()) console.log(`已建立管理員帳號：${process.env.ADMIN_USERNAME || "admin"}`);
  else if (!(await repo.hasAnyUser())) throw new Error("請設定 ADMIN_PASSWORD（至少 8 碼）以建立初始管理員");
}

async function seedDemo() {
  if ((await repo.listEvents()).some((e) => e.name.includes("示範"))) {
    console.log("示範資料已存在，略過");
    return;
  }

  await repo.createUser({ username: "command", displayName: "指揮官（示範）", role: "COMMAND", passwordHash: await bcrypt.hash("command1234", 10) });

  const now = new Date();
  const eventId = await repo.createEvent({
    name: "2026 國防知性之旅（示範營區）",
    venue: "示範營區",
    startDate: new Date(now.getTime() - 6 * 3600_000),
    endDate: new Date(now.getTime() + 6 * 3600_000),
  });
  await repo.activateEvent(eventId);

  const defs = [
    { name: "主站", location: "司令台旁醫療帳篷", lat: 25.0418, lng: 121.5199, contactName: "李醫官", contactPhone: "0912-000-001" },
    { name: "分站A", location: "裝備展示區入口", lat: 25.0431, lng: 121.5215, contactName: "張醫務士", contactPhone: "0912-000-002" },
    { name: "分站B", location: "停車場接駁站", lat: 25.0405, lng: 121.5226, contactName: "陳護理師", contactPhone: "0912-000-003" },
  ];
  const stations: repo.Station[] = [];
  for (const d of defs) {
    const id = await repo.createStation(
      { ...d, eventId, status: "OPEN", lastReportAt: new Date(now.getTime() - 5 * 60_000) },
      DEFAULT_SUPPLIES,
    );
    stations.push((await repo.getStation(id))!);
  }
  // 分站B 故意製造物資不足與久未回報，示範告警
  const icePack = (await repo.listSuppliesByStation(stations[2].id)).find((s) => s.name === "冰敷袋")!;
  await repo.updateSupply(icePack.id, { quantity: 4 });
  await repo.updateStation(stations[2].id, { lastReportAt: new Date(now.getTime() - 95 * 60_000) });

  const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);
  const cases = [
    { s: 0, m: 300, type: "PUBLIC", sex: "F", age: "SENIOR", triage: 3, cat: "HEAT", c: "頭暈、大量出汗", t: "陰涼處休息、冰敷、補充電解質", disp: "RELEASED", dep: 270 },
    { s: 0, m: 280, type: "PUBLIC", sex: "M", age: "CHILD", triage: 5, cat: "ABRASION", c: "跌倒膝蓋擦傷", t: "傷口清潔、OK繃", disp: "RELEASED", dep: 270 },
    { s: 1, m: 250, type: "PUBLIC", sex: "M", age: "ADULT", triage: 4, cat: "SPRAIN", c: "右腳踝扭傷", t: "冰敷、彈性繃帶固定", disp: "RELEASED", dep: 225 },
    { s: 0, m: 220, type: "MILITARY", sex: "M", age: "ADULT", triage: 2, cat: "HEAT", c: "意識模糊、體溫 39.8°C", t: "降溫、建立靜脈管路", disp: "TRANSFERRED", dep: 205, hospital: "國軍示範總醫院", amb: "軍救-01" },
    { s: 2, m: 200, type: "PUBLIC", sex: "F", age: "TEEN", triage: 5, cat: "INSECT", c: "手臂蚊蟲叮咬紅腫", t: "清潔、塗藥", disp: "RELEASED", dep: 195 },
    { s: 1, m: 180, type: "PUBLIC", sex: "F", age: "ADULT", triage: 4, cat: "DIZZY", c: "排隊久站頭暈", t: "休息、補充水分", disp: "RELEASED", dep: 160 },
    { s: 0, m: 150, type: "STAFF", sex: "M", age: "ADULT", triage: 4, cat: "CUT", c: "搬運器材手指割傷", t: "清潔包紮", disp: "RELEASED", dep: 140 },
    { s: 2, m: 120, type: "PUBLIC", sex: "M", age: "SENIOR", triage: 3, cat: "GI", c: "腹痛、噁心", t: "觀察、建議就醫", disp: "REFUSED", dep: 100 },
    { s: 1, m: 90, type: "PUBLIC", sex: "F", age: "CHILD", triage: 4, cat: "ALLERGY", c: "食用攤販食物後皮膚起疹", t: "觀察生命徵象", disp: "RELEASED", dep: 60 },
    { s: 0, m: 60, type: "PUBLIC", sex: "M", age: "ADULT", triage: 3, cat: "HEAT", c: "抽筋、口渴", t: "補充電解質、伸展", disp: "RELEASED", dep: 40 },
    { s: 0, m: 25, type: "PUBLIC", sex: "F", age: "SENIOR", triage: 2, cat: "DIZZY", c: "突發暈眩、血壓 180/110", t: "平躺、持續監測", disp: "OBSERVING" },
    { s: 1, m: 15, type: "PUBLIC", sex: "M", age: "TEEN", triage: 4, cat: "ABRASION", c: "滑倒手肘擦傷", t: "清潔包紮", disp: "OBSERVING" },
  ] as const;
  for (const c of cases) {
    await repo.createPatient({
      eventId,
      stationId: stations[c.s].id,
      arrivedAt: minsAgo(c.m),
      patientType: c.type,
      sex: c.sex,
      ageGroup: c.age,
      triage: c.triage,
      category: c.cat,
      complaint: c.c,
      treatment: c.t,
      disposition: c.disp,
      hospital: "hospital" in c ? c.hospital : "",
      ambulance: "amb" in c ? c.amb : "",
      departedAt: "dep" in c ? minsAgo(c.dep) : null,
      note: "",
      reporterName: defs[c.s].contactName,
    });
  }

  await repo.createRequest({ eventId, stationId: stations[1].id, type: "SUPPLY", content: "運動飲料 2 箱", urgent: false, reporterName: defs[1].contactName });
  const doneId = await repo.createRequest({ eventId, stationId: stations[0].id, type: "STAFF", content: "午後人潮多，需要 1 名人力支援", urgent: false, reporterName: defs[0].contactName });
  await repo.updateRequest(doneId, { status: "DONE", handlerName: "指揮官（示範）", response: "已調派預備組 1 人" });

  console.log("已建立示範資料。站點 QR 登入網址：");
  for (const s of stations) console.log(`  ${s.name}: /join/${s.joinToken}`);
  console.log("示範帳號：command / command1234（指揮中心）");
}

async function main() {
  await ensureAdmin();
  if (process.argv.includes("--demo")) await seedDemo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
