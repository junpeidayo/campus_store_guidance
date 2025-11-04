/* eslint-env node */
import process from "node:process";
import axios from "axios";
import * as cheerio from "cheerio";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// ----------------------------------
// 共通ユーティリティ
// ----------------------------------
const TIME_RE = /\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/g;

function zenkakuToHankaku(s) {
  return String(s)
    .replace(/Ⅳ/g, "IV")
    .replace(/Ⅲ/g, "III")
    .replace(/Ⅱ/g, "II")
    .replace(/Ⅰ/g, "I")
    .replace(/[！-～]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
}

const normalize = (s) => zenkakuToHankaku(s).replace(/\s+/g, " ").trim();

// ----------------------------------
// ブロック抽出（マーレ／フェイム3両対応）
// ----------------------------------
function pickBlock($, keywordRaw) {
  const kw = normalize(keywordRaw);
  const fameRe = /(フェイム\s*3|Fame\s*III|Fame\s*Ⅲ)/i;
  const mareRe = /(マーレ|Mare)/i;

  const blocks = $("div.shopTable").filter((_, el) => {
    const h = normalize($(el).find("h3").text());
    return fameRe.test(h) || mareRe.test(h) || h.includes(kw);
  });

  return blocks.first();
}

function extractTimes($, $block) {
  if (!$block || !$block.length) return null;

  // ブロック自身から
  const text = normalize($block.text());
  const hits = text.match(TIME_RE);
  if (hits && hits.length) return hits;

  // 直後の数要素もスキャン（運営のHTML差異に耐性）
  const tail = normalize(
    $block
      .nextAll()
      .slice(0, 3)
      .map((_, el) => $(el).text())
      .get()
      .join(" ")
  );
  const more = tail.match(TIME_RE);
  return more || null;
}

// ----------------------------------
// 1か月分スクレイプ
// ----------------------------------
export async function scrapeOneMonth(
  year,
  month,
  { rowKeyword = "マーレ" } = {} // 既定：マーレ
) {
  const mm = String(month).padStart(2, "0");
  const url = `https://oecu.hanshin.coop/time/schedule_${year}${mm}.html`;

  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const $ = cheerio.load(data);

  const block = pickBlock($, rowKeyword);
  if (!block.length) {
    const heads = $("div.shopTable h3")
      .map((_, el) => normalize($(el).text()))
      .get();
    return { parsed: null, raw: data, debugHeads: heads };
  }

  const times = extractTimes($, block);
  const name = normalize(block.find("h3").first().text()) || rowKeyword;

  return {
    parsed: { name, hours: times ? times.join(" / ") : "-" },
    raw: data,
  };
}

// ----------------------------------
// CLI 実行: node tools/scrape-month.js 2025 11 coop-mare "マーレ"
// ----------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const year = Number(process.argv[2]);
  const month = Number(process.argv[3]);
  const facilityId = process.argv[4] || "coop-mare"; // 既定IDをマーレに
  const keyword = process.argv[5] || "マーレ";

  if (!year || !month) {
    console.error(
      "Usage: node tools/scrape-month.js <year> <month> [facilityId] [rowKeyword]"
    );
    process.exit(1);
  }

  const db = await open({
    filename: "./data/app.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS facility_hours (
      facility_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      hours TEXT,
      raw_html TEXT,
      PRIMARY KEY (facility_id, year, month)
    );
  `);

  const { parsed, raw, debugHeads } = await scrapeOneMonth(year, month, {
    rowKeyword: keyword,
  });

  if (!parsed) {
    console.log("⚠ 見出しが見つからず。候補:", debugHeads);
    process.exit(0);
  }

  await db.run(
    `INSERT INTO facility_hours (facility_id, year, month, hours, raw_html)
     VALUES (?,?,?,?,?)
     ON CONFLICT(facility_id,year,month) DO UPDATE SET
       hours=excluded.hours, raw_html=excluded.raw_html`,
    facilityId,
    year,
    month,
    parsed.hours,
    raw
  );

  console.log(`✅ saved: ${facilityId} ${year}-${month}:`, parsed);
  await db.close();
}
