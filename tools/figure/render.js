// node tools/figure/render.js <film> [shot] [out.pdf]
// Serves the site root, opens tools/figure/canvas_figure.html, prints the laid-out world to a PDF
// (vector text, embedded thumbnails) plus a PNG preview next to it.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const SITE = path.resolve(__dirname, "..", "..");
const [film = "martin", shot = "", out = path.join(__dirname, `canvas_${film}.pdf`)] = process.argv.slice(2);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".svg": "image/svg+xml", ".ttf": "font/ttf" };
const srv = http.createServer((req, res) => {
  const p = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(SITE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
srv.listen(0, "127.0.0.1", async () => {
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tools/figure/canvas_figure.html?film=${film}${shot ? `&shot=${shot}` : ""}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__READY, null, { timeout: 30000 });
  const { w, h } = await page.evaluate(() => window.__READY);
  await page.setViewportSize({ width: Math.ceil(w), height: Math.ceil(h) });
  await page.waitForTimeout(300);
  await page.pdf({ path: out, width: `${Math.ceil(w)}px`, height: `${Math.ceil(h)}px`, printBackground: true, pageRanges: "1", margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.screenshot({ path: out.replace(/\.pdf$/, ".png"), fullPage: true });
  console.log(JSON.stringify({ out, w, h, errors: errs }));
  await browser.close(); srv.close();
});
