// server/api.js
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// ---------------------------
// 基本セットアップ
// ---------------------------
const app = express();
app.use(cors());
app.use(express.json());

// 🔍 簡易ロガー（任意。不要なら消してOK）
app.use((req, res, next) => {
  const t0 = Date.now();
  console.log(`[IN] ${req.method} ${req.url}`);
  res.on("finish", () => {
    console.log(
      `[OUT] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - t0}ms)`
    );
  });
  next();
});

// 🌡️ ヘルスチェック（最上段）
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// DBファイルの場所
const DATA_DIR = path.resolve("./data");
const DB_FILE = path.join(DATA_DIR, "app.db");

// SQLite 接続（初回はテーブル作成もやる）
async function openDb() {
  // ./data が無いと SQLITE_CANTOPEN になるので事前作成
  await mkdir(DATA_DIR, { recursive: true });

  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });

  // 最低限のテーブル（スクレイパーが INSERT する想定）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS facility_hours (
      facility_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      hours TEXT,              -- "11:00-16:00" の単一時間帯（必要に応じて拡張）
      raw_html TEXT,
      PRIMARY KEY (facility_id, year, month)
    );
  `);

  return db;
}

// ---------------------------
// 営業中判定ユーティリティ
// ---------------------------
function isNowWithin(hoursStr, now = new Date()) {
  if (!hoursStr || hoursStr === "-") return false;

  const m = hoursStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return false;

  const [, sh, sm, eh, em] = m.map(Number);

  // JST 現在時刻（サーバがUTCでもOK）
  const jstNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const y = jstNow.getFullYear();
  const M = jstNow.getMonth();
  const d = jstNow.getDate();

  const start = new Date(y, M, d, sh, sm, 0);
  const end = new Date(y, M, d, eh, em, 0);

  return jstNow >= start && jstNow <= end;
}

// ---------------------------
// API ルート
// ---------------------------

/**
 * GET /api/open-check?facilityId=coop-fame3&year=2025&month=11
 * 返却: { facilityId, hours, isOpen, nowJST }
 */
app.get("/api/open-check", async (req, res) => {
  try {
    const facilityId = req.query.facilityId;
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!facilityId || !year || !month) {
      return res
        .status(400)
        .json({ error: "facilityId, year, month は必須です" });
    }

    const db = await openDb();
    const row = await db.get(
      `SELECT hours FROM facility_hours WHERE facility_id=? AND year=? AND month=?`,
      facilityId,
      year,
      month
    );

    if (!row) {
      return res.json({
        facilityId,
        hours: "-",
        isOpen: false,
        nowJST: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        note: "該当データがDBにありません（先にスクレイピングで保存してください）",
      });
    }

    const isOpen = isNowWithin(row.hours);
    return res.json({
      facilityId,
      hours: row.hours,
      isOpen,
      nowJST: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "open-check 失敗" });
  }
});

/**
 * （おまけ）月の一覧を返す
 * GET /api/hours/:year/:month
 */
app.get("/api/hours/:year/:month", async (req, res) => {
  try {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const db = await openDb();

    const rows = await db.all(
      `SELECT facility_id, year, month, hours FROM facility_hours WHERE year=? AND month=?`,
      year,
      month
    );

    return res.json({ year, month, items: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "hours 取得失敗" });
  }
});

// ---------------------------
// サーバ起動
// ---------------------------
const PORT = 3005;
app.listen(PORT, () => {
  console.log(`✅ API ready http://localhost:${PORT}`);
});
