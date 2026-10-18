// 用法：
//   npm run db:seed        若沒有任何帳號，依 ADMIN_USERNAME / ADMIN_PASSWORD 建立管理員（正式環境用，可重複執行）
//   npm run db:seed:demo   另外建立示範場次、3 個救護站、示範傷患與申請（開發／教育訓練用）
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { DEFAULT_SUPPLIES } from "../src/lib/constants";

const db = new PrismaClient();
const token = () => randomBytes(18).toString("base64url");

async function ensureAdmin() {
  if ((await db.user.count()) > 0) return;
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password === "change-me") {
    throw new Error("資料庫沒有任何帳號，請設定 ADMIN_PASSWORD 環境變數以建立初始管理員");
  }
  await db.user.create({
    data: { username, displayName: "系統管理員", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`已建立管理員帳號：${username}`);
}

async function seedDemo() {
  if (await db.event.findFirst({ where: { name: { contains: "示範" } } })) {
    console.log("示範資料已存在，略過");
    return;
  }

  if (!(await db.user.findUnique({ where: { username: "command" } }))) {
    await db.user.create({
      data: { username: "command", displayName: "指揮官（示範）", role: "COMMAND", passwordHash: await bcrypt.hash("command1234", 10) },
    });
  }

  const now = new Date();
  const event = await db.event.create({
    data: {
      name: "2026 國防知性之旅（示範營區）",
      venue: "示範營區",
      startDate: new Date(now.getTime() - 6 * 3600_000),
      endDate: new Date(now.getTime() + 6 * 3600_000),
      isActive: true,
    },
  });
  await db.event.updateMany({ where: { id: { not: event.id } }, data: { isActive: false } });

  const defs = [
    { name: "主站", location: "司令台旁醫療帳篷", lat: 25.0418, lng: 121.5199, contactName: "李醫官", contactPhone: "0912-000-001" },
    { name: "分站A", location: "裝備展示區入口", lat: 25.0431, lng: 121.5215, contactName: "張醫務士", contactPhone: "0912-000-002" },
    { name: "分站B", location: "停車場接駁站", lat: 25.0405, lng: 121.5226, contactName: "陳護理師", contactPhone: "0912-000-003" },
  ];
  const stations = [];
  for (const d of defs) {
    stations.push(
      await db.station.create({
        data: {
          ...d,
          eventId: event.id,
          joinToken: token(),
          lastReportAt: new Date(now.getTime() - 5 * 60_000),
          supplies: { create: DEFAULT_SUPPLIES.map((s) => ({ ...s })) },
        },
      }),
    );
  }
  // 分站B 故意製造物資不足與久未回報，示範告警
  await db.supply.updateMany({ where: { stationId: stations[2].id, name: "冰敷袋" }, data: { quantity: 4 } });
  await db.station.update({ where: { id: stations[2].id }, data: { lastReportAt: new Date(now.getTime() - 95 * 60_000) } });

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
    await db.patient.create({
      data: {
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
        reporterName: defs[c.s].contactName,
      },
    });
  }

  await db.supportRequest.createMany({
    data: [
      { stationId: stations[1].id, type: "SUPPLY", content: "運動飲料 2 箱", urgent: false, status: "PENDING", reporterName: defs[1].contactName },
      { stationId: stations[0].id, type: "STAFF", content: "午後人潮多，需要 1 名人力支援", status: "DONE", reporterName: defs[0].contactName, handlerName: "指揮官（示範）", response: "已調派預備組 1 人" },
    ],
  });

  console.log("已建立示範資料。站點 QR 登入網址：");
  for (const s of stations) console.log(`  ${s.name}: /join/${s.joinToken}`);
  console.log("示範帳號：command / command1234（指揮中心）");
}

async function main() {
  await ensureAdmin();
  if (process.argv.includes("--demo")) await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
