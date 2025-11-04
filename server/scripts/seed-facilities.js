import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../data/app.db");

const db = await open({ filename: dbPath, driver: sqlite3.Database });

const rows = [
  // 例：あなたのフロントの座標に合わせて必要分追加
  [
    "coop-conveni-neyagawa",
    "生協コンビニ（寝屋川）",
    "shop",
    34.74311443,
    135.6592243,
  ],
];

for (const [id, name, type, lat, lng] of rows) {
  await db.run(
    `INSERT OR IGNORE INTO facilities (id,name,type,lat,lng) VALUES (?,?,?,?,?)`,
    id,
    name,
    type,
    lat,
    lng
  );
}
console.log("✅ seed OK");
await db.close();
