const iso = (d) => (d && !/[zZ]|[+-]\d\d:?\d\d$/.test(d) ? d + "Z" : d);

const when = (d) =>
  new Date(iso(d)).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }) + " IST";

export default async function handler(req, res) {
  const key = process.env.CRICAPI_KEY;
  const get = async (path) => {
    try {
      const r = await fetch(`https://api.cricapi.com/v1/${path}?apikey=${key}&offset=0`);
      const j = await r.json();
      return j.data || [];
    } catch (e) {
      return [];
    }
  };

  const [current, upcoming] = await Promise.all([get("currentMatches"), get("matches")]);

  const seen = new Set();
  const all = [];
  for (const m of [...current, ...upcoming]) {
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    if (!m.matchStarted && m.dateTimeGMT) m.status = when(m.dateTimeGMT);
    all.push(m);
  }

  const rank = (m) => (m.matchStarted && !m.matchEnded ? 0 : !m.matchStarted ? 1 : 2);
  const time = (m) => new Date(iso(m.dateTimeGMT)).getTime() || 0;
  all.sort((a, b) => rank(a) - rank(b) || time(a) - time(b));

  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");
  res.status(200).json({ data: all.slice(0, 20) });
}
