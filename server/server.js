import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/coop-time", async (req, res) => {
  try {
    const url = "https://oecu.hanshin.coop/time/schedule_202511.html";
    console.log(`📡 取得先URL: ${url}`);

    const { data } = await axios.get(url);
    console.log("✅ HTML取得成功（先頭500文字）:");
    console.log(data.slice(0, 500)); // HTMLの先頭部分を確認

    const $ = cheerio.load(data);

    // 該当するセクションを確認
    const section = $("#s02");
    if (!section.length) {
      console.log("⚠ #s02 が見つかりませんでした");
      return res.status(404).json({ error: "#s02 が見つかりませんでした" });
    }

    const table = section.next("table");
    if (!table.length) {
      console.log("⚠ #s02 の次に <table> が見つかりませんでした");
      return res.status(404).json({ error: "table が見つかりませんでした" });
    }

    const text = table.text().replace(/\s+/g, " ").trim();
    console.log("📋 抽出したテキスト:", text.slice(0, 200));

    res.json({
      message: "スクレイピング成功",
      extracted: text.slice(0, 200),
    });
  } catch (err) {
    console.error("❌ スクレイピング失敗:", err.message);
    res.status(500).json({ error: "データ取得に失敗しました" });
  }
});

const PORT = 3001;
app.listen(PORT, () =>
  console.log(`🚀 サーバー起動中: http://localhost:${PORT}`)
);
