import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../data/app.db");

await fs.promises.mkdir(path.join(__dirname, "../data"), { recursive: true });
const db = await open({ filename: dbPath, driver: sqlite3.Database });

await db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL,
  lng REAL,
  type TEXT CHECK (type IN ('vending','shop','drink')) NOT NULL
);

CREATE TABLE IF NOT EXISTS facility_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id TEXT NOT NULL REFERENCES facilities(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  weekday_hours TEXT,
  saturday_hours TEXT,
  sunday_hol_hours TEXT,
  raw_html TEXT,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (facility_id, year, month)
);
`);

console.log("✅ migrate OK:", dbPath);
await db.close();
