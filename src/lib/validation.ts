import { z } from "zod";
import {
  AGE_GROUPS,
  CATEGORIES,
  DISPOSITIONS,
  PATIENT_TYPES,
  REQUEST_STATUS,
  REQUEST_TYPES,
  SEXES,
  MEMBER_ROLES,
  MILITARY_RANKS,
  STATION_STATUS,
  ageGroupOf,
} from "./constants";
import { parseLocalInput } from "./time";

function values<T extends readonly { value: string }[]>(options: T) {
  return options.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];
}

const pick = <T extends readonly { value: string }[]>(options: T, message = "請選擇") =>
  z.enum(values(options), { error: message });

const text = (max: number) => z.string().trim().max(max, `最多 ${max} 字`).default("");
const required = (max: number, message = "必填") => z.string().trim().min(1, message).max(max, `最多 ${max} 字`);

const localDateTime = z.string().transform((v, ctx) => {
  const d = parseLocalInput(v);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "請填寫正確時間" });
    return z.NEVER;
  }
  return d;
});

const optionalLocalDateTime = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v || !v.trim()) return null;
    const d = parseLocalInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "請填寫正確時間" });
      return z.NEVER;
    }
    return d;
  });

const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number({ error: "請填數字" }).min(min, `需介於 ${min} ~ ${max}`).max(max, `需介於 ${min} ~ ${max}`).optional(),
  );

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const patientSchema = z
  .object({
    arrivedAt: localDateTime,
    patientType: pick(PATIENT_TYPES),
    rank: z.preprocess((v) => (v === "" ? undefined : v), z.enum(MILITARY_RANKS, { error: "請選擇階級" }).optional()),
    name: text(30),
    sex: pick(SEXES),
    age: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number({ error: "請填數字" }).int("請填整數").min(0, "需介於 0 ~ 120").max(120, "需介於 0 ~ 120").optional(),
    ),
    // 有填實際年齡時由年齡自動判斷，沒填才需要快速選擇
    ageGroup: pick(AGE_GROUPS).optional(),
    category: pick(CATEGORIES),
    complaint: text(500),
    treatment: text(500),
    disposition: pick(DISPOSITIONS),
    hospital: text(100),
    ambulance: text(50),
    departedAt: optionalLocalDateTime,
    note: text(500),
  })
  // when：其他欄位有錯時也照樣檢查，讓使用者一次看到所有缺漏
  .refine((v) => v.age !== undefined || !!v.ageGroup, {
    path: ["ageGroup"],
    message: "請輸入年齡或選擇年齡層",
    when: () => true,
  })
  .superRefine((v, ctx) => {
    if (v.disposition === "TRANSFERRED" && !v.hospital) {
      ctx.addIssue({ code: "custom", path: ["hospital"], message: "後送請填寫醫院" });
    }
    if (v.departedAt && v.departedAt < v.arrivedAt) {
      ctx.addIssue({ code: "custom", path: ["departedAt"], message: "離站時間不可早於到站時間" });
    }
  })
  .transform(({ age, ageGroup, rank, ...rest }) => ({
    ...rest,
    // 只有國軍官兵記錄階級
    rank: rest.patientType === "MILITARY" ? (rank ?? "") : "",
    age: age ?? null,
    ageGroup: age !== undefined ? ageGroupOf(age) : ageGroup!,
  }));

export type PatientInput = z.infer<typeof patientSchema>;

export const stationStatusSchema = z.object({ status: pick(STATION_STATUS) });

export const supplyCreateSchema = z.object({
  name: required(50, "請輸入品項名稱"),
  unit: text(10),
  quantity: z.coerce.number({ error: "請填數字" }).int().min(0, "不可小於 0").max(100000),
  threshold: z.coerce.number({ error: "請填數字" }).int().min(0, "不可小於 0").max(100000),
});

export const supplyQuantitySchema = z.object({
  id: z.string().min(1),
  quantity: z.coerce.number({ error: "請填數字" }).int().min(0, "不可小於 0").max(100000),
});

export const requestSchema = z.object({
  type: pick(REQUEST_TYPES),
  content: required(500, "請描述需求內容"),
  urgent: checkbox,
});

export const requestUpdateSchema = z.object({
  id: z.string().min(1),
  status: pick(REQUEST_STATUS),
  response: text(500),
});

export const eventSchema = z
  .object({
    name: required(100, "請輸入活動名稱"),
    venue: text(100),
    startDate: localDateTime,
    endDate: localDateTime,
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "結束日期不可早於開始日期" });

export const stationSchema = z.object({
  name: required(50, "請輸入站名"),
  location: text(100),
  lat: optionalNumber(-90, 90),
  lng: optionalNumber(-180, 180),
  contactName: text(30),
  contactPhone: text(30),
  status: pick(STATION_STATUS),
});

export const allowedUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "請輸入正確的 Email" })),
  role: pick(MEMBER_ROLES, "請選擇角色"),
  note: text(50),
});

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** 將 FormData 以 zod 驗證，失敗時回傳可直接給表單顯示的錯誤 */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { success: true; data: z.output<S> } | { success: false; state: ActionState } {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("$ACTION")) raw[k] = v;
  }
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_");
    fieldErrors[key] ??= issue.message;
  }
  return { success: false, state: { error: "請修正標示的欄位", fieldErrors } };
}
