import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// 在 Firebase App Hosting 上會自動取得專案與服務帳號憑證，不需要金鑰檔。
// 本機開發與測試使用 Firestore 模擬器：設定 FIRESTORE_EMULATOR_HOST 與 GCLOUD_PROJECT。
const globalForFirestore = globalThis as unknown as { firestore?: Firestore };

function create() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const app = getApps()[0] ?? initializeApp(projectId ? { projectId } : undefined);
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  const firestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
}

export const firestore = globalForFirestore.firestore ?? (globalForFirestore.firestore = create());
