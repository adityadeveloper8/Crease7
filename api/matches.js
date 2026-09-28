export default async function handler(req, res) {
  try {
    const url = `https://api.cricapi.com/v1/currentMatches?apikey=${process.env.CRICAPI_KEY}&offset=0`;
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: "Could not load matches" });
  }
}
