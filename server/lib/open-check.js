function parseRange(range) {
  const m = range.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = +m[1] * 60 + +m[2];
  const end = +m[3] * 60 + +m[4];
  return [start, end];
}
export function isOpenNow(hours, now = new Date()) {
  // JSTで判定
  const jst = new Date(now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }));
  const wd = jst.getDay(); // 0=日
  const cur = jst.getHours() * 60 + jst.getMinutes();

  const sel =
    wd === 0 ? hours.sundayHol : wd === 6 ? hours.saturday : hours.weekday;
  if (!sel || sel === "-" || sel.includes("休")) return false;

  const r = parseRange(sel);
  if (!r) return false;
  const [start, end] = r;
  return cur >= start && cur <= end;
}
