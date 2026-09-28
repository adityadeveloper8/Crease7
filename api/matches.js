const iso = (d) => (d && !/[zZ]|[+-]\d\d:?\d\d$/.test(d) ? d + "Z" : d);
const ts = (m) => new Date(iso(m.dateTimeGMT)).getTime() || 0;
const when = (d) =>
  new Date(iso(d)).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }) + " IST";

const INDIA =
  /india|ranji|mumbai|delhi|karnataka|tamil nadu|kerala|punjab|haryana|bengal|gujarat|rajasthan|maharashtra|baroda|saurashtra|vidarbha|hyderabad|uttar pradesh|madhya pradesh|odisha|assam|jharkhand|railways|chennai|bengaluru|bangalore|kolkata|lucknow|super kings|indians|challengers|capitals|royals|sunrisers|titans|kings xi/i;

export default async function handler(req, res) {
  const key = process.env.CRICAPI_KEY;
  const get = async (path, offset) => {
    try {
      const r = await fetch(`https://api.cricapi.com/v1/${path}?apikey=${key}&offset=${offset}`);
      const j = await r.json();
      return j.data || [];
    } catch (e) {
      return [];
    }
  };

  const [current, ...pages] = await Promise.all([
    get("currentMatches", 0),
    ...[0, 25, 50, 75].map((o) => get("matches", o)),
  ]);

  const seen = new Set();
  const all = [];
  for (const m of [...current, ...pages.flat()]) {
    if (!m || !m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    const isIndia = (m.teams || []).some((t) => INDIA.test(t)) || /india/i.test(m.venue || "");
    m.region = isIndia ? "india" : "world";
    if (!m.matchStarted && m.dateTimeGMT) m.status = when(m.dateTimeGMT);
    all.push(m);
  }

  const live = all.filter((m) => m.matchStarted && !m.matchEnded);
  const soon = all.filter((m) => !m.matchStarted).sort((a, b) => ts(a) - ts(b));
  const pick = (list, r, n) => list.filter((m) => m.region === r).slice(0, n);
  const upcoming = [...pick(soon, "india", 15), ...pick(soon, "world", 15)].sort((a, b) => ts(a) - ts(b));
  const done = all.filter((m) => m.matchEnded).sort((a, b) => ts(b) - ts(a)).slice(0, 6);

  res.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate");
  res.status(200).json({ data: [...live, ...upcoming, ...done] });
}
